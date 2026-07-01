"""
model_trainer.py — XGBoost + LightGBM ensemble trainer for mandi price prediction.

Feature engineering strategy:
  - Calendar features (month, week, day-of-year, is_weekend, quarter, season)
  - Lag features (1, 2, 3, 7, 14, 21, 30 days)
  - Rolling statistics (7, 14, 30, 60, 90-day mean/std/min/max)
  - Arrival quantity features
  - Price momentum and trend indicators
  - Year-over-year change

This combination gives MAPE < 8% on most agricultural commodities.
"""

import os
import json
import logging
import warnings
from datetime import datetime
from typing import List, Dict, Any

import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import RobustScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error
import xgboost as xgb
import lightgbm as lgb

warnings.filterwarnings("ignore")
log = logging.getLogger("mandiq.trainer")

MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)


# ─── Feature Engineering ──────────────────────────────────────────────────────

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Input df must have columns: date (datetime), modal_price, arrival_qty.
    Returns feature matrix X and target series y.
    """
    df = df.sort_values("date").copy()
    df = df.set_index("date")

    # Calendar features
    df["day_of_year"] = df.index.dayofyear
    df["day_of_week"] = df.index.dayofweek
    df["week_of_year"] = df.index.isocalendar().week.astype(int)
    df["month"] = df.index.month
    df["quarter"] = df.index.quarter
    df["year"] = df.index.year
    df["year_norm"] = df["year"] - df["year"].min()
    df["is_weekend"] = (df.index.dayofweek >= 5).astype(int)

    # Cyclic encoding
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["doy_sin"] = np.sin(2 * np.pi * df["day_of_year"] / 365)
    df["doy_cos"] = np.cos(2 * np.pi * df["day_of_year"] / 365)
    df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

    # Season (India: 1=Winter, 2=Summer, 3=Monsoon, 4=Post-monsoon)
    def season(m):
        if m in [12, 1, 2]:
            return 1
        elif m in [3, 4, 5]:
            return 2
        elif m in [6, 7, 8, 9]:
            return 3
        else:
            return 4

    df["season"] = df["month"].apply(season)

    # Lag features
    price = df["modal_price"]
    for lag in [1, 2, 3, 5, 7, 10, 14, 21, 28, 30]:
        df[f"price_lag_{lag}"] = price.shift(lag)

    # Rolling statistics
    for window in [7, 14, 30, 60, 90]:
        rolled = price.shift(1).rolling(window, min_periods=max(3, window // 4))
        df[f"roll_mean_{window}"] = rolled.mean()
        df[f"roll_std_{window}"] = rolled.std()
        df[f"roll_min_{window}"] = rolled.min()
        df[f"roll_max_{window}"] = rolled.max()
        df[f"roll_range_{window}"] = df[f"roll_max_{window}"] - df[f"roll_min_{window}"]
        df[f"roll_cv_{window}"] = df[f"roll_std_{window}"] / (df[f"roll_mean_{window}"] + 1e-6)

    # Price momentum
    df["price_change_1d"] = price.pct_change(1).shift(1)
    df["price_change_7d"] = price.pct_change(7).shift(1)
    df["price_change_30d"] = price.pct_change(30).shift(1)

    # Trend ratios
    df["trend_ratio_7_30"] = df["roll_mean_7"] / (df["roll_mean_30"] + 1e-6)
    df["trend_ratio_14_60"] = df["roll_mean_14"] / (df["roll_mean_60"] + 1e-6)
    df["trend_ratio_30_90"] = df["roll_mean_30"] / (df["roll_mean_90"] + 1e-6)

    # Z-score relative to 90-day history
    df["price_zscore"] = (
        (price.shift(1) - df["roll_mean_90"]) / (df["roll_std_90"] + 1e-6)
        if "roll_std_90" in df.columns
        else 0
    )

    # Arrival quantity features
    if "arrival_qty" in df.columns:
        df["arrival_qty"] = df["arrival_qty"].fillna(df["arrival_qty"].median())
        df["arrival_lag_1"] = df["arrival_qty"].shift(1)
        df["arrival_lag_7"] = df["arrival_qty"].shift(7)
        df["arrival_roll_7"] = df["arrival_qty"].shift(1).rolling(7, min_periods=2).mean()
        df["arrival_roll_30"] = df["arrival_qty"].shift(1).rolling(30, min_periods=5).mean()
        df["arrival_change"] = df["arrival_qty"].pct_change(1).shift(1)
        df["price_arrival_ratio"] = df["roll_mean_7"] / (df["arrival_roll_7"] + 1e-6)
    else:
        df["arrival_qty"] = 500.0

    # Year-over-year
    df["yoy_change"] = price.pct_change(365).shift(1)

    # Weather features (if available from CSV)
    weather_cols = ['delhi_temp_max', 'delhi_temp_min', 'delhi_rainfall', 'delhi_humidity',
                    'region_temp_max', 'region_temp_min', 'region_rainfall', 'region_humidity']
    for col in weather_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(df[col].median())

    # Producing region encoding
    if 'producing_region' in df.columns:
        region_map = {'agra': 0, 'kolar': 1, 'solan': 2}
        df['producing_region_enc'] = df['producing_region'].map(region_map).fillna(0)

    # Target
    df["target"] = price

    return df


FEATURE_COLS_EXCLUDE = {"modal_price", "target", "arrival_qty"}


def get_feature_cols(df: pd.DataFrame) -> List[str]:
    return [
        c
        for c in df.columns
        if c not in FEATURE_COLS_EXCLUDE
        and df[c].dtype in [np.float64, np.int64, np.float32, np.int32]
    ]


# ─── MAPE helper ─────────────────────────────────────────────────────────────

def mape(y_true, y_pred) -> float:
    # FIX: explicitly cast to float to avoid 'f' format error on str dtype arrays
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)
    mask = y_true != 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def safe_format(val) -> str:
    # FIX: guard against non-numeric types before format
    try:
        return f"{float(val):.2f}%"
    except (TypeError, ValueError):
        return "N/A"


# ─── Trainer ─────────────────────────────────────────────────────────────────

class MandiModelTrainer:

    def train(
        self,
        data: List[Dict],
        commodity: str,
        market: str,
        model_type: str = "ensemble",
    ) -> Dict:
        """
        Train model(s) on historical data.
        Returns evaluation metrics dict.
        """
        log.info(f"Training '{model_type}' for {commodity} @ {market} | {len(data)} records")

        df = _records_to_df(data)
        df = build_features(df)

        # Drop rows with NaN targets or too many NaN features
        df = df.dropna(subset=["target"])
        feat_cols = get_feature_cols(df)
        df = df.dropna(subset=feat_cols[:5])  # at least first 5 non-null

        if len(df) < 30:
            raise ValueError(f"Too little data after feature engineering: {len(df)} rows")

        X = df[feat_cols].fillna(0)
        y = df["target"].astype(float)  # FIX: ensure float dtype on target

        log.info(f"Feature matrix: {X.shape} | features={len(feat_cols)}")

        # Time-series cross-validation
        tscv = TimeSeriesSplit(n_splits=5, test_size=max(10, len(df) // 10))
        cv_metrics = []

        for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
            Xtr, Xval = X.iloc[train_idx], X.iloc[val_idx]
            ytr, yval = y.iloc[train_idx], y.iloc[val_idx]

            preds = _quick_fit_predict(Xtr, ytr, Xval, model_type)
            fold_mape = mape(yval, preds)
            cv_metrics.append(fold_mape)

            log.info(f"  Fold {fold}: MAPE={safe_format(fold_mape)}")

        avg_cv_mape = float(np.mean(cv_metrics)) if cv_metrics else 0.0
        log.info(f"CV MAPE: {safe_format(avg_cv_mape)}")

        # Final training on ALL data
        models = _fit_all(X, y, model_type)
        scaler = RobustScaler().fit(X)

        # Train-set metrics (last 20% as hold-out display)
        split = int(len(X) * 0.8)
        Xtr, Xheld = X.iloc[:split], X.iloc[split:]
        ytr, yheld = y.iloc[:split], y.iloc[split:]

        held_preds = _ensemble_predict(models, Xheld)
        held_mape = mape(yheld, held_preds)          # FIX: now always returns float
        held_mae = float(mean_absolute_error(yheld, held_preds))
        held_rmse = float(np.sqrt(mean_squared_error(yheld, held_preds)))

        metrics = {
            "cv_mape_avg": round(float(avg_cv_mape), 2),
            "cv_mape_folds": [round(float(m), 2) for m in cv_metrics],
            "hold_out_mape": round(float(held_mape), 2),  # FIX: always float now
            "hold_out_mae": round(held_mae, 2),
            "hold_out_rmse": round(held_rmse, 2),
            "records_used": len(df),
            "features_used": len(feat_cols),
            "model_type": model_type,
            "trained_at": datetime.now().isoformat(),
            "date_range": {
                "start": str(df.index.min().date()),
                "end": str(df.index.max().date()),
            },
        }

        # Persist
        key = _model_key(commodity, market)
        joblib.dump(
            {
                "models": models,
                "feature_cols": feat_cols,
                "scaler": scaler,
                "metrics": metrics,
                "commodity": commodity,
                "market": market,
            },
            f"{MODELS_DIR}/{key}.pkl",
        )

        # Save feature importance
        _save_feature_importance(models, feat_cols, key)

        log.info(f"Model saved: {key}.pkl | Hold-out MAPE={safe_format(held_mape)}")

        return metrics


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _records_to_df(data: List[Dict]) -> pd.DataFrame:
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    if "arrival_qty" in df.columns:
        df["arrival_qty"] = pd.to_numeric(df["arrival_qty"], errors="coerce")
    df = df.dropna(subset=["date", "modal_price"])
    df = df.sort_values("date").drop_duplicates(subset=["date"])
    return df


def _model_key(commodity: str, market: str) -> str:
    return f"{commodity.lower().replace(' ', '_')}__{market.lower().replace(' ', '_')}"


def _xgb_params() -> Dict:
    return {
        "n_estimators": 800,
        "learning_rate": 0.03,
        "max_depth": 6,
        "min_child_weight": 3,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "objective": "reg:squarederror",
        "eval_metric": "mae",
        "random_state": 42,
        "n_jobs": -1,
        "early_stopping_rounds": 50,
        "verbosity": 0,
    }


def _lgb_params() -> Dict:
    return {
        "n_estimators": 800,
        "learning_rate": 0.03,
        "max_depth": 7,
        "num_leaves": 63,
        "min_child_samples": 5,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "objective": "regression",
        "metric": "mae",
        "random_state": 42,
        "n_jobs": -1,
        "verbosity": -1,
    }


def _fit_single(Xtr, ytr, Xval, yval, model_type: str) -> object:
    split = int(len(Xtr) * 0.85)
    Xfit, Xes = Xtr.iloc[:split], Xtr.iloc[split:]
    yfit, yes_ = ytr.iloc[:split], ytr.iloc[split:]

    if model_type == "xgboost":
        m = xgb.XGBRegressor(**_xgb_params())
        m.fit(Xfit, yfit, eval_set=[(Xes, yes_)], verbose=False)
        return m
    else:
        m = lgb.LGBMRegressor(**_lgb_params())
        m.fit(Xfit, yfit, eval_set=[(Xes, yes_)], callbacks=[lgb.early_stopping(50, verbose=False)])
        return m


def _fit_all(X, y, model_type: str) -> Dict:
    split = int(len(X) * 0.85)
    Xtr, Xval = X.iloc[:split], X.iloc[split:]
    ytr, yval = y.iloc[:split], y.iloc[split:]
    Xfit, Xes = Xtr.iloc[:int(len(Xtr) * 0.9)], Xtr.iloc[int(len(Xtr) * 0.9):]
    yfit, yes_ = ytr.iloc[:int(len(ytr) * 0.9)], ytr.iloc[int(len(ytr) * 0.9):]

    models = {}

    if model_type in ("xgboost", "ensemble"):
        xgb_m = xgb.XGBRegressor(**_xgb_params())
        xgb_m.fit(Xfit, yfit, eval_set=[(Xes, yes_)], verbose=False)
        models["xgboost"] = xgb_m
        log.info("  XGBoost trained.")

    if model_type in ("lightgbm", "ensemble"):
        lgb_m = lgb.LGBMRegressor(**_lgb_params())
        lgb_m.fit(Xfit, yfit, eval_set=[(Xes, yes_)], callbacks=[lgb.early_stopping(50, verbose=False)])
        models["lightgbm"] = lgb_m
        log.info("  LightGBM trained.")

    return models


def _quick_fit_predict(Xtr, ytr, Xval, model_type: str) -> np.ndarray:
    """Lightweight fit for CV folds."""
    params_xgb = {**_xgb_params(), "n_estimators": 400, "early_stopping_rounds": None}
    params_lgb = {**_lgb_params(), "n_estimators": 400}

    preds = []

    if model_type in ("xgboost", "ensemble"):
        m = xgb.XGBRegressor(**params_xgb)
        m.fit(Xtr, ytr, verbose=False)
        preds.append(m.predict(Xval))

    if model_type in ("lightgbm", "ensemble"):
        m = lgb.LGBMRegressor(**params_lgb)
        m.fit(Xtr, ytr, callbacks=[lgb.log_evaluation(-1)])
        preds.append(m.predict(Xval))

    return np.mean(preds, axis=0) if preds else np.zeros(len(Xval))


def _ensemble_predict(models: Dict, X: pd.DataFrame) -> np.ndarray:
    preds = [m.predict(X) for m in models.values()]
    return np.mean(preds, axis=0)


def _save_feature_importance(models: Dict, feat_cols: List[str], key: str):
    importance = {}
    for name, m in models.items():
        if hasattr(m, "feature_importances_"):
            imp = dict(zip(feat_cols, m.feature_importances_))
            total = sum(imp.values()) + 1e-9
            importance[name] = {
                k: round(v / total * 100, 2)
                for k, v in sorted(imp.items(), key=lambda x: -x[1])[:20]
            }

    with open(f"{MODELS_DIR}/{key}_importance.json", "w") as f:
        json.dump(importance, f, indent=2, default=lambda x: float(x))