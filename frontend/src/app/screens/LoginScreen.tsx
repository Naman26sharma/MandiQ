import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Sprout, ArrowLeft, Phone, Mic } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { useT } from '../../i18n';

export function LoginScreen() {
  const navigate = useNavigate();
  const { t } = useT();
  const [step, setStep] = useState<'phone'|'otp'|'role'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const roles = [
    { id: 'farmer', label: t('login.farmer'), icon: Sprout },
    { id: 'trader', label: t('login.trader'), icon: Sprout },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f5e9] via-white to-white flex flex-col max-w-md mx-auto">
      <div className="p-6 flex items-center">
        <button onClick={() => navigate('/')} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6 text-[#2d6a3e]" /></button>
        <div className="flex-1 flex justify-center"><div className="w-12 h-12 bg-[#2d6a3e] rounded-xl flex items-center justify-center"><Sprout className="w-7 h-7 text-white" /></div></div>
        <div className="w-10"></div>
      </div>
      <div className="flex-1 px-6 pt-8">
        {step === 'phone' && (
          <div className="space-y-6">
            <div><h2 className="text-2xl mb-2 text-[#1b4228]">{t('login.welcome')}</h2><p className="text-muted-foreground">{t('login.enterMobile')}</p></div>
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="tel" placeholder={t('login.mobile')} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} className="pl-12 h-14 rounded-2xl bg-white border-2 text-base" />
              </div>
              <Button onClick={() => phone.length === 10 && setStep('otp')} disabled={phone.length !== 10} className="w-full bg-[#2d6a3e] hover:bg-[#1b4228] text-white h-14 rounded-2xl">{t('login.sendOtp')}</Button>
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground"><Mic className="w-4 h-4" /><span>{t('login.voice')}</span></div>
            </div>
          </div>
        )}
        {step === 'otp' && (
          <div className="space-y-6">
            <div><h2 className="text-2xl mb-2 text-[#1b4228]">{t('login.enterOtp')}</h2><p className="text-muted-foreground">{t('login.sentTo')} +91 {phone}</p></div>
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)}>
                  <InputOTPGroup className="gap-2">
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} className="w-12 h-14 rounded-xl border-2 text-lg" />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={() => otp.length === 6 && setStep('role')} disabled={otp.length !== 6} className="w-full bg-[#2d6a3e] hover:bg-[#1b4228] text-white h-14 rounded-2xl">{t('login.verifyOtp')}</Button>
              <button className="w-full text-sm text-[#2d6a3e]">{t('login.resendOtp')}</button>
            </div>
          </div>
        )}
        {step === 'role' && (
          <div className="space-y-6">
            <div><h2 className="text-2xl mb-2 text-[#1b4228]">{t('login.selectRole')}</h2><p className="text-muted-foreground">{t('login.chooseUse')}</p></div>
            <div className="space-y-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button key={role.id} onClick={() => { setSelectedRole(role.id); setTimeout(() => navigate('/home'), 300); }}
                    className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedRole === role.id ? 'bg-[#2d6a3e] border-[#2d6a3e] text-white' : 'bg-white border-border text-foreground hover:border-[#2d6a3e]'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === role.id ? 'bg-white/20' : 'bg-[#e8f5e9]'}`}>
                      <Icon className={`w-6 h-6 ${selectedRole === role.id ? 'text-white' : 'text-[#2d6a3e]'}`} />
                    </div>
                    <span className="text-lg">{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}