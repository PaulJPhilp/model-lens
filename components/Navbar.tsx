'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NavbarProps {
  providerCount?: number;
  modelCount?: number;
  activeProviderCount?: number;
  activeModelCount?: number;
}

export function Navbar({ providerCount = 0, modelCount = 0, activeProviderCount = 0, activeModelCount = 0 }: NavbarProps) {

  const [mode, setMode] = useState('light');

  useEffect(() => {

    const stored = localStorage.getItem('mode');

    if (stored) {

      setMode(stored);

      document.documentElement.classList.toggle('dark', stored === 'dark');

    } else {

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      setMode(prefersDark ? 'dark' : 'light');

      document.documentElement.classList.toggle('dark', prefersDark);

    }

  }, []);

  const toggleMode = () => {

    const newMode = mode === 'light' ? 'dark' : 'light';

    setMode(newMode);

    document.documentElement.classList.toggle('dark', newMode === 'dark');

    localStorage.setItem('mode', newMode);

  };

  return (
    <nav className="p-2 border-b border-brand flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-sans font-bold text-primary">ModelLens</h1>
        <div className="flex gap-3 text-xs">
          <Link href="/" className="hover:text-primary transition-colors">
            Models
          </Link>
          <Link href="/filters" className="hover:text-primary transition-colors">
            Filters
          </Link>
        </div>
        <span className="text-xs text-muted-foreground">
          {activeProviderCount}/{providerCount} providers · {activeModelCount}/{modelCount} models
        </span>
      </div>
      <button onClick={toggleMode} className="bg-secondary p-1 rounded hover:bg-secondary/80 transition-colors text-sm">
        {mode === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
