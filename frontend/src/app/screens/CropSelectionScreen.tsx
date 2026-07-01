import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, ArrowLeft, Leaf, Apple, Wheat, Clock } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Input } from '../components/ui/input';
import { mandiApi } from '../../mandiq-api';
import { useT } from '../../i18n';

const categories=[{id:'all',icon:Leaf},{id:'vegetables',icon:Leaf},{id:'fruits',icon:Apple},{id:'grains',icon:Wheat}];
const CROPS=[{name:'Tomato',nameHindi:'टमाटर',category:'vegetables',seasonal:true,shelfLife:'5-7 days'},
{name:'Potato',nameHindi:'आलू',category:'vegetables',seasonal:false,shelfLife:'15-20 days'},
{name:'Onion',nameHindi:'प्याज',category:'vegetables',seasonal:false,shelfLife:'20-30 days'},
{name:'Spinach',nameHindi:'पालक',category:'vegetables',seasonal:true,shelfLife:'2-4 days'},
{name:'Cauliflower',nameHindi:'फूलगोभी',category:'vegetables',seasonal:true,shelfLife:'7-10 days'},
{name:'Mango',nameHindi:'आम',category:'fruits',seasonal:true,shelfLife:'3-5 days'},
{name:'Apple',nameHindi:'सेब',category:'fruits',seasonal:false,shelfLife:'15-30 days'},
{name:'Wheat',nameHindi:'गेहूँ',category:'grains',seasonal:false,shelfLife:'6-12 months'},
{name:'Rice',nameHindi:'चावल',category:'grains',seasonal:false,shelfLife:'6-12 months'}];
type CR=(typeof CROPS)[number]&{currentPrice:number|null;trend:'up'|'down'|'stable';available:boolean};

export function CropSelectionScreen(){
  const nav=useNavigate();const{t}=useT();
  const[sq,setSq]=useState('');const[sc,setSc]=useState('all');const[sel,setSel]=useState<string|null>(null);const[rows,setRows]=useState<CR[]>([]);
  const mkt=localStorage.getItem('selectedMarket')||'Azadpur APMC';

  useEffect(()=>{let c=false;async function l(){let av=new Set<string>();try{(await mandiApi.listCommodities()).forEach(x=>av.add(x.commodity));}catch{}
    const r:CR[]=await Promise.all(CROPS.map(async cr=>{if(!av.has(cr.name))return{...cr,currentPrice:null,trend:'stable' as const,available:false};
      try{const h=await mandiApi.getHistory(cr.name,mkt);if(!h.length)return{...cr,currentPrice:null,trend:'stable' as const,available:false};
        const l=Math.round(h[h.length-1].modal_price),p=h.length>1?Math.round(h[h.length-2].modal_price):l;
        return{...cr,currentPrice:l,trend:l>p?'up':l<p?'down':'stable',available:true};}catch{return{...cr,currentPrice:null,trend:'stable' as const,available:false};}}));
    if(!c)setRows(r);}l();return()=>{c=true;};},[mkt]);

  const fc=rows.filter(c=>{const ms=c.name.toLowerCase().includes(sq.toLowerCase())||c.nameHindi.includes(sq);const mc=sc==='all'||c.category===sc;return ms&&mc;});
  const hs=(n:string,a:boolean)=>{if(!a)return;localStorage.setItem('selectedCrop',n);setSel(n);setTimeout(()=>nav('/home'),300);};
  const catLabels:Record<string,string>={all:t('info.all'),vegetables:t('crops.title'),fruits:t('crops.title'),grains:t('crops.title')};

  return(<div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
    <div className="bg-white border-b border-border px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center gap-4 mb-4"><button onClick={()=>nav('/home')} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6 text-[#2d6a3e]"/></button><div><h2 className="text-xl">{t('crops.title')}</h2></div></div>
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input type="text" placeholder={t('common.search')} value={sq} onChange={e=>setSq(e.target.value)} className="pl-12 h-12 rounded-2xl bg-[#f5f5f3] border-0"/></div>
    </div>
    <div className="px-6 py-4">
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">{categories.map(c=>{const I=c.icon;return<button key={c.id} onClick={()=>setSc(c.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${sc===c.id?'bg-[#2d6a3e] text-white':'bg-white text-foreground border border-border'}`}><I className="w-4 h-4"/><span className="text-sm">{c.id==='all'?t('info.all'):c.id.charAt(0).toUpperCase()+c.id.slice(1)}</span></button>;})}</div>
      <div className="space-y-3"><p className="text-sm text-muted-foreground mb-3">{fc.length} {t('crops.available')}</p>
        {fc.map(c=><button key={c.name} onClick={()=>hs(c.name,c.available)} disabled={!c.available}
          className={`w-full bg-white rounded-2xl p-4 border-2 transition-all text-left ${sel===c.name?'border-[#2d6a3e] shadow-md':c.available?'border-border hover:border-[#2d6a3e]/50':'border-border opacity-70'}`}>
          <div className="flex items-center justify-between"><div className="flex-1">
            <div className="flex items-center gap-2 mb-1"><p className="font-medium">{c.name}</p>{c.seasonal&&<span className="px-2 py-0.5 bg-[#fff7ed] text-[#f97316] text-xs rounded-full">{t('crops.seasonal')}</span>}</div>
            <p className="text-sm text-muted-foreground mb-2">{c.nameHindi}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{c.shelfLife}</span>{c.available&&c.currentPrice!==null&&<span className="text-[#2d6a3e]">₹{c.currentPrice}/{t('common.perQuintal')}</span>}</div></div>
            {c.available?<div className={`px-3 py-1 rounded-full text-xs ${c.trend==='up'?'bg-green-100 text-green-700':c.trend==='down'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>{c.trend==='up'?'↑ '+t('crops.rising'):c.trend==='down'?'↓ '+t('crops.falling'):'→ '+t('crops.stableT')}</div>
            :<span className="px-3 py-1 bg-[#fff7ed] text-[#f97316] text-xs rounded-full">{t('common.comingSoon')}</span>}
          </div></button>)}
      </div>
    </div>
    <BottomNav/>
  </div>);
}