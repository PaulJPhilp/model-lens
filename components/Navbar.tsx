'use client';

import { useRun } from '@effect/experimental';
import { Effect } from 'effect';
import { ModeService } from '../lib/services/ModeService';

export function Navbar() {
  const run = useRun();

  const toggleMode = () => {
    run(
      Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.toggleMode;
      })
    );
  };

  return (
    <nav className="p-4 border-b border-brand">
      <h1 className="text-xl font-sans font-bold text-primary">ModelLens</h1>
      <button onClick={toggleMode} className="ml-4 bg-secondary p-2 rounded">Toggle Mode</button>
    </nav>
  );
}
