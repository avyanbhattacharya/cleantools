import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  outDir: './dist',
  publicDir: './public',
  server: {
    host: '0.0.0.0',
    port: 3000
  }
});
