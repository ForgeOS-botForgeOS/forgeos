import type { ReminderConfig } from '../types';

// Best-effort local workout reminders. Web apps can't fire notifications when
// fully closed without push, so this checks each minute while the app is open
// (or backgrounded) and fires once per matching day.
const FIRED_KEY = 'forge-reminder-fired';

export async function requestNotifyPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

function fire() {
  try {
    new Notification('Time to train 🏋️', { body: "Your ForgeOS session is calling. Let's move.", icon: '/forgeos/icon-192.png' });
  } catch {
    /* notification not permitted */
  }
}

export function startReminderScheduler(getConfig: () => ReminderConfig): () => void {
  if (typeof window === 'undefined') return () => {};
  const tick = () => {
    const cfg = getConfig();
    if (!cfg.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0=Mon … 6=Sun
    if (!cfg.days.includes(dow)) return;
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hhmm !== cfg.time) return;
    const today = now.toISOString().slice(0, 10);
    if (localStorage.getItem(FIRED_KEY) === today) return;
    localStorage.setItem(FIRED_KEY, today);
    fire();
  };
  const id = window.setInterval(tick, 30000);
  tick();
  return () => window.clearInterval(id);
}
