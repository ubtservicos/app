import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Dynamic PWA Manifest Plugin
function dynamicManifestPlugin(mode: string) {
  const isHomologExplicit = 
    process.env.VITE_APP_ENV === "homolog" || 
    process.env.VITE_APP_ENV === "homologacao" ||
    process.env.VERCEL_URL?.includes("homolog") ||
    process.env.VERCEL_GIT_COMMIT_REF?.includes("homolog");

  const isProd = 
    !isHomologExplicit && (
      mode === "production" ||
      process.env.NODE_ENV === "production" ||
      process.env.VITE_APP_ENV === "production" ||
      process.env.VERCEL_ENV === "production"
    );

  const manifestData = {
    short_name: isProd ? "UBT" : "UBT Homolog",
    name: isProd ? "UBT — O Superapp do Trabalhador" : "UBT Homolog — O Superapp do Trabalhador",
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    start_url: "/",
    background_color: "#0B1B3E",
    theme_color: "#0B1B3E",
    display: "standalone",
    orientation: "portrait"
  };

  return {
    name: "dynamic-pwa-manifest",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith("/manifest.json")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.end(JSON.stringify(manifestData, null, 2));
          return;
        }
        next();
      });
    },
    generateBundle(this: any) {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifestData, null, 2),
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    dynamicManifestPlugin(mode),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    target: 'es2022',
    commonjsOptions: { transformMixedEsModules: true },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
}));
