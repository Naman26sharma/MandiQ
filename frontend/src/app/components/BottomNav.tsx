import { useNavigate, useLocation } from 'react-router';
import { Home, TrendingUp, Bell, User } from 'lucide-react';
import { useT } from '../../i18n';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();

  const tabs = [
    { path: '/home', icon: Home, label: t('nav.home') },
    { path: '/prediction', icon: TrendingUp, label: t('nav.predict') },
    { path: '/alerts', icon: Bell, label: t('nav.alerts') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border max-w-md mx-auto">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-1 ${isActive ? 'text-[#2d6a3e]' : 'text-muted-foreground'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}