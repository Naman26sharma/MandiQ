import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Truck, TrendingUp, Users, Navigation, Star, Loader2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/ui/button';
import { mandiApi } from '../../mandiq-api';
import { useT } from '../../i18n';

const MM=[{value:'Azadpur APMC',name:'Azadpur Mandi',nameHindi:'आज़ादपुर मंडी',distance:12,transportCost:120,demandLevel:'High'},
{value:'Keshopur APMC',name:'Keshopur Mandi',nameHindi:'केशोपुर मंडी',distance:18,transportCost:180,demandLevel:'Medium'},
{value:'Shahdara APMC',name:'Shahdara Mandi',nameHindi:'शाहदरा मंडी',distance:25,transportCost:250,demandLevel:'Low'}];

function ap(h:{arrival_qty:number|null}[]):string{const q=h.map(x=>x.arrival_qty).filter((x):x is number=>x!=null&&!isNaN(x)&&x>0);if(q.length<10)return'Medium';const a=q.reduce((a,b)=>a+b,0)/q.length;const r=q.slice(-7);const ra=r.reduce((a,b)=>a+b,0)/r.length;if(ra>a*1.15)return'High';if(ra<a*0.85)return'Low';return'Medium';}
function pd(d:string){return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}

export function MandiCompareScreen(){
  const nav=useNavigate();const{t}=useT();
  const crop=localStorage.getItem('selectedCrop')||'Tomato';
  const[ld,setLd]=useState(true);const[mandis,setMandis]=useState<any[]>([]);const[sel,setSel]=useState<string[]>(['Azadpur APMC']);

  useEffect(()=>{let c=false;async function l(){setLd(true);
    const r=await Promise.all(MM.map(async m=>{let price=0,al='Medium',asOf='';
      try{const h=await mandiApi.getHistory(crop,m.value);if(h.length){price=Math.round(h[h.length-1].modal_price);asOf=h[h.length-1].date;al=ap(h);}}catch{}
      return{...m,price,netProfit:price>0?price-m.transportCost:0,arrivalPressure:al,asOf};}));
    const wp=r.filter(x=>x.price>0);const bv=wp.length>0?wp.reduce((a,b)=>b.netProfit>a.netProfit?b:a).value:null;
    if(!c){setMandis(r.map(x=>({...x,isBest:x.value===bv})));setLd(false);}}l();return()=>{c=true;};},[crop]);

  const tog=(v:string)=>{if(sel.includes(v))setSel(sel.filter(m=>m!==v));else if(sel.length<3)setSel([...sel,v]);};
  const dc=(l:string)=>l==='High'?'bg-green-100 text-green-700':l==='Medium'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700';
  const ac=(l:string)=>l==='Low'?'bg-green-100 text-green-700':l==='Medium'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700';
  const tl=(l:string)=>l==='High'?t('cmp.high'):l==='Medium'?t('cmp.medium'):t('cmp.low');

  return(<div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
    <div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] px-6 py-4 sticky top-0 z-10 rounded-b-3xl">
      <div className="flex items-center gap-4 mb-4"><button onClick={()=>nav('/home')} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6 text-white"/></button><div><h2 className="text-xl text-white">{t('cmp.title')}</h2></div></div>
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between"><div className="text-white"><p className="text-xs opacity-80">{t('cmp.selectedCrop')}</p><p className="text-sm">{crop}</p></div><div className="text-white text-right"><p className="text-xs opacity-80">{t('cmp.comparing')}</p><p className="text-sm">{sel.length} {t('cmp.of')} 3</p></div></div>
    </div>
    <div className="px-6 py-6 space-y-4">
      <div className="bg-gradient-to-br from-[#fff7ed] to-white rounded-2xl p-4 border border-[#f97316]/20"><p className="text-sm">{t('cmp.banner')}</p></div>
      {ld&&<div className="flex items-center gap-2 text-[#2d6a3e] py-4 justify-center"><Loader2 className="w-5 h-5 animate-spin"/><span className="text-sm">{t('cmp.loading')}</span></div>}
      {mandis.map(m=><div key={m.value} className={`bg-white rounded-3xl p-5 shadow-sm border-2 transition-all ${sel.includes(m.value)?'border-[#2d6a3e]':'border-border'}`}>
        <div className="flex items-start justify-between mb-4"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><h3 className="text-lg">{m.name}</h3>{m.isBest&&<span className="px-2 py-0.5 bg-[#f97316] text-white text-xs rounded-full flex items-center gap-1"><Star className="w-3 h-3"/>{t('cmp.best')}</span>}</div><p className="text-sm text-muted-foreground">{m.nameHindi}</p></div>
          <button onClick={()=>tog(m.value)} className={`w-6 h-6 rounded border-2 transition-all ${sel.includes(m.value)?'bg-[#2d6a3e] border-[#2d6a3e]':'border-border'}`}>{sel.includes(m.value)&&<svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}</button></div>
        <div className="bg-[#e8f5e9] rounded-2xl p-4 mb-4">{m.price>0?<><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t('cmp.mandiPrice')}</span><span className="text-2xl text-[#1b4228]">₹{m.price}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('cmp.transportEst')}</span><span className="text-red-600">- ₹{m.transportCost}</span></div>
          <div className="border-t border-[#2d6a3e]/20 mt-2 pt-2 flex items-center justify-between"><span className="text-sm">{t('cmp.netProfit')}</span><span className="text-[#16a34a] text-lg">₹{m.netProfit}</span></div>
          {m.asOf&&<p className="text-xs text-muted-foreground mt-2 text-right">{t('cmp.priceAsOf')} {pd(m.asOf)}</p>}</>
          :<p className="text-sm text-muted-foreground text-center py-2">{t('cmp.noData')}</p>}</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#fafaf8] rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-muted-foreground"/><span className="text-xs text-muted-foreground">{t('cmp.distance')}</span></div><p className="text-sm">{m.distance} km</p></div>
          <div className="bg-[#fafaf8] rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-muted-foreground"/><span className="text-xs text-muted-foreground">{t('cmp.transport')}</span></div><p className="text-sm">₹{m.transportCost}</p></div>
          <div className="bg-[#fafaf8] rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-muted-foreground"/><span className="text-xs text-muted-foreground">{t('cmp.demand')}</span></div><span className={`text-xs px-2 py-0.5 rounded-full ${dc(m.demandLevel)}`}>{tl(m.demandLevel)}</span></div>
          <div className="bg-[#fafaf8] rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground"/><span className="text-xs text-muted-foreground">{t('cmp.arrivals')}</span></div><span className={`text-xs px-2 py-0.5 rounded-full ${ac(m.arrivalPressure)}`}>{tl(m.arrivalPressure)}</span></div>
        </div>
        <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-xl border-[#2d6a3e] text-[#2d6a3e] hover:bg-[#e8f5e9]" onClick={()=>window.open(`https://maps.google.com/?q=${m.name}`,'_blank')}><Navigation className="w-4 h-4 mr-2"/>{t('cmp.route')}</Button>
          <Button className="flex-1 rounded-xl bg-[#2d6a3e] hover:bg-[#1b4228]" onClick={()=>{localStorage.setItem('selectedMarket',m.value);nav('/mandi-info');}}>{t('common.details')}</Button></div>
      </div>)}
      {sel.length>1&&<div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] rounded-3xl p-6 text-white"><h3 className="text-lg mb-4">{t('cmp.quickComp')}</h3><div className="space-y-3">{mandis.filter(m=>sel.includes(m.value)&&m.price>0).sort((a,b)=>b.netProfit-a.netProfit).map((m,i)=><div key={m.value} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">{i+1}</span><span className="text-sm">{m.name}</span></div><span className="text-lg">₹{m.netProfit}</span></div>)}</div></div>}
    </div>
    <BottomNav/>
  </div>);
}