import { Component, type ReactNode } from 'react';
import { exportData } from '../lib/backup';

// Last line of defence: a render error shows a friendly recovery screen (with a
// data export, since all progress is local) instead of a blank white app.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ForgeOS crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="text-4xl">🛠️</div>
        <div>
          <h1 className="text-xl font-extrabold">Something broke</h1>
          <p className="mt-1 text-sm text-muted">A screen hit an error. Your data is safe on this device — reload to continue.</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <button onClick={() => location.reload()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black">Reload</button>
          <button onClick={() => exportData()} className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm">Export a backup first</button>
        </div>
      </div>
    );
  }
}
