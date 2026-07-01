import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Target, TrendingUp, MapPin, Cloud, Users, MessageSquare, Trash2 } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useT } from '../../i18n';

type UA={id:number;crop:string;targetPrice:number;createdAt:string};
const SK='mandiq_user_alerts';
function la():UA[]{try{return JSON.parse(localStorage.getItem(SK)||'[]');}catch{return[];}}

export function AlertsScreen(){
  const nav=useNavigate();const{t}=useT();
  const crop=localStorage.getItem('selectedCrop')||'Tomato';
  const[tp,setTp]=useState('');const[show,setShow]=useState(false);const[ua,setUa]=useState<UA[]>([]);
  const[nc,setNc]=useState({app:true,sms:false,whatsapp:true});

  const alertTypes=[
    {id:'target',icon:Target,title:t('alerts.targetTitle'),desc:t('alerts.targetDesc'),enabled:true},
    {id:'best',icon:TrendingUp,title:t('alerts.bestDayTitle'),desc:t('alerts.bestDayDesc'),enabled:true},
    {id:'mandi',icon:MapPin,title:t('alerts.mandiTitle'),desc:t('alerts.mandiDesc'),enabled:false},
    {id:'arrival',icon:Users,title:t('alerts.arrivalTitle'),desc:t('alerts.arrivalDesc'),enabled:true},
    {id:'weather',icon:Cloud,title:t('alerts.weatherTitle'),desc:t('alerts.weatherDesc'),enabled:false},
  ];
  const[at,setAt]=useState(alertTypes);

  useEffect(()=>{setUa(la());},[]);
  const ps=(l:UA[])=>{setUa(l);localStorage.setItem(SK,JSON.stringify(l));};
  const cr=()=>{const p=parseFloat(tp);if(!p||p<=0)return;ps([{id:Date.now(),crop,targetPrice:p,createdAt:new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})},...ua]);setTp('');setShow(false);};
  const del=(id:number)=>ps(ua.filter(a=>a.id!==id));
  const tog=(id:string)=>setAt(at.map(a=>a.id===id?{...a,enabled:!a.enabled}:a));
  const tc=(k:keyof typeof nc)=>setNc(p=>({...p,[k]:!p[k]}));

  return(<div className="min-h-screen bg-[#fafaf8] pb-20 max-w-md mx-auto">
    <div className="bg-gradient-to-br from-[#2d6a3e] to-[#16a34a] px-6 py-4 sticky top-0 z-10 rounded-b-3xl">
      <div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={()=>nav('/home')} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6 text-white"/></button><div><h2 className="text-xl text-white">{t('alerts.title')}</h2></div></div>
        <button onClick={()=>setShow(!show)} className="p-2 bg-white/20 rounded-xl"><Plus className="w-6 h-6 text-white"/></button></div>
    </div>
    <div className="px-6 py-6 space-y-6">
      {show&&<div className="bg-gradient-to-br from-[#fff7ed] to-white rounded-3xl p-6 border-2 border-[#f97316]/20">
        <h3 className="mb-4">{t('alerts.createTitle')}</h3>
        <div className="space-y-4">
          <div><label className="text-sm text-muted-foreground mb-2 block">{t('alerts.crop')}</label><Input value={crop} readOnly className="rounded-xl bg-white"/></div>
          <div><label className="text-sm text-muted-foreground mb-2 block">{t('alerts.targetPrice')}</label><Input type="number" placeholder={t('alerts.enterTarget')} value={tp} onChange={e=>setTp(e.target.value)} className="rounded-xl bg-white"/></div>
          <Button onClick={cr} className="w-full bg-[#2d6a3e] hover:bg-[#1b4228] rounded-xl">{t('alerts.createBtn')}</Button>
        </div></div>}

      <div className="bg-white rounded-3xl p-6 border border-border"><h3 className="mb-4">{t('alerts.myAlerts')}</h3>
        {ua.length===0?<p className="text-sm text-muted-foreground text-center py-4">{t('alerts.none')}</p>
        :<div className="space-y-3">{ua.map(a=><div key={a.id} className="flex items-center justify-between p-4 bg-[#e8f5e9] rounded-2xl">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center"><Target className="w-5 h-5 text-[#2d6a3e]"/></div>
            <div><p className="text-sm">{a.crop} → ₹{a.targetPrice}/{t('common.perQuintal')}</p><p className="text-xs text-muted-foreground">{t('alerts.created')} {a.createdAt}</p></div></div>
          <button onClick={()=>del(a.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button></div>)}</div>}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4"><MessageSquare className="w-5 h-5 text-[#2d6a3e]"/><h3>{t('alerts.channels')}</h3></div>
        <div className="space-y-3">
          {([['app',t('alerts.appNotif')],['sms',t('alerts.sms')],['whatsapp',t('alerts.whatsapp')]] as const).map(([k,l])=>
            <div key={k} className="flex items-center justify-between py-2"><p className="text-sm">{l}</p><Switch checked={nc[k]} onCheckedChange={()=>tc(k)}/></div>)}
        </div></div>

      <div className="bg-white rounded-3xl p-6 border border-border"><h3 className="mb-4">{t('alerts.types')}</h3>
        <div className="space-y-4">{at.map(a=>{const I=a.icon;return<div key={a.id} className="flex items-start gap-4 p-4 bg-[#fafaf8] rounded-2xl">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.enabled?'bg-[#e8f5e9]':'bg-gray-100'}`}><I className={`w-5 h-5 ${a.enabled?'text-[#2d6a3e]':'text-gray-400'}`}/></div>
          <div className="flex-1"><p className="mb-0.5">{a.title}</p><p className="text-xs text-muted-foreground">{a.desc}</p></div>
          <Switch checked={a.enabled} onCheckedChange={()=>tog(a.id)}/></div>})}</div></div>
    </div>
    <BottomNav/>
  </div>);
}