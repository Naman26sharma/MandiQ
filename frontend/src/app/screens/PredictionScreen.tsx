import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ThumbsUp, ThumbsDown, Cloud, TrendingUp, AlertCircle, DollarSign, Loader2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { mandiApi, type Prediction, type PriceRecord } from '../../mandiq-api';
import { useT } from '../../i18n';

const ML: Record<string,string> = {'Azadpur APMC':'Azadpur Mandi','Keshopur APMC':'Keshopur Mandi','Shahdara APMC':'Shahdara Mandi'};
function wd(d:string){return new Date(d).toLocaleDateString('en-US',{weekday:'short'})}
const SPD=25;

export function PredictionScreen() {
  const nav = useNavigate(); const {t}=useT();
  const [fb,setFb]=useState<'up'|'down'|null>(null);const[cm,setCm]=useState('');
  const crop=localStorage.getItem('selectedCrop')||'Tomato';
  const mkt=localStorage.getItem('selectedMarket')||'Azadpur APMC';
  const ml=ML[mkt]||mkt;
  const[ld,setLd]=useState(true);const[er,setEr]=useState<string|null>(null);
  const[hist,setHist]=useState<PriceRecord[]>([]);const[preds,setPreds]=useState<Prediction[]>([]);

  useEffect(()=>{let c=false;async function l(){setLd(true);setEr(null);try{const[h,p]=await Promise.all([mandiApi.getHistory(crop,mkt),mandiApi.predict(crop,7,mkt)]);if(c)return;setHist(h);setPreds(p);}catch(e:any){if(c)return;setEr(e?.message||'err');}finally{if(!c)setLd(false);}}l();return()=>{c=true;};},[crop,mkt]);

  const tp=hist.length?Math.round(hist[hist.length-1].modal_price):0;
  const cd=preds.map(p=>({day:wd(p.date),price:Math.round(p.predicted_price),lower:Math.round(p.lower_bound),upper:Math.round(p.upper_bound)}));
  let bp=tp,bd='',bi=-1;preds.forEach((p,i)=>{if(Math.round(p.predicted_price)>bp){bp=Math.round(p.predicted_price);bd=wd(p.date);bi=i;}});
  const hd=bi>=0?bi+1:0,eg=Math.max(0,bp-tp),sc=hd*SPD,ng=eg-sc;
  const ac=preds.length?Math.round(preds.reduce((s,p)=>s+p.confidence,0)/preds.length):0;

  return(
    <div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
      <div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] px-6 py-4 sticky top-0 z-10 rounded-b-3xl">
        <div className="flex items-center gap-4"><button onClick={()=>nav('/home')} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6 text-white"/></button><div><h2 className="text-xl text-white">{t('pred.title')}</h2></div></div>
      </div>
      <div className="px-6 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('pred.selectedCrop')}</p><p className="text-lg">{crop}</p></div><div className="text-right"><p className="text-sm text-muted-foreground">{t('pred.location')}</p><p className="text-sm">{ml}</p></div></div></div>

        {ld&&<div className="flex items-center gap-2 text-[#2d6a3e] py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/><span className="text-sm">{t('pred.generating')}</span></div>}
        {er&&!ld&&<div className="bg-red-50 border border-red-200 rounded-2xl p-4"><p className="text-sm text-red-700">{t('common.dataError')}</p><p className="text-xs text-red-600">{er}</p><p className="text-xs text-muted-foreground mt-2">{t('pred.noModel')}</p></div>}

        {!ld&&!er&&<>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-border">
            <div className="mb-4"><h3 className="mb-1">{t('pred.forecast')}</h3><p className="text-xs text-muted-foreground">{t('pred.withCI')}</p></div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cd}><defs><linearGradient id="ca" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d6a3e" stopOpacity={0.1}/><stop offset="95%" stopColor="#2d6a3e" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#6b7566',fontSize:12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#6b7566',fontSize:12}} domain={['dataMin-100','dataMax+100']}/>
                <Tooltip contentStyle={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'8px 12px'}} formatter={(v:number,n:string)=>[`₹${v}`,n==='price'?'Price':n==='upper'?'Upper':'Lower']}/>
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ca)"/>
                <Area type="monotone" dataKey="lower" stroke="none" fill="#fff"/>
                <Line type="monotone" dataKey="price" stroke="#2d6a3e" strokeWidth={3} dot={(p:any)=>{const{cx,cy,payload}=p;const best=bd&&payload.day===bd;return<circle cx={cx} cy={cy} r={best?8:4} fill={best?'#f97316':'#2d6a3e'} stroke="#fff" strokeWidth={2}/>;}}/>
              </AreaChart>
            </ResponsiveContainer>
            {bd&&<div className="mt-4 pt-4 border-t border-border"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('pred.bestSellDay')}</span><span className="text-[#f97316] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span>{bd} - ₹{bp.toLocaleString()}</span></div></div>}
          </div>

          <div className="bg-gradient-to-br from-[#e8f5e9] to-white rounded-3xl p-6 border border-[#2d6a3e]/20">
            <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 bg-[#2d6a3e] rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-white"/></div><div><p className="mb-1">{t('pred.costBenefit')}</p></div></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('pred.storageCost')} ({hd}d)</span><span className="text-red-600">-₹{sc}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('pred.expGain')}</span><span className="text-green-600">+₹{eg}</span></div>
              <div className="border-t border-[#2d6a3e]/20 pt-3 flex items-center justify-between"><span className="font-medium">{t('pred.netGain')}</span><span className={`text-lg ${ng>=0?'text-[#2d6a3e]':'text-red-600'}`}>{ng>=0?'+':''}₹{ng}</span></div>
            </div>
            {ng<=0&&<p className="text-xs text-muted-foreground mt-3">{t('pred.noHold')}</p>}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-border">
            <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 bg-[#fff7ed] rounded-xl flex items-center justify-center"><Cloud className="w-5 h-5 text-[#f97316]"/></div><div><p className="mb-1">{t('pred.weatherImpact')}</p></div></div>
            <p className="text-sm text-muted-foreground">{t('pred.weatherText')}</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-border">
            <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#16a34a]"/></div><div><p className="mb-1">{t('pred.demand')}</p></div></div>
            <div className="flex items-center gap-2 mb-2"><div className="flex-1 bg-[#e8ede9] rounded-full h-2"><div className="bg-[#16a34a] h-2 rounded-full" style={{width:'75%'}}></div></div><span className="text-sm text-[#16a34a]">{t('pred.high')}</span></div>
            <p className="text-sm text-muted-foreground">{t('pred.demandText')}</p>
          </div>

          <div className="bg-gradient-to-br from-[#fff7ed] to-white rounded-3xl p-6 border border-[#f97316]/20">
            <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 bg-[#f97316] rounded-xl flex items-center justify-center"><AlertCircle className="w-5 h-5 text-white"/></div><div><p className="mb-1">{t('pred.confidence')}</p></div></div>
            <div className="flex items-center gap-2 mb-4"><div className="flex-1 bg-[#e8ede9] rounded-full h-3"><div className="bg-[#f97316] h-3 rounded-full" style={{width:`${ac}%`}}></div></div><span className="text-sm">{ac}%</span></div>
            <p className="text-sm text-muted-foreground mb-4">{t('pred.confText')}</p>
            <div className="border-t border-[#f97316]/20 pt-4">
              <p className="text-sm mb-3">{t('pred.wasAccurate')}</p>
              <div className="flex gap-3 mb-3">
                <button onClick={()=>setFb('up')} className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${fb==='up'?'bg-[#16a34a] border-[#16a34a] text-white':'bg-white border-border'}`}><ThumbsUp className="w-5 h-5"/>{t('pred.yes')}</button>
                <button onClick={()=>setFb('down')} className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${fb==='down'?'bg-red-600 border-red-600 text-white':'bg-white border-border'}`}><ThumbsDown className="w-5 h-5"/>{t('pred.no')}</button>
              </div>
              {fb&&<div className="space-y-3"><Textarea placeholder="Optional feedback" value={cm} onChange={(e)=>setCm(e.target.value)} className="rounded-xl resize-none" rows={3}/><Button className="w-full bg-[#2d6a3e] hover:bg-[#1b4228] rounded-xl">{t('pred.submit')}</Button></div>}
            </div>
          </div>
        </>}
      </div>
      <BottomNav/>
    </div>
  );
}