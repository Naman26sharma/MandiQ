import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, Building2, Loader2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Input } from '../components/ui/input';
import { mandiApi } from '../../mandiq-api';
import { useT } from '../../i18n';

const MARKETS=[{value:'Azadpur APMC',label:'Azadpur Mandi, Delhi'},{value:'Keshopur APMC',label:'Keshopur Mandi, Delhi'},{value:'Shahdara APMC',label:'Shahdara Mandi, Delhi'}];
const CROPS=[{name:'Tomato',nameHindi:'टमाटर',cat:'veg'},{name:'Potato',nameHindi:'आलू',cat:'veg'},{name:'Onion',nameHindi:'प्याज',cat:'veg'},{name:'Spinach',nameHindi:'पालक',cat:'veg'},{name:'Cauliflower',nameHindi:'फूलगोभी',cat:'veg'},{name:'Cabbage',nameHindi:'पत्तागोभी',cat:'veg'},{name:'Wheat',nameHindi:'गेहूँ',cat:'grain'},{name:'Rice',nameHindi:'चावल',cat:'grain'}];
type R={name:string;nameHindi:string;cat:string;price:number|null;change:number;trend:'up'|'down'|'stable';available:boolean};

export function MandiInfoScreen(){
  const nav=useNavigate();const{t}=useT();
  const[sq,setSq]=useState('');const[sf,setSf]=useState('all');
  const[sm,setSm]=useState(localStorage.getItem('selectedMarket')||MARKETS[0].value);
  const[ld,setLd]=useState(true);const[rows,setRows]=useState<R[]>([]);

  useEffect(()=>{let c=false;async function l(){setLd(true);let av=new Set<string>();try{(await mandiApi.listCommodities()).forEach(x=>av.add(x.commodity));}catch{}
    const r:R[]=await Promise.all(CROPS.map(async cr=>{if(!av.has(cr.name))return{...cr,price:null,change:0,trend:'stable' as const,available:false};
      try{const h=await mandiApi.getHistory(cr.name,sm);if(!h.length)return{...cr,price:null,change:0,trend:'stable' as const,available:false};
        const l=Math.round(h[h.length-1].modal_price),p=h.length>1?Math.round(h[h.length-2].modal_price):l,ch=l-p;
        return{...cr,price:l,change:ch,trend:ch>0?'up':ch<0?'down':'stable',available:true};}catch{return{...cr,price:null,change:0,trend:'stable' as const,available:false};}}));
    if(!c){setRows(r);setLd(false);}}l();return()=>{c=true;};},[sm]);

  const fc=rows.filter(c=>{const ms=c.name.toLowerCase().includes(sq.toLowerCase())||c.nameHindi.includes(sq);const mf=sf==='all'||c.trend===sf;return ms&&mf;});
  const av=rows.filter(r=>r.available),ri=av.filter(c=>c.trend==='up').length,fa=av.filter(c=>c.trend==='down').length,st=av.filter(c=>c.trend==='stable').length;

  return(<div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
    <div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] px-6 py-4 sticky top-0 z-10 rounded-b-3xl">
      <div className="flex items-center gap-4 mb-4"><button onClick={()=>nav('/home')} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6 text-white"/></button><div><h2 className="text-xl text-white">{t('info.title')}</h2></div></div>
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-3 flex items-center gap-3"><Building2 className="w-5 h-5 text-white flex-shrink-0"/>
        <select value={sm} onChange={e=>{setSm(e.target.value);localStorage.setItem('selectedMarket',e.target.value);}} className="bg-transparent text-white text-sm w-full outline-none">{MARKETS.map(m=><option key={m.value} value={m.value} className="text-black">{m.label}</option>)}</select></div>
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input type="text" placeholder={t('common.search')} value={sq} onChange={e=>setSq(e.target.value)} className="pl-12 h-12 rounded-2xl bg-white border-0"/></div>
    </div>
    <div className="px-6 py-6 space-y-4">
      {ld&&<div className="flex items-center gap-2 text-[#2d6a3e] py-4 justify-center"><Loader2 className="w-5 h-5 animate-spin"/><span className="text-sm">{t('info.loading')}</span></div>}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-4 border border-green-200"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-600"/><span className="text-xs text-muted-foreground">{t('info.rising')}</span></div><p className="text-2xl text-green-600">{ri}</p></div>
        <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-4 border border-red-200"><div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-600"/><span className="text-xs text-muted-foreground">{t('info.falling')}</span></div><p className="text-2xl text-red-600">{fa}</p></div>
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200"><div className="flex items-center gap-2 mb-2"><Minus className="w-4 h-4 text-gray-600"/><span className="text-xs text-muted-foreground">{t('info.stable')}</span></div><p className="text-2xl text-gray-600">{st}</p></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[{id:'all',l:t('info.all')},{id:'up',l:t('info.rising')},{id:'down',l:t('info.falling')},{id:'stable',l:t('info.stable')}].map(f=><button key={f.id} onClick={()=>setSf(f.id)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm transition-colors ${sf===f.id?'bg-[#2d6a3e] text-white':'bg-white text-foreground border border-border'}`}>{f.l}</button>)}
      </div>
      <div className="space-y-3"><p className="text-sm text-muted-foreground">{fc.length} {t('info.cropsList')}</p>
        {fc.map(c=><div key={c.name} className="bg-white rounded-2xl p-4 border border-border"><div className="flex items-center justify-between"><div className="flex-1"><p className="mb-0.5">{c.name}</p><p className="text-sm text-muted-foreground">{c.nameHindi}</p></div>
          {c.available&&c.price!==null?<div className="text-right"><p className="text-xl text-[#1b4228] mb-1">₹{c.price}</p><div className={`flex items-center gap-1 text-sm justify-end ${c.trend==='up'?'text-green-600':c.trend==='down'?'text-red-600':'text-gray-600'}`}>
            {c.trend==='up'&&<><TrendingUp className="w-4 h-4"/><span>+₹{c.change}</span></>}{c.trend==='down'&&<><TrendingDown className="w-4 h-4"/><span>₹{c.change}</span></>}{c.trend==='stable'&&<><Minus className="w-4 h-4"/><span>{t('info.noChange')}</span></>}</div></div>
          :<span className="px-3 py-1 bg-[#fff7ed] text-[#f97316] text-xs rounded-full">{t('common.comingSoon')}</span>}</div></div>)}
      </div>
    </div>
    <BottomNav/>
  </div>);
}