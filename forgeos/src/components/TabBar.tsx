import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Apple, Users, Trophy, User } from 'lucide-react';
import { haptic } from '../lib/haptics';
import { useT } from '../lib/i18n';

const TABS = [
  { to: '/home', key: 'nav.home', icon: Home },
  { to: '/train', key: 'nav.train', icon: Dumbbell },
  { to: '/nutrition', key: 'nav.food', icon: Apple },
  { to: '/social', key: 'nav.social', icon: Users },
  { to: '/quests', key: 'nav.quests', icon: Trophy },
  { to: '/profile', key: 'nav.you', icon: User },
];

export function TabBar() {
  const t = useT();
  return (
    <nav className="shrink-0 border-t border-line bg-surface/90 backdrop-blur px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={() => haptic('tap')}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {t(tab.key)}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
