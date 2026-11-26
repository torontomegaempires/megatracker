import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SharedProvider } from './state/shared';
import { StoreProvider } from './state/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <SharedProvider>
        <App />
      </SharedProvider>
    </StoreProvider>
  </StrictMode>,
);
