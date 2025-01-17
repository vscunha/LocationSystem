import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      host: "vrbseguro.online",
      protocol: "wss", // Use WebSocket Secure since you're using HTTPS
    },
    host: true, // Allow access from external networks
  },
});
