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
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist")) return "pdfjs-dist";
            if (id.includes("tesseract.js")) return "tesseract.js";
            if (id.includes("html2canvas")) return "html2canvas";
            if (id.includes("recharts")) return "recharts";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("lucide-react")) return "lucide-react";
            if (id.includes("react")) return "react";
            if (id.includes("@radix-ui")) return "radix-ui";
            if (id.includes("jspdf")) return "jspdf";
            if (id.includes("@tanstack/react-query")) return "react-query";
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
