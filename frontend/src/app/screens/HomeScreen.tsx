import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, ChevronDown, TrendingUp, TrendingDown, Info, Bell, Sparkles, BarChart3, Building2, Sprout, Loader2, Calendar } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { mandiApi, type Prediction, type PriceRecord } from '../../mandiq-api';

const MARKETS = [
  { value: 'Azadpur APMC', label: 'Azadpur Mandi, Delhi' },
  { value: 'Keshopur APMC', label: 'Keshopur Mandi, Delhi' },
  { value: 'Shahdara APMC', label: 'Shahdara Mandi, Delhi' },
];

function weekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function prettyDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function HomeScreen() {
  const navigate = useNavigate();

  const [selectedCrop] = useState(localStorage.getItem('selectedCrop') || 'Tomato');
  const [selectedMarket, setSelectedMarket] = useState(
    localStorage.getItem('selectedMarket') || MARKETS[0].value
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const selectedLabel = MARKETS.find((m) => m.value === selectedMarket)?.label || selectedMarket;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [hist, preds] = await Promise.all([
          mandiApi.getHistory(selectedCrop, selectedMarket),
          mandiApi.predict(selectedCrop, 7, selectedMarket),
        ]);
        if (cancelled) return;
        setHistory(hist);
        setPredictions(preds);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Data load nahi hua');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedCrop, selectedMarket]);

  const lastRecord = history.length ? history[history.length - 1] : null;
  const todayPrice = lastRecord ? Math.round(lastRecord.modal_price) : 0;
  const lastDate = lastRecord ? lastRecord.date : '';
  const yesterdayPrice = history.length > 1 ? Math.round(history[history.length - 2].modal_price) : todayPrice;
  const priceDiff = todayPrice - yesterdayPrice;

  let bestPrice = todayPrice;
  let bestDay = '';
  let bestIdx = -1;
  predictions.forEach((p, i) => {
    if (Math.round(p.predicted_price) > bestPrice) {
      bestPrice = Math.round(p.predicted_price);
      bestDay = weekday(p.date);
      bestIdx = i;
    }
  });
  const gain = Math.round(bestPrice - todayPrice);
  const holdDays = bestIdx >= 0 ? bestIdx + 1 : 0;
  const avgConf = predictions.length
    ? Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length)
    : 0;

  // Chart: last 3 actual days + 7 predicted, so the line has context
  const recentActual = history.slice(-3).map((h) => ({
    label: weekday(h.date),
    price: Math.round(h.modal_price),
    type: 'actual',
  }));
  const futureData = predictions.map((p) => ({
    label: weekday(p.date),
    price: Math.round(p.predicted_price),
    type: 'forecast',
  }));
  const chartData = [...recentActual, ...futureData];

  const recommend =
    gain > 0
      ? { en: `Hold for ${holdDays} day${holdDays > 1 ? 's' : ''} for +₹${gain}/quintal`, hi: `${holdDays} दिन रुकें, ₹${gain} अधिक मिलेगा` }
      : { en: 'Sell now — price not expected to rise', hi: 'अभी बेचें — कीमत बढ़ने की उम्मीद नहीं' };

  return (
    <div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] px-6 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Welcome Back</p>
              <p className="text-white">Ramesh Kumar</p>
            </div>
          </div>
          <button onClick={() => navigate('/alerts')} className="relative p-2 bg-white/20 rounded-xl">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f97316] rounded-full text-white text-xs flex items-center justify-center">3</span>
          </button>
        </div>

        {/* Location Filter */}
        <div className="mb-3">
          <button onClick={() => setShowDropdown(!showDropdown)} className="w-full bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-white text-sm">Location / स्थान</p>
                <p className="text-white">{selectedLabel}</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-white transition ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="bg-white rounded-2xl shadow-lg mt-2 p-2">
              {MARKETS.map((mandi) => (
                <div key={mandi.value}
                  onClick={() => {
                    setSelectedMarket(mandi.value);
                    localStorage.setItem('selectedMarket', mandi.value);
                    setShowDropdown(false);
                  }}
                  className="p-3 rounded-xl hover:bg-gray-100 cursor-pointer">
                  {mandi.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crop Filter */}
        <button onClick={() => navigate('/crops')} className="w-full bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sprout className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-white text-sm">Selected Crop / फसल</p>
              <p className="text-white">{selectedCrop}</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      </div>

      {loading && (
        <div className="px-6 mt-6 flex items-center gap-2 text-[#2d6a3e]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading live data… / लाइव डेटा लोड हो रहा है…</span>
        </div>
      )}

      {error && !loading && (
        <div className="px-6 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700 mb-1">Data load nahi hua</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="px-6 -mt-4 space-y-4">
          {/* Today's Price Card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Latest Mandi Price</p>
                <p className="text-xs text-muted-foreground">नवीनतम मंडी भाव</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${priceDiff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {priceDiff >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                ₹{Math.abs(priceDiff)}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-4xl text-[#1b4228] mb-1">₹{todayPrice}</p>
              <p className="text-muted-foreground text-sm">per quintal / प्रति क्विंटल</p>
            </div>

            {/* Last updated date */}
            {lastDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Calendar className="w-3.5 h-3.5" />
                <span>As of {prettyDate(lastDate)}</span>
              </div>
            )}

            <div className={`flex items-center gap-2 text-sm ${priceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceDiff >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{priceDiff >= 0 ? '+' : ''}₹{priceDiff} from previous day</span>
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div className="bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] rounded-3xl p-6 border-2 border-[#f97316]/20">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f97316] rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm mb-1">AI Recommendation</p>
                <p className="text-xs text-muted-foreground">एआई सिफारिश</p>
              </div>
              <div className="px-3 py-1 bg-white rounded-full text-xs">{avgConf}% Confident</div>
            </div>

            <p className="text-lg text-[#1b4228] mb-1">{recommend.en}</p>
            <p className="text-sm text-muted-foreground">{recommend.hi}</p>

            {bestDay && (
              <div className="mt-4 pt-4 border-t border-[#f97316]/20 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Best Day: {bestDay}</span>
                <span className="text-[#16a34a]">₹{bestPrice}/quintal</span>
              </div>
            )}
          </div>

          {/* Forecast Chart — actual + forecast */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="mb-1">Price Trend & Forecast</p>
                <p className="text-xs text-muted-foreground">मूल्य रुझान और पूर्वानुमान</p>
              </div>
              <button onClick={() => navigate('/prediction')} className="text-sm text-[#2d6a3e] flex items-center gap-1">
                Details <Info className="w-4 h-4" />
              </button>
            </div>

            {/* legend */}
            <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#9ca3af] inline-block"></span> Recent actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#2d6a3e] inline-block"></span> 7-day forecast
              </span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="homeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d6a3e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2d6a3e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1ee" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7566', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7566', fontSize: 11 }} width={48}
                  domain={['dataMin - 80', 'dataMax + 80']} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '8px 12px' }}
                  formatter={(value: number) => [`₹${value}`, 'Price']}
                />
                <Area type="monotone" dataKey="price" stroke="#2d6a3e" strokeWidth={3}
                  fill="url(#homeArea)"
                  dot={{ fill: '#2d6a3e', r: 3 }}
                  activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/compare')} className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col items-start gap-2 hover:border-[#2d6a3e] transition-colors">
              <div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[#2d6a3e]" /></div>
              <div className="text-left"><p className="text-sm mb-0.5">Compare Mandis</p><p className="text-xs text-muted-foreground">मंडी तुलना</p></div>
            </button>
            <button onClick={() => navigate('/mandi-info')} className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col items-start gap-2 hover:border-[#2d6a3e] transition-colors">
              <div className="w-10 h-10 bg-[#fff7ed] rounded-xl flex items-center justify-center"><Building2 className="w-5 h-5 text-[#f97316]" /></div>
              <div className="text-left"><p className="text-sm mb-0.5">Mandi Info</p><p className="text-xs text-muted-foreground">मंडी जानकारी</p></div>
            </button>
            <button onClick={() => navigate('/prediction')} className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col items-start gap-2 hover:border-[#2d6a3e] transition-colors">
              <div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#16a34a]" /></div>
              <div className="text-left"><p className="text-sm mb-0.5">Detailed Prediction</p><p className="text-xs text-muted-foreground">विस्तृत पूर्वानुमान</p></div>
            </button>
            <button onClick={() => navigate('/crops')} className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col items-start gap-2 hover:border-[#2d6a3e] transition-colors">
              <div className="w-10 h-10 bg-[#fff7ed] rounded-xl flex items-center justify-center"><Sprout className="w-5 h-5 text-[#f97316]" /></div>
              <div className="text-left"><p className="text-sm mb-0.5">My Crops</p><p className="text-xs text-muted-foreground">मेरी फसलें</p></div>
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
