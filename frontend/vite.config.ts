import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In production the Amplify rewrite in amplify-rewrites.json does this job.
    proxy: { "/api": "http://localhost:8000" },
  },
});
