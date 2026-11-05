import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.VITE_HOST || "0.0.0.0";
  const port = Number(env.VITE_PORT || 5173);
  const proxy = {
    "/api": "http://127.0.0.1:4000",
  };

  return {
    plugins: [react()],
    server: { host, port, proxy },
    preview: { host, port, proxy },
  };
});
