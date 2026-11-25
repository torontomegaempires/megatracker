import { useStore } from './state/store';
import { GameScreen } from './views/GameScreen';
import { SetupScreen } from './views/SetupScreen';

export function App() {
  const { game } = useStore();
  return game ? <GameScreen /> : <SetupScreen />;
}
