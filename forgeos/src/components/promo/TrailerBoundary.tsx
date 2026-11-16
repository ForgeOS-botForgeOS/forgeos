// The trailer is optional: if its chunk fails to download (offline, a stale
// deploy) or it throws while rendering, it quietly gets out of the way
// instead of taking the app down with it.
import { Component, type ReactNode } from 'react';

export class TrailerBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    document.getElementById('root')?.removeAttribute('inert');
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
