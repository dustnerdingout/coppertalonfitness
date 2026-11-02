import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' lets the build run from any host or subfolder (Vercel, Netlify, GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
})
