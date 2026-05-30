import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Apple, Users, Trophy, User } from 'lucide-react';
import { haptic } from '../lib/haptics';

const TABS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/train', label: 'Train', icon: Dumbbell },
  { to: '/nutrition', label: 'Food', icon: Apple },
  { to: '/social', label: 'Social', icon: Users },
  { to: '/quests', label: 'Quests', icon: Trophy },
  { to: '/profile', label: 'You', icon: User },
];

export function TabBar() {
  return (
    <nav className="shrink-0 border-t border-line bg-surface/90 backdrop-blur px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
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
                  {t.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
