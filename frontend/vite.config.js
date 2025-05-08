import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure base is set correctly
  server: {
    historyApiFallback: true, // Fix for dev mode
  },
});
