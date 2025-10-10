import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es',
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist")) return "pdfjs-dist";
            if (id.includes("tesseract.js")) return "tesseract.js";
            if (id.includes("html2canvas")) return "html2canvas";
            if (id.includes("recharts")) return "recharts";
            return "vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
