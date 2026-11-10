import { Component, type ReactNode } from 'react';
import { exportData } from '../lib/backup';

// Last line of defence: a render error shows a friendly recovery screen (with a
// data export, since all progress is local) instead of a blank white app.
interface Props {
  children: ReactNode;
  /**
   * When this changes, a caught error is cleared. The per-screen boundary
   * passes the route, so one broken screen no longer takes the tab bar and
   * every other screen down with it — tapping another tab just works.
   */
  resetKey?: string;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ForgeOS crashed:', error);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="text-4xl">🛠️</div>
        <div>
          <h1 className="text-xl font-extrabold">Something broke</h1>
          <p className="mt-1 text-sm text-muted">{this.props.resetKey === undefined ? 'A screen hit an error. Your data is safe on this device: reload to continue.' : 'This screen hit an error. Your data is safe on this device. The other tabs still work, or reload to try again.'}</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <button onClick={() => location.reload()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black">Reload</button>
          <button onClick={() => exportData()} className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm">Export a backup first</button>
        </div>
      </div>
    );
  }
}
