import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React plugin enables the automatic JSX runtime used by App.jsx.
export default defineConfig({
  plugins: [react()],
  base: './',
});
