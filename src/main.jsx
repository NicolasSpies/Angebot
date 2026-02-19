import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error('CRITICAL: Frontend failed to boot!', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        height: 100vh; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        background: #0f172a; 
        color: white; 
        font-family: system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">🚀 Boot Failure</h1>
        <p style="color: #94a3b8; max-width: 400px; margin-bottom: 24px;">
          The application encountered a critical error during startup.
        </p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #f87171; text-align: left; max-width: 90vw; overflow: auto;">
          ${error.message}<br/>
          ${error.stack ? `<pre style="margin-top: 8px; opacity: 0.7;">${error.stack}</pre>` : ''}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 24px; padding: 10px 20px; background: #3b82f6; border: none; border-radius: 6px; color: white; font-weight: 700; cursor: pointer;">
          Retry Launch
        </button>
      </div>
    `;
  }
}
