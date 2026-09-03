import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Dumbbell, Apple, Users, Trophy, User, type LucideIcon } from 'lucide-react';
import { haptic } from '../lib/haptics';
import { useT } from '../lib/i18n';
import { useSettings } from '../state/settingsStore';
import { tabOrder } from '../lib/apprentice';

// Every tab the app has. Apprentice Mode shows a subset (lib/apprentice.ts
// decides which) — the hidden screens keep working, they just stop competing
// for a beginner's attention. Keyed by route so both lists stay in step.
const TABS: Record<string, { key: string; icon: LucideIcon }> = {
  '/home': { key: 'nav.home', icon: Home },
  '/train': { key: 'nav.train', icon: Dumbbell },
  '/nutrition': { key: 'nav.food', icon: Apple },
  '/social': { key: 'nav.social', icon: Users },
  '/quests': { key: 'nav.quests', icon: Trophy },
  '/profile': { key: 'nav.you', icon: User },
};

export function TabBar() {
  const t = useT();
  const apprentice = useSettings((s) => s.apprentice);
  return (
    <nav className="fx-tabbar shrink-0 border-t border-line bg-surface/90 backdrop-blur px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabOrder(apprentice).map((to) => {
          const Icon = TABS[to].icon;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => haptic('tap')}
              className={({ isActive }) =>
                `relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-indicator" className="tab-indicator absolute top-0 h-0.5 w-8 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />}
                  <motion.span className="tab-icon" animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.span>
                  <span className="tab-label">{t(TABS[to].key)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
