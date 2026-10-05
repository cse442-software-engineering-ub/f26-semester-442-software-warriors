import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/CSE442/2026-Fall/cse-442ab/",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://aptitude.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab',
        changeOrigin: true,
        secure: true,
      }
    }
  }
});
