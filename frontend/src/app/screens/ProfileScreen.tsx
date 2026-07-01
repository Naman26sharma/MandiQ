import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Globe, Calculator, MessageCircle, Mic, Info } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useT, type Lang } from '../../i18n';

export function ProfileScreen(){
  const nav=useNavigate();const{t,lang,setLang}=useT();
  const[showCalc,setShowCalc]=useState(false);
  const[qty,setQty]=useState('');const[tp,setTp]=useState('');const[tc,setTc]=useState('');const[stc,setStc]=useState('');const[sp,setSp]=useState('');const[mf,setMf]=useState('');const[np,setNp]=useState<number|null>(null);
  const[ep,setEp]=useState('');

  const calc=()=>{const q=parseFloat(qty)||0,p=parseFloat(ep)||0,tr=parseFloat(tc)||0,st=parseFloat(stc)||0,sl=parseFloat(sp)||0,fe=parseFloat(mf)||0;setNp(q*p-(tr+st+q*sl+fe));};
  const langs:{code:Lang;label:string}[]=[{code:'en',label:'English'},{code:'hi',label:'हिंदी'},{code:'pa',label:'ਪੰਜਾਬੀ'},{code:'mr',label:'मराठी'}];

  return(<div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
    <div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] px-6 py-8 rounded-b-3xl">
      <div className="flex items-center gap-4 mb-6"><div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center"><User className="w-10 h-10 text-white"/></div>
        <div className="text-white"><h2 className="text-2xl mb-1">Ramesh Kumar</h2><p className="text-white/80">{t('profile.farmer')}</p><p className="text-white/80 text-sm">+91 98765 43210</p></div></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center"><p className="text-white text-2xl mb-1">₹12,450</p><p className="text-white/80 text-xs">{t('profile.totalSavings')}</p></div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center"><p className="text-white text-2xl mb-1">+₹320</p><p className="text-white/80 text-xs">{t('profile.avgGain')}</p></div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center"><p className="text-white text-2xl mb-1">87%</p><p className="text-white/80 text-xs">{t('profile.accuracy')}</p></div>
      </div>
    </div>
    <div className="px-6 py-6 space-y-4">
      {/* Language */}
      <div className="bg-white rounded-3xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4"><Globe className="w-5 h-5 text-[#2d6a3e]"/><h3>{t('profile.language')}</h3></div>
        <div className="grid grid-cols-2 gap-2">{langs.map(l=><button key={l.code} onClick={()=>setLang(l.code)}
          className={`py-2 px-3 rounded-xl text-sm border-2 transition-all ${lang===l.code?'bg-[#2d6a3e] border-[#2d6a3e] text-white':'border-border'}`}>{l.label}</button>)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={()=>setShowCalc(!showCalc)} className="bg-gradient-to-br from-[#e8f5e9] to-white rounded-2xl p-6 border border-[#2d6a3e]/20 flex flex-col items-start gap-3">
          <div className="w-12 h-12 bg-[#2d6a3e] rounded-xl flex items-center justify-center"><Calculator className="w-6 h-6 text-white"/></div>
          <p className="text-sm">{t('profile.incomeCalc')}</p></button>
        <button className="bg-gradient-to-br from-[#fff7ed] to-white rounded-2xl p-6 border border-[#f97316]/20 flex flex-col items-start gap-3">
          <div className="w-12 h-12 bg-[#f97316] rounded-xl flex items-center justify-center"><MessageCircle className="w-6 h-6 text-white"/></div>
          <p className="text-sm">{t('profile.support')}</p></button>
        <button className="bg-gradient-to-br from-[#fff7ed] to-white rounded-2xl p-6 border border-[#f97316]/20 flex flex-col items-start gap-3">
          <div className="w-12 h-12 bg-[#f97316] rounded-xl flex items-center justify-center"><Mic className="w-6 h-6 text-white"/></div>
          <p className="text-sm">{t('profile.voice')}</p></button>
        <button onClick={()=>nav('/mandi-info')} className="bg-gradient-to-br from-[#e8f5e9] to-white rounded-2xl p-6 border border-[#2d6a3e]/20 flex flex-col items-start gap-3">
          <div className="w-12 h-12 bg-[#2d6a3e] rounded-xl flex items-center justify-center"><Info className="w-6 h-6 text-white"/></div>
          <p className="text-sm">{t('profile.insights')}</p></button>
      </div>

      {showCalc&&<div className="bg-white rounded-3xl p-6 border-2 border-[#2d6a3e]">
        <div className="flex items-center gap-3 mb-6"><Calculator className="w-6 h-6 text-[#2d6a3e]"/><h3>{t('profile.advCalc')}</h3></div>
        <div className="space-y-4">
          {[[qty,setQty,t('profile.quantity')],[ep,setEp,t('profile.expPrice')],[tc,setTc,t('profile.transport')],[stc,setStc,t('profile.storage')],[sp,setSp,t('profile.spoilage')],[mf,setMf,t('profile.mandiFees')]].map(([v,fn,l],i)=>
            <div key={i}><label className="text-sm text-muted-foreground mb-2 block">{l as string}</label><Input type="number" value={v as string} onChange={e=>(fn as any)(e.target.value)} className="rounded-xl"/></div>)}
          <Button onClick={calc} className="w-full bg-[#2d6a3e] hover:bg-[#1b4228] rounded-xl">{t('profile.calcBtn')}</Button>
          {np!==null&&<div className="bg-gradient-to-br from-[#e8f5e9] to-white rounded-2xl p-6 border border-[#2d6a3e]/20">
            <p className="text-sm text-muted-foreground mb-2">{t('profile.estProfit')}</p>
            <p className={`text-3xl ${np>=0?'text-[#16a34a]':'text-red-600'}`}>{np>=0?'+':''}₹{Math.round(np).toLocaleString()}</p></div>}
        </div></div>}
    </div>
    <BottomNav/>
  </div>);
}