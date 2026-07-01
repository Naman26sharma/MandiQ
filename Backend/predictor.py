"""
predictor.py — Multi-step recursive forecasting for mandi prices.

Strategy:
  1. Load trained model from disk
  2. Build full feature vector from last ~90 days of history
  3. Predict day t+1 by appending prediction to history and re-featurising
  4. Repeat for days_ahead steps (recursive forecast)
  5. Compute confidence intervals via prediction spread across models
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from model_trainer import build_features, get_feature_cols, _records_to_df, _model_key, MODELS_DIR

log = logging.getLogger("mandiq.predictor")


class MandiPredictor:

    def __init__(self):
        self._cache: Dict[str, Any] = {}    # in-memory model cache

    # ─── Load / unload ────────────────────────────────────────────────────────
    def load_model(self, commodity: str, market: str):
        key = _model_key(commodity, market)
        path = f"{MODELS_DIR}/{key}.pkl"
        if not os.path.exists(path):
            log.warning(f"Model not found: {path}")
            return
        self._cache[key] = joblib.load(path)
        log.info(f"Loaded model: {key}")

    def is_trained(self, commodity: str, market: str) -> bool:
        key = _model_key(commodity, market)
        if key in self._cache:
            return True
        path = f"{MODELS_DIR}/{key}.pkl"
        if os.path.exists(path):
            self.load_model(commodity, market)
            return True
        return False

    def list_trained_models(self) -> List[str]:
        return [
            f.replace(".pkl", "")
            for f in os.listdir(MODELS_DIR)
            if f.endswith(".pkl")
        ]

    def get_model_info(self, commodity: str, market: str) -> Optional[Dict]:
        key = _model_key(commodity, market)
        if not self.is_trained(commodity, market):
            return None
        bundle = self._cache[key]
        info = {
            "commodity":    bundle.get("commodity"),
            "market":       bundle.get("market"),
            "metrics":      bundle.get("metrics", {}),
            "feature_count": len(bundle.get("feature_cols", [])),
            "models":       list(bundle.get("models", {}).keys()),
        }
        # Feature importance
        imp_path = f"{MODELS_DIR}/{key}_importance.json"
        if os.path.exists(imp_path):
            with open(imp_path) as f:
                info["feature_importance"] = json.load(f)
        return info

    # ─── Core prediction ──────────────────────────────────────────────────────
    def predict(
        self,
        commodity: str,
        market: str,
        historical_data: List[Dict],
        days_ahead: int = 30,
    ) -> List[Dict]:
        """
        Return list of daily predictions:
        [{date, predicted_price, lower_bound, upper_bound, confidence}, ...]
        """
        key = _model_key(commodity, market)
        bundle = self._cache[key]
        models     = bundle["models"]
        feat_cols  = bundle["feature_cols"]

        # Build history dataframe
        hist_df = _records_to_df(historical_data)

        # Start from the last known date
        last_date = hist_df["date"].max()
        predictions = []

        # We'll extend hist_df recursively
        working_df = hist_df.copy()

        for step in range(1, days_ahead + 1):
            next_date = last_date + timedelta(days=step)

            # Add a placeholder row for next_date
            new_row = pd.DataFrame([{
                "date":        next_date,
                "modal_price": np.nan,       # will be filled
                "arrival_qty": working_df["arrival_qty"].tail(7).mean() if "arrival_qty" in working_df.columns else 500.0,
            }])
            extended = pd.concat([working_df, new_row], ignore_index=True)

            # Build features on extended df
            feat_df = build_features(extended.copy())
            feat_df = feat_df.fillna(0)

            # Get feature row for the last date (our target)
            if next_date not in feat_df.index:
                log.warning(f"Date {next_date} not found in feature index, skipping")
                continue

            row = feat_df.loc[next_date:next_date]

            # Make sure all expected cols exist
            for c in feat_cols:
                if c not in row.columns:
                    row[c] = 0.0

            X_pred = row[feat_cols].fillna(0)

            # Predict with each model
            preds_per_model = []
            for name, model in models.items():
                try:
                    p = model.predict(X_pred)[0]
                    preds_per_model.append(max(0, p))
                except Exception as e:
                    log.warning(f"Model {name} prediction failed: {e}")

            if not preds_per_model:
                break

            predicted = float(np.mean(preds_per_model))
            spread    = float(np.std(preds_per_model)) if len(preds_per_model) > 1 else predicted * 0.05

            # Confidence interval (± 1.5 std, min 5%)
            ci_width = max(spread * 1.5, predicted * 0.05)
            lower    = max(0, predicted - ci_width)
            upper    = predicted + ci_width

            # Confidence % (higher spread = lower confidence)
            rel_spread = spread / (predicted + 1e-6)
            confidence = round(max(50, 100 - rel_spread * 300), 1)

            predictions.append({
                "date":            next_date.strftime("%Y-%m-%d"),
                "predicted_price": round(predicted, 2),
                "lower_bound":     round(lower, 2),
                "upper_bound":     round(upper, 2),
                "confidence":      confidence,
                "unit":            "Rs./Quintal",
            })

            # Add predicted price back into working history for next step
            working_df = pd.concat([
                working_df,
                pd.DataFrame([{
                    "date":        next_date,
                    "modal_price": predicted,
                    "arrival_qty": new_row["arrival_qty"].values[0],
                }])
            ], ignore_index=True)

        return predictions


# ─── Seasonal analysis helper ─────────────────────────────────────────────────
def compute_seasonal(data: List[Dict]) -> Dict:
    df = _records_to_df(data)
    df["month"] = df["date"].dt.month
    df["month_name"] = df["date"].dt.strftime("%b")

    monthly = (
        df.groupby(["month", "month_name"])["modal_price"]
        .agg(avg_price="mean", std_price="std", count="count")
        .reset_index()
        .sort_values("month")
    )

    # Best months to buy (lowest prices) and sell (highest prices)
    best_to_buy  = monthly.nsmallest(3, "avg_price")[["month_name", "avg_price"]].to_dict("records")
    best_to_sell = monthly.nlargest(3, "avg_price")[["month_name", "avg_price"]].to_dict("records")

    return {
        "monthly_seasonality": [
            {
                "month":     row["month_name"],
                "avg_price": round(row["avg_price"], 2),
                "std_price": round(row["std_price"] if not pd.isna(row["std_price"]) else 0, 2),
                "samples":   int(row["count"]),
            }
            for _, row in monthly.iterrows()
        ],
        "best_months_to_buy":  [
            {"month": r["month_name"], "avg_price": round(r["avg_price"], 2)} for r in best_to_buy
        ],
        "best_months_to_sell": [
            {"month": r["month_name"], "avg_price": round(r["avg_price"], 2)} for r in best_to_sell
        ],
    }
