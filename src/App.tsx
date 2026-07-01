import { useState, useEffect } from 'react';
import { useStore, hydrateStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { PresentationView } from './components/PresentationView';

const SIDEBAR_COLLAPSED_KEY = 'canvas-slides-sidebar-collapsed';

function App() {
  const hydrated = useStore((s) => s.hydrated);
  const loadError = useStore((s) => s.loadError);
  const isPresenting = useStore((s) => s.isPresenting);
  const enterPresentation = useStore((s) => s.enterPresentation);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  useEffect(() => {
    void hydrateStore();
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  if (!hydrated) {
    return (
      <div className="app-loading">
        <span className="app-loading__text">Loading…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-loading">
        <span className="app-loading__text app-loading__text--error">{loadError}</span>
      </div>
    );
  }

  if (isPresenting) {
    return <PresentationView />;
  }

  return (
    <div className={`app ${sidebarCollapsed ? 'app--sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <main className="main">
        <button type="button" className="present-btn" onClick={() => enterPresentation()}>
          <PlayIcon />
          Present
        </button>
        <InfiniteCanvas />
      </main>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 2.5l7 4.5-7 4.5V2.5z" fill="currentColor" />
    </svg>
  );
}

export default App;
