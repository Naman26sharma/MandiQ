import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, CheckCircle2, TrendingUp,
  Truck, ShieldCheck, Calendar, Building2,
  X, ChevronRight, Scale, History, Save, ChevronDown, ChevronUp, Check, BadgePercent
} from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { CropIcon, MandiIcon } from '../components/CropIcons';
import { useT, cropName } from '../../i18n';
import { mandiApi, type Prediction } from '../../mandiq-api';
import { MANDI_MAP, cropsForState, defaultMarketForState, getSelectedState, marketsForState } from '../config/mandis';
import { predictionJitter } from '../utils/predictionJitter';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const QUALITY_MODIFIERS: Record<string, { multiplier: number; label: string; desc: string }> = {
  'A': { multiplier: 1.00, label: 'Grade A', desc: 'उत्तम / एकसमान' },
  'B': { multiplier: 0.92, label: 'Grade B', desc: 'सामान्य बाज़ार' },
  'C': { multiplier: 0.82, label: 'Grade C', desc: 'मिश्रित माल' },
};

interface CropLogEntry {
  id: string;
  crop: string;
  quantityKg: number;
  grade: string;
  market: string;
  date: string;
  gross: number;
  mandiCost: number;
  mandiNet: number;
  mandiqNet: number;
  savings: number;
}

export function SmartSellScreen() {
  const navigate = useNavigate();
  const { t, lang } = useT();

  // App-wide state & mandi configuration
  const state = getSelectedState();
  const MARKETS = marketsForState(state);
  const CROPS = cropsForState(state);

  // Selected crop & market
  const [crop, setCrop] = useState(() => {
    const saved = localStorage.getItem('selectedCrop');
    return saved && CROPS.some(c => c.name === saved) ? saved : CROPS[0].name;
  });

  const [market, setMarket] = useState(() => defaultMarketForState(state));

  // Input states
  const [quantityKg, setQuantityKg] = useState<number>(1000);
  const [unit, setUnit] = useState<'kg' | 'quintal'>('kg');
  const [harvestWindow, setHarvestWindow] = useState<'today' | '3days' | 'week'>('today');
  const [qualityGrade, setQualityGrade] = useState<'A' | 'B' | 'C'>('A');

  // Price & Forecast data
  const [loading, setLoading] = useState(true);
  const [basePrice, setBasePrice] = useState<number>(25); // per kg
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  // Farmer's recorded history state
  const [records, setRecords] = useState<CropLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('mandiq_farmer_crop_log');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [justSaved, setJustSaved] = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(false);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [pickupDate, setPickupDate] = useState('कल सुबह (08:00 AM - 11:00 AM)');

  // Fetch price data & 7-day prediction
  useEffect(() => {
    let active = true;
    async function fetchData() {
      setLoading(true);
      try {
        const [histRes, predRes] = await Promise.allSettled([
          mandiApi.getHistory(crop, market),
          mandiApi.predict(crop, 7, market),
        ]);
        if (!active) return;

        let latestModalPerKg = 25;
        if (histRes.status === 'fulfilled' && histRes.value.length > 0) {
          const last = histRes.value[histRes.value.length - 1];
          latestModalPerKg = Math.round(last.modal_price / 100);
        } else {
          latestModalPerKg = crop === 'Tomato' ? 25 : crop === 'Potato' ? 18 : crop === 'Onion' ? 28 : 20;
        }

        let pList: Prediction[] = predRes.status === 'fulfilled' ? predRes.value : [];
        if (pList.length === 0) {
          const today = new Date();
          pList = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i + 1);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const jitter = predictionJitter(dateStr, `${crop}|${market}`);
            const priceQuintal = (latestModalPerKg * 100) + jitter + (i === 3 ? 200 : i === 4 ? 150 : -50);
            return {
              date: dateStr,
              predicted_price: Math.max(10, Math.round(priceQuintal / 100)),
              lower_bound: Math.round((priceQuintal * 0.95) / 100),
              upper_bound: Math.round((priceQuintal * 1.05) / 100),
              confidence: 75,
              unit: 'Rs./kg',
            };
          });
        } else {
          pList = pList.map(p => {
            const j = predictionJitter(p.date, `${crop}|${market}`);
            const pr = Math.round((p.predicted_price + j) / 100);
            return {
              ...p,
              predicted_price: pr > 0 ? pr : latestModalPerKg,
              lower_bound: Math.round(pr * 0.95),
              upper_bound: Math.round(pr * 1.05),
              unit: 'Rs./kg',
            };
          });
        }

        setBasePrice(Math.max(10, latestModalPerKg));
        setPredictions(pList);
      } catch {
        if (!active) return;
        setBasePrice(crop === 'Tomato' ? 25 : crop === 'Potato' ? 18 : 22);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => { active = false; };
  }, [crop, market]);

  const handleCropChange = (c: string) => {
    setCrop(c);
    localStorage.setItem('selectedCrop', c);
  };

  // Adjusted price based on Quality Grade
  const effectivePricePerKg = useMemo(() => {
    const modifier = QUALITY_MODIFIERS[qualityGrade]?.multiplier || 1.0;
    return Math.round(basePrice * modifier);
  }, [basePrice, qualityGrade]);

  // Actual quantity in KG
  const totalKg = unit === 'quintal' ? quantityKg * 100 : quantityKg;

  // Transparent calculation engine:
  const calc = useMemo(() => {
    const gross = Math.round(totalKg * effectivePricePerKg);
    const quintals = totalKg / 100;

    // Mandi route costs
    const currentMktObj = MARKETS.find(m => m.value === market);
    const ratePerQuintal = currentMktObj?.transportCost || 110;
    const transport = Math.round(Math.max(500, quintals * ratePerQuintal));
    const loading = Math.round(quintals * 40);
    const packaging = Math.round(quintals * 50);
    const mandiCess = Math.round(gross * 0.015);
    const totalCosts = transport + loading + packaging + mandiCess;

    const mandiNet = Math.max(0, gross - totalCosts);
    const mandiPerKg = totalKg > 0 ? (mandiNet / totalKg).toFixed(1) : '0';

    // MandiQ direct farmgate
    const mandiqNet = gross;
    const mandiqPerKg = effectivePricePerKg.toFixed(1);
    const diff = mandiqNet - mandiNet;
    const diffPct = mandiNet > 0 ? ((diff / mandiNet) * 100).toFixed(1) : '0';

    return {
      gross,
      transport,
      loading,
      packaging,
      mandiCess,
      totalCosts,
      mandiNet,
      mandiPerKg,
      mandiqNet,
      mandiqPerKg,
      diff,
      diffPct,
    };
  }, [totalKg, effectivePricePerKg, market, MARKETS]);

  // Save / Record Farmer Data
  const handleSaveFarmerRecord = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const currentMandiLabel = MANDI_MAP[market] ? t(MANDI_MAP[market].shortKey) : market.replace(' APMC', '');

    const newEntry: CropLogEntry = {
      id: Date.now().toString(),
      crop,
      quantityKg: totalKg,
      grade: qualityGrade,
      market: currentMandiLabel,
      date: formattedDate,
      gross: calc.gross,
      mandiCost: calc.totalCosts,
      mandiNet: calc.mandiNet,
      mandiqNet: calc.mandiqNet,
      savings: calc.diff,
    };

    const updated = [newEntry, ...records.slice(0, 9)];
    setRecords(updated);
    localStorage.setItem('mandiq_farmer_crop_log', JSON.stringify(updated));

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  // Peak day prediction
  const peakDayInfo = useMemo(() => {
    if (!predictions.length) return null;
    let maxP = 0;
    let bestDay = predictions[0];
    predictions.forEach(p => {
      if (p.predicted_price > maxP) {
        maxP = p.predicted_price;
        bestDay = p;
      }
    });
    const dayName = new Date(bestDay.date).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long' });
    const diffFromToday = maxP - effectivePricePerKg;
    const extraEarnings = diffFromToday > 0 ? Math.round(diffFromToday * totalKg) : 0;
    return { dayName, maxP, diffFromToday, extraEarnings, date: bestDay.date };
  }, [predictions, effectivePricePerKg, totalKg, lang]);

  return (
    <div className="min-h-screen bg-[#F2F2EE] pb-24 max-w-md mx-auto mq-fadein font-sans text-[#1A1A18]">
      {/* ── MANDIQ STANDARD HEADER ── */}
      <div className="mq-header px-6 pt-10 pb-7 rounded-b-[2.5rem]">
        <div className="flex items-center gap-3.5 mb-5">
          <button
            onClick={() => navigate('/home')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {t('nav.smart_sell')}
            </h1>
            <p className="text-white/75 text-xs mt-0.5">
              नियमित फसल रिकॉर्ड व शुद्ध मुनाफे का हिसाब
            </p>
          </div>
        </div>

        {/* Crop selection grid directly in header — identical to HomeScreen */}
        <div>
          <p className="text-white text-xs font-bold mb-2 uppercase tracking-wider text-white/80">
            {t('home.selectCrop')}
          </p>
          <div className={`grid gap-2 ${CROPS.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {CROPS.map(c => {
              const isSelected = crop === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => handleCropChange(c.name)}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'bg-white border-white text-[#1C4230] font-bold shadow-md'
                      : 'bg-white/15 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  <CropIcon crop={c.name} className="w-8 h-8 mb-1" />
                  <p className={`text-xs font-semibold leading-tight text-center ${isSelected ? 'text-[#1C4230]' : 'text-white'}`}>
                    {cropName(c.name, t)}
                  </p>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#1C4230] mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="px-5 -mt-3 space-y-4">

        {/* 1. किसान फसल डेटा इनपुट कार्ड (Farmer Regular Data Input) */}
        <div className="mq-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E6F2EB] rounded-2xl flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5 text-[#1C4230]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  1. अपनी फसल का विवरण भरें
                </p>
                <p className="text-xs text-gray-400">
                  मात्रा, गुणवत्ता व मंडी चुनें
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#E6F2EB] px-2.5 py-1 rounded-full">
              <div className="mq-live-dot" />
              <span className="text-[11px] font-bold text-[#1C4230]">
                ₹{basePrice}/kg
              </span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-600 font-semibold">
                उपलब्ध मात्रा (Quantity)
              </label>
              <div className="flex items-center gap-1 bg-[#EEEEE9] p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setUnit('kg')}
                  className={`px-3 py-1 rounded-lg transition-all ${unit === 'kg' ? 'bg-[#1C4230] text-white shadow-xs' : 'text-gray-600'}`}
                >
                  किलो (kg)
                </button>
                <button
                  onClick={() => setUnit('quintal')}
                  className={`px-3 py-1 rounded-lg transition-all ${unit === 'quintal' ? 'bg-[#1C4230] text-white shadow-xs' : 'text-gray-600'}`}
                >
                  क्विंटल (q)
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                min="1"
                value={quantityKg}
                onChange={e => setQuantityKg(Math.max(1, Number(e.target.value)))}
                className="mq-input w-full px-4 py-3 text-lg font-bold text-[#1A1A18] focus:outline-none"
              />
              <span className="absolute right-4 top-3.5 text-xs text-gray-400 font-medium">
                {unit === 'quintal' ? `(${totalKg.toLocaleString()} किलो)` : `(${(totalKg / 100).toFixed(1)} क्विंटल)`}
              </span>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {[500, 1000, 2000, 5000].map(val => (
                <button
                  key={val}
                  onClick={() => setQuantityKg(unit === 'quintal' ? val / 100 : val)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F2F2EE] hover:bg-[#E6F2EB] hover:text-[#1C4230] text-gray-700 transition-colors shrink-0"
                >
                  {val.toLocaleString()} kg
                </button>
              ))}
            </div>
          </div>

          {/* Quality Grade */}
          <div>
            <label className="text-xs text-gray-600 font-semibold block mb-1.5">
              फसल की गुणवत्ता (Quality Grade)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['A', 'B', 'C'] as const).map(g => {
                const active = qualityGrade === g;
                const info = QUALITY_MODIFIERS[g];
                const gradePrice = Math.round(basePrice * info.multiplier);
                return (
                  <button
                    key={g}
                    onClick={() => setQualityGrade(g)}
                    className={`py-2.5 px-2 rounded-2xl text-center border-2 transition-all ${
                      active
                        ? 'border-[#1C4230] bg-[#E6F2EB] text-[#1C4230] font-bold shadow-xs'
                        : 'border-gray-100 bg-[#f8faf8] text-gray-600 hover:bg-gray-100/70'
                    }`}
                  >
                    <div className="text-xs font-bold">{info.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{info.desc}</div>
                    <div className={`text-xs font-extrabold mt-1 ${active ? 'text-[#1C4230]' : 'text-gray-700'}`}>
                      ₹{gradePrice}/kg
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandi Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#1C4230]" />
                <span>तुलना के लिए मंडी (Target Mandi)</span>
              </label>
              <span className="text-[10px] text-[#1C4230] bg-[#E6F2EB] px-2 py-0.5 rounded-full font-bold">
                {MANDI_MAP[market] ? t(MANDI_MAP[market].labelKey) : market.replace(' APMC', '')}
              </span>
            </div>

            <div className={`grid gap-2 ${MARKETS.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {MARKETS.map(m => {
                const active = market === m.value;
                const label = MANDI_MAP[m.value] ? t(MANDI_MAP[m.value].labelKey) : m.value;
                const sub = MANDI_MAP[m.value] ? t(MANDI_MAP[m.value].sublabelKey) : '';
                return (
                  <button
                    key={m.value}
                    onClick={() => {
                      setMarket(m.value);
                      localStorage.setItem('selectedMarket', m.value);
                    }}
                    className={`py-2.5 px-2 rounded-2xl text-center border-2 transition-all flex flex-col items-center gap-1 ${
                      active
                        ? 'border-[#1C4230] bg-[#E6F2EB] text-[#1C4230] font-bold shadow-xs'
                        : 'border-gray-100 bg-[#f8faf8] text-gray-600 hover:bg-gray-100/70'
                    }`}
                  >
                    <MandiIcon mandi={m.value} className="w-6 h-6" />
                    <div className="text-xs font-bold truncate max-w-full">{label}</div>
                    <div className="text-[10px] text-gray-400 truncate max-w-full">{sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selling Window */}
          <div>
            <label className="text-xs text-gray-600 font-semibold block mb-1.5">
              कब बेचना चाहते हैं? (Selling Window)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'today', label: 'Today (तुरंत)' },
                { key: '3days', label: '2-3 Days (2-3 दिन)' },
                { key: 'week', label: 'Next Week (अगले हफ्ते)' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setHarvestWindow(opt.key as any)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                    harvestWindow === opt.key
                      ? 'border-[#1C4230] bg-[#E6F2EB] text-[#1C4230] font-bold'
                      : 'border-gray-100 bg-[#f8faf8] text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save / Record Button */}
          <button
            onClick={handleSaveFarmerRecord}
            className="w-full py-3.5 rounded-2xl bg-[#E6F2EB] hover:bg-[#d8ece0] text-[#1C4230] font-bold text-sm flex items-center justify-center gap-2 border border-[#1C4230]/20 active:scale-[0.99] transition-all"
          >
            <Save className="w-4 h-4 text-[#1C4230]" />
            <span>यह विवरण अपने खाते में दर्ज करें (Save Record)</span>
          </button>

          {justSaved && (
            <div className="p-3 rounded-2xl bg-[#E6F2EB] text-[#1C4230] text-xs font-bold text-center flex items-center justify-center gap-2 border border-[#1C4230]/20 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#1C4230]" />
              <span>✓ आज का फसल रिकॉर्ड सफलतापूर्वक दर्ज हो गया!</span>
            </div>
          )}
        </div>

        {/* 2. दर्ज रिकॉर्ड स्थिति (Farmer's Recorded History / Log) */}
        {records.length > 0 && (
          <div className="mq-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#E6F2EB] rounded-xl flex items-center justify-center text-[#1C4230]">
                  <History className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-gray-800">
                  आपका दर्ज रिकॉर्ड ({records.length} प्रविष्टियां)
                </span>
              </div>
              <button
                onClick={() => setShowHistoryList(!showHistoryList)}
                className="text-xs text-[#1C4230] font-bold flex items-center gap-0.5"
              >
                {showHistoryList ? 'छुपाएं' : 'सभी देखें'}
                {showHistoryList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Latest record summary badge */}
            <div className="mt-3 p-3 rounded-2xl bg-[#f8faf8] border border-gray-100 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1A1A18]">
                  {cropName(records[0].crop, t)}: {records[0].quantityKg.toLocaleString()} kg
                </span>
                <span className="text-gray-500 text-[11px] ml-1.5">
                  ({records[0].market})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block">
                  {records[0].date}
                </span>
                <span className="text-xs text-[#1C4230] font-bold">
                  +₹{records[0].savings.toLocaleString()} बचत
                </span>
              </div>
            </div>

            {/* Expandable previous logs */}
            {showHistoryList && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2 max-h-48 overflow-y-auto">
                {records.slice(1).map(r => (
                  <div key={r.id} className="text-xs p-2.5 rounded-xl bg-[#f8faf8] border border-gray-100 flex items-center justify-between text-gray-600">
                    <div>
                      <span className="font-bold text-[#1A1A18]">{cropName(r.crop, t)}</span>
                      <span className="ml-1.5">({r.quantityKg.toLocaleString()} kg • {r.market})</span>
                    </div>
                    <span className="text-xs text-[#1C4230] font-bold">+₹{r.savings.toLocaleString()} बचत</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. मंडी vs MandiQ खर्चे और मुनाफे का सीधा हिसाब (Core Value Prop) */}
        <div className="mq-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E6F2EB] rounded-2xl flex items-center justify-center flex-shrink-0">
                <BadgePercent className="w-5 h-5 text-[#1C4230]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  2. खर्चे व मुनाफे का सीधा हिसाब
                </p>
                <p className="text-xs text-gray-400">
                  मंडी vs MandiQ की पारदर्शी तुलना
                </p>
              </div>
            </div>

            <span className="text-xs text-gray-600 bg-[#F2F2EE] px-2.5 py-1 rounded-full font-semibold">
              {totalKg.toLocaleString()} kg
            </span>
          </div>

          {/* MandiQ Hero Benefit Card */}
          <div
            className="rounded-2xl p-4 text-white relative overflow-hidden shadow-sm"
            style={{ background: 'linear-gradient(145deg, #1C4230 0%, #245438 100%)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/75 font-bold">
                  खेत से बेचने पर अतिरिक्त बचत
                </p>
                <div className="mq-price text-3xl font-extrabold text-[#F5B400] mt-1">
                  +₹{calc.diff.toLocaleString()}
                  <span className="text-xs font-semibold text-white/80 ml-2">
                    (+{calc.diffPct}%)
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs text-white/85 mt-2 font-normal leading-relaxed">
              MandiQ गाड़ी सीधे आपके खेत पर भेजता है। मंडी ले जाने में कटने वाले{' '}
              <strong className="text-white font-bold">₹{calc.totalCosts.toLocaleString()}</strong> (भाड़ा, पल्लेदारी, पैकिंग व आढ़त) बचकर सीधे आपके हाथ में आएंगे।
            </p>
          </div>

          {/* Side-by-Side Comparison: Mandi vs MandiQ */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* मंडी में कितना खर्च लगेगा */}
            <div className="bg-[#f8faf8] rounded-2xl p-3.5 border border-gray-200/80 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-gray-800 mb-2.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>मंडी में कितना खर्च?</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-gray-600">
                  <div className="flex justify-between">
                    <span>कुल बिक्री:</span>
                    <span className="font-semibold text-gray-800">₹{calc.gross.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>- गाड़ी भाड़ा:</span>
                    <span>-₹{calc.transport}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>- पल्लेदारी:</span>
                    <span>-₹{calc.loading}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>- कट्टे/पैकिंग:</span>
                    <span>-₹{calc.packaging}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>- मंडी आढ़त (1.5%):</span>
                    <span>-₹{calc.mandiCess}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between font-bold text-red-700">
                    <span>मंडी में कुल खर्च:</span>
                    <span>-₹{calc.totalCosts.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-gray-300">
                <p className="text-[10px] text-gray-500 font-medium">हाथ में शुद्ध रकम:</p>
                <p className="mq-price text-base font-extrabold text-[#1A1A18]">₹{calc.mandiNet.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 font-semibold">(₹{calc.mandiPerKg}/किलो)</p>
              </div>
            </div>

            {/* MandiQ के जरिए कितना लगेगा */}
            <div className="bg-[#E6F2EB] rounded-2xl p-3.5 border-2 border-[#1C4230] flex flex-col justify-between relative shadow-xs">
              <span className="absolute -top-2.5 right-2 bg-[#1C4230] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                MandiQ द्वारा
              </span>

              <div>
                <div className="text-xs font-bold text-[#1C4230] mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1C4230]" />
                  <span>MandiQ खेत से</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#1C4230]">
                  <div className="flex justify-between">
                    <span>उचित भाव:</span>
                    <span className="font-bold">₹{effectivePricePerKg}/किलो</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>गाड़ी भाड़ा:</span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded font-bold">₹0 मुफ्त</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>पल्लेदारी:</span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded font-bold">₹0 मुफ्त</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>क्रेट्स/पैकिंग:</span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded font-bold">शामिल</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>मंडी आढ़त:</span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded font-bold">0% शून्य</span>
                  </div>
                  <div className="pt-2 border-t border-[#1C4230]/20 flex justify-between font-bold">
                    <span>कुल खर्च:</span>
                    <span>₹0</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-[#1C4230]/20">
                <p className="text-[10px] text-[#1C4230] font-medium">हाथ में शुद्ध रकम:</p>
                <p className="mq-price text-base font-extrabold text-[#1C4230]">₹{calc.mandiqNet.toLocaleString()}</p>
                <p className="text-[10px] text-[#1C4230] font-bold">(₹{calc.mandiqPerKg}/किलो)</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. कब बेचना सही रहेगा? (7-Day Forecast & Peak Advice) */}
        {peakDayInfo && (
          <div className="mq-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E6F2EB] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#1C4230]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    कब बेचना सबसे सही रहेगा?
                  </p>
                  <p className="text-xs text-gray-400">
                    7 दिन का भाव पूर्वानुमान
                  </p>
                </div>
              </div>

              <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                Peak: {peakDayInfo.dayName}
              </span>
            </div>

            <div className="bg-[#FFF4ED] border border-[#E8692A]/25 rounded-2xl p-3.5 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-[#E8692A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#1A1A18]">
                  {peakDayInfo.dayName} को भाव peak पर रहने का अनुमान है (₹{peakDayInfo.maxP}/किलो)!
                </p>
                {peakDayInfo.extraEarnings > 0 && (
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    यदि आप {peakDayInfo.dayName} को बेचते हैं, तो अनुमानित <strong className="text-[#E8692A]">+₹{peakDayInfo.extraEarnings.toLocaleString()}</strong> का अतिरिक्त फायदा हो सकता है।
                  </p>
                )}
              </div>
            </div>

            {/* Sparkline area chart */}
            {predictions.length > 0 && (
              <div className="h-28 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={predictions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1C4230" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1C4230" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'narrow' })}
                      tick={{ fontSize: 10, fill: '#6B7166' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fontSize: 9, fill: '#6B7166' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as Prediction;
                        return (
                          <div className="bg-[#1C4230] text-white text-xs px-2.5 py-1.5 rounded-xl shadow-md font-medium">
                            {d.date}: <strong>₹{d.predicted_price}/kg</strong>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted_price"
                      stroke="#1C4230"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#priceGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* 5. Signature MandiQ CTA Button */}
        <div className="pt-2">
          <button
            onClick={() => setShowBookingModal(true)}
            className="w-full mq-cta text-white font-bold rounded-2xl py-4 px-5 text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
          >
            <Truck className="w-5 h-5 text-white" />
            <span>गाड़ी बुक करें (खेत से मुफ्त पिकअप)</span>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>
          <p className="text-center text-xs text-gray-500 mt-2 font-medium">
            खेत से मुफ्त पिकअप • शून्य ढुलाई खर्च • लाइव पारदर्शी भुगतान
          </p>
        </div>

      </div>

      {/* ── BOOKING CONFIRMATION DRAWER ── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#1C4230]" />
                <h3 className="font-bold text-base text-[#1A1A18]">
                  खेत से मुफ्त गाड़ी बुक करें
                </h3>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2EE] flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#E6F2EB] p-4 rounded-2xl border border-[#1C4230]/20 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">फसल व मात्रा:</span>
                <strong className="text-[#1A1A18]">{cropName(crop, t)} ({totalKg.toLocaleString()} kg)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">गुणवत्ता:</span>
                <strong className="text-[#1C4230]">{QUALITY_MODIFIERS[qualityGrade]?.label} (₹{effectivePricePerKg}/kg)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">हाथ में मिलने वाली रकम:</span>
                <strong className="mq-price text-base text-[#1C4230]">₹{calc.mandiqNet.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-[#1C4230] font-bold pt-1.5 border-t border-[#1C4230]/20">
                <span>परिवहन व लोडिंग:</span>
                <span className="bg-white/80 px-2 py-0.5 rounded-lg">₹0 मुफ्त पिकअप</span>
              </div>
            </div>

            {/* Slot selection */}
            <div>
              <label className="text-xs text-gray-600 font-bold block mb-1.5">
                पिकअप का समय चुनें:
              </label>
              <select
                value={pickupDate}
                onChange={e => setPickupDate(e.target.value)}
                className="mq-input w-full px-3.5 py-3 text-xs font-semibold text-[#1A1A18] focus:outline-none"
              >
                <option>कल सुबह (08:00 AM - 11:00 AM)</option>
                <option>कल दोपहर (01:00 PM - 04:00 PM)</option>
                <option>परसों सुबह (08:00 AM - 11:00 AM)</option>
              </select>
            </div>

            <div className="text-[11px] text-gray-600 leading-relaxed bg-[#f8faf8] p-3 rounded-2xl flex items-start gap-2 border border-gray-100">
              <ShieldCheck className="w-4 h-4 text-[#1C4230] shrink-0 mt-0.5" />
              <span>MandiQ टीम आपके खेत पर आकर डिजिटल कांटे से वजन करेगी और तुरंत बैंक खाते/UPI में भुगतान जारी किया जाएगा।</span>
            </div>

            <button
              onClick={() => {
                setShowBookingModal(false);
                setBookingSuccess(true);
              }}
              className="w-full mq-cta text-white font-bold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4 text-white" />
              <span>पिकअप पुष्टि करें</span>
            </button>
          </div>
        </div>
      )}

      {/* ── BOOKING SUCCESS MODAL ── */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-[#E6F2EB] text-[#1C4230] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A18]">
              गाड़ी बुक हो गई!
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              MandiQ प्रतिनिधि कुछ ही देर में आपसे संपर्क करके पिकअप का समय और लोकेशन कन्फर्म करेगा।
            </p>

            <button
              onClick={() => setBookingSuccess(false)}
              className="w-full py-3 bg-[#1C4230] text-white font-bold rounded-2xl text-xs mt-2 active:scale-95 transition-all"
            >
              ठीक है
            </button>
          </div>
        </div>
      )}

      {/* ── MANDIQ BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
}

export default SmartSellScreen;
