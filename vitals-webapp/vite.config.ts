import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
<<<<<<< HEAD
import tailwindcss from '@tailwindcss/vite'
=======
>>>>>>> acbd4ef55a9c86a137187e0c9cee42942191bcdb

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
<<<<<<< HEAD
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
=======
    babel({ presets: [reactCompilerPreset()] })
>>>>>>> acbd4ef55a9c86a137187e0c9cee42942191bcdb
  ],
})
