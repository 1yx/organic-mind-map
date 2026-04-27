import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [vue()],
  server: {
    port: 4173,
    proxy: {
      "/api": "http://localhost:3210",
    },
  },
});
