import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for environments where window.fetch is read-only but a library tries to polyfill it
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    try {
      Object.defineProperty(window, 'fetch', {
        value: originalFetch,
        writable: true,
        configurable: true
      });
    } catch (e) {
      // If defineProperty fails, try a simple assignment if possible, 
      // or just accept it's read-only and hope the library doesn't crash
    }
  }
} catch (e) {
  // Ignore top-level errors
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
