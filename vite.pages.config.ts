import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'pages',base:'/durian-orchard-/',plugins:[react()],build:{outDir:'../docs',assetsDir:'pages-assets',emptyOutDir:false}});
