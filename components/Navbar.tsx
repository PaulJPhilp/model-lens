'use client';

import { useEffect, useState } from 'react';

export function Navbar() {

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

    <nav className="p-4 border-b border-brand">

      <h1 className="text-xl font-sans font-bold text-primary">ModelLens</h1>

      <button onClick={toggleMode} className="ml-4 bg-secondary p-2 rounded">Toggle Mode ({mode})</button>

    </nav>

  );

}
