import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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
                `relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />}
                  <motion.span animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.span>
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
