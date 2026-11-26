import { useState } from 'react';
import { takeJoinCode } from './state/shared';
import { useStore } from './state/store';
import { GameScreen } from './views/GameScreen';
import { SetupScreen } from './views/SetupScreen';

export function App() {
  const { game } = useStore();
  // A join link (/?join=CODE) opens the join sheet once, on whichever screen shows first.
  const [joinCode, setJoinCode] = useState(takeJoinCode);
  const handled = () => setJoinCode(null);
  return game ? <GameScreen joinCode={joinCode} onJoinHandled={handled} /> : <SetupScreen joinCode={joinCode} onJoinHandled={handled} />;
}
