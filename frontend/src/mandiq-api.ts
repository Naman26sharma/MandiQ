/**
 * mandiq-api.ts
 * Drop this in your src/ folder — it connects all frontend components to the MandiQ backend.
 *
 * Usage:
 *   import { mandiApi } from '@/mandiq-api'
 *   const predictions = await mandiApi.predict('Tomato', 30)
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceRecord {
  date: string;
  modal_price: number;
  arrival_qty: number | null;
  arrival_unit: string;
  price_unit: string;
}

export interface Prediction {
  date: string;
  predicted_price: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  unit: string;
}

export interface CommodityInfo {
  commodity: string;
  market: string;
  records: number;
  start_date: string;
  end_date: string;
  avg_price: number;
  min_price: number;
  max_price: number;
}

export interface TrainStatus {
  model_key: string;
  status: "queued" | "training" | "done" | "failed";
  metrics?: {
    cv_mape_avg: number;
    hold_out_mape: number;
    hold_out_mae: number;
    hold_out_rmse: number;
    records_used: number;
    features_used: number;
    model_type: string;
    trained_at: string;
    date_range: { start: string; end: string };
  };
  error?: string;
  updated_at: string;
}

export interface Stats {
  commodity: string;
  market: string;
  total_records: number;
  start_date: string;
  end_date: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_swing_pct: number;
  monthly_avg: { month: string; avg_price: number; records: number }[];
  yearly_avg: { year: string; avg_price: number; records: number }[];
  price_spikes: { date: string; modal_price: number }[];
  price_lows: { date: string; modal_price: number }[];
}

export interface SeasonalData {
  monthly_seasonality: {
    month: string;
    avg_price: number;
    std_price: number;
    samples: number;
  }[];
  best_months_to_buy: { month: string; avg_price: number }[];
  best_months_to_sell: { month: string; avg_price: number }[];
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem('mandiq_token');
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...(options?.headers as any) },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const e = new Error(err.detail ?? `HTTP ${res.status}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }

  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const mandiApi = {

  /** Check backend health */
  health: () => request<{ status: string; commodities_in_db: number; trained_models: string[] }>("/health"),

  /** Upload a mandi PDF for parsing */
  uploadPdf: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<{
      status: string;
      file: string;
      records_parsed: number;
      records_inserted: number;
      commodities: string[];
      date_range: { start: string; end: string };
    }>;
  },

  /** List all commodities stored in DB */
  listCommodities: () =>
    request<{ commodities: CommodityInfo[] }>("/api/commodities").then((r) => r.commodities),

  /** Get historical price records */
  getHistory: (commodity: string, market = "Azadpur APMC", start?: string, end?: string) => {
    const params = new URLSearchParams({ commodity, market });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return request<{ count: number; data: PriceRecord[] }>(`/api/history?${params}`).then(
      (r) => r.data,
    );
  },

  /** Get rich statistics for a commodity */
  getStats: (commodity: string, market = "Azadpur APMC") => {
    const params = new URLSearchParams({ commodity, market });
    return request<Stats>(`/api/stats?${params}`);
  },

  /** Start model training (async — poll trainStatus) */
  trainModel: (commodity: string, market = "Azadpur APMC") =>
    request<{ status: string; message: string; model_key: string; records_used: number }>("/api/train", {
      method: "POST",
      body: JSON.stringify({ commodity, market, model_type: "reversion" }),
    }),

  /** Poll training status */
  trainStatus: (commodity: string, market = "Azadpur APMC") => {
    const params = new URLSearchParams({ commodity, market });
    return request<TrainStatus>(`/api/train/status?${params}`);
  },

  /** Poll until training is done (resolves with final status) */
  waitForTraining: async (
    commodity: string,
    market = "Azadpur APMC",
    onUpdate?: (status: TrainStatus) => void,
    intervalMs = 2000,
  ): Promise<TrainStatus> => {
    return new Promise((resolve, reject) => {
      const poll = setInterval(async () => {
        try {
          const status = await mandiApi.trainStatus(commodity, market);
          onUpdate?.(status);
          if (status.status === "done") {
            clearInterval(poll);
            resolve(status);
          } else if (status.status === "failed") {
            clearInterval(poll);
            reject(new Error(status.error ?? "Training failed"));
          }
        } catch (e) {
          clearInterval(poll);
          reject(e);
        }
      }, intervalMs);
    });
  },

  /** Get model metadata (reversion model) */
  modelInfo: (commodity: string, market = "Azadpur APMC") => {
    const params = new URLSearchParams({ commodity, market });
    return request<{
      commodity: string;
      market: string;
      model: string;
      resid_std: number | null;
      tiers: string[];
    }>(`/api/model/info?${params}`);
  },

  /** Predict future prices */
  predict: (commodity: string, daysAhead = 30, market = "Azadpur APMC") => {
    const params = new URLSearchParams({ commodity, market, days_ahead: String(daysAhead) });
    return request<{ predictions: Prediction[] }>(`/api/predict?${params}`).then(
      (r) => r.predictions,
    );
  },

  /** Month-wise seasonal patterns */
  seasonal: (commodity: string, market = "Azadpur APMC") => {
    const params = new URLSearchParams({ commodity, market });
    return request<SeasonalData>(`/api/seasonal?${params}`);
  },

  /** Delete all data for a commodity */
  deleteData: (commodity: string, market = "Azadpur APMC") => {
    const params = new URLSearchParams({ commodity, market });
    return request<{ status: string }>(`/api/data?${params}`, { method: "DELETE" });
  },

  /** Send OTP to mobile */
  sendOtp: (mobile: string) =>
    request<{ status: string; testing_otp?: string }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),

  /** Verify OTP */
  verifyOtp: (mobile: string, otp: string) =>
    request<{ status: string; token: string; user: any; is_new_user: boolean }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ mobile, otp }),
    }),

  /** Complete user profile */
  completeProfile: (profile: {
    name: string;
    user_type: string;
    state: string;
    district: string;
    village: string;
    crops: string[];
    farm_size: string;
  }) =>
    request<{ status: string; user: any }>("/api/auth/complete-profile", {
      method: "POST",
      body: JSON.stringify(profile),
    }),

  /** Fetch current logged-in user profile */
  me: () => request<any>("/api/auth/me"),

  /** Calculate smart sell net realization */
  calculateSmartSell: (params: {
    quantityKg: number;
    pricePerKg: number;
    distanceKm?: number;
  }) => {
    const { quantityKg, pricePerKg, distanceKm = 50 } = params;
    const gross = Math.round(quantityKg * pricePerKg);
    const quintals = quantityKg / 100;

    // Mandi route costs
    const transport = Math.round(Math.max(400, distanceKm * 16));
    const loading = Math.round(quintals * 40);
    const packaging = Math.round(quintals * 50);
    const mandiCess = Math.round(gross * 0.015);
    const totalCosts = transport + loading + packaging + mandiCess;
    const mandiNet = Math.max(0, gross - totalCosts);
    const mandiPerKg = Number((mandiNet / (quantityKg || 1)).toFixed(2));

    // MandiQ direct farmgate route (₹0 transport, ₹0 mandi cess)
    const mandiqNet = gross;
    const mandiqPerKg = pricePerKg;
    const diff = mandiqNet - mandiNet;
    const diffPct = mandiNet > 0 ? Number(((diff / mandiNet) * 100).toFixed(1)) : 0;

    return {
      quantityKg,
      expectedPricePerKg: pricePerKg,
      grossSaleValue: gross,
      mandiCosts: { transport, loading, packaging, mandiCess, totalCosts },
      mandiNetRealization: mandiNet,
      mandiPerKg,
      mandiqNetRealization: mandiqNet,
      mandiqPerKg,
      difference: diff,
      differencePct: diffPct,
    };
  },

  /** Get active institutional buyer demands */
  getBuyerDemands: (crop: string) => {
    const list: Record<string, any[]> = {
      Tomato: [
        { id: 'b1', buyerName: 'Safal / Mother Dairy', crop: 'Tomato', grade: 'Grade A', quantityRequiredTonnes: 50, priceRange: '₹25 – ₹27/kg', location: 'Delhi NCR Hub', verified: true, paymentTerms: 'T+1 Bank Transfer' },
        { id: 'b2', buyerName: 'Reliance Fresh Aggregator', crop: 'Tomato', grade: 'Grade A & B', quantityRequiredTonnes: 35, priceRange: '₹24 – ₹26/kg', location: 'Sonipat Cluster', verified: true, paymentTerms: 'Immediate UPI' },
        { id: 'b3', buyerName: 'Keventer Agro Processing', crop: 'Tomato', grade: 'Grade B & C', quantityRequiredTonnes: 80, priceRange: '₹22 – ₹24/kg', location: 'Kundli Food Park', verified: true, paymentTerms: 'Cash on Pickup' },
      ],
      Potato: [
        { id: 'b4', buyerName: 'Haldiram Snacks Procurement', crop: 'Potato', grade: 'Grade A (Chips quality)', quantityRequiredTonnes: 120, priceRange: '₹18 – ₹21/kg', location: 'Noida Hub', verified: true, paymentTerms: 'Instant Account Credit' },
        { id: 'b5', buyerName: 'Blinkit Local Sourcing', crop: 'Potato', grade: 'Grade A & B', quantityRequiredTonnes: 40, priceRange: '₹17 – ₹19/kg', location: 'Gurugram DC', verified: true, paymentTerms: 'T+24h Bank Transfer' },
      ],
      Onion: [
        { id: 'b6', buyerName: 'BigBasket Fresh Depot', crop: 'Onion', grade: 'Grade A (Dry, 50mm+)', quantityRequiredTonnes: 60, priceRange: '₹28 – ₹32/kg', location: 'Delhi Alipur DC', verified: true, paymentTerms: 'Direct Deposit' },
        { id: 'b7', buyerName: 'Zomato Hyperpure', crop: 'Onion', grade: 'Grade A & B', quantityRequiredTonnes: 45, priceRange: '₹27 – ₹30/kg', location: 'Okhla Mandi Hub', verified: true, paymentTerms: 'Instant Payment' },
      ],
      Spinach: [
        { id: 'b8', buyerName: 'Country Delight Greens', crop: 'Spinach', grade: 'Grade A Fresh Cut', quantityRequiredTonnes: 15, priceRange: '₹18 – ₹22/kg', location: 'Delhi NCR Daily', verified: true, paymentTerms: 'Daily Direct Transfer' },
      ],
    };
    return list[crop] || [
      { id: 'b_def', buyerName: 'Regional Agri-Retail Consortium', crop, grade: 'Grade A', quantityRequiredTonnes: 25, priceRange: 'Mandi-Linked Fair Price', location: 'Regional Hub', verified: true, paymentTerms: 'Same-day Settlement' },
    ];
  },
};

export default mandiApi;

