import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Demo 模式部署到 GitHub Pages 時，base 需對應 repo 名稱
const base = process.env.VITE_DEMO_MODE === 'true' ? '/renthouse-tracker/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
