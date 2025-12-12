import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente dalla directory corrente
  // process.cwd() è necessario in ambiente Node locale
  // Fix: Cast process to any to avoid TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill di process.env per compatibilità con il codice esistente
      // che usa process.env.API_KEY invece di import.meta.env
      'process.env': env
    },
    server: {
      port: 3000,
      open: true
    }
  };
});