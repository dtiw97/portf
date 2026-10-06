import { defineConfig } from "astro/config";

export default defineConfig({
  // Hover-prefetch project pages so the intro scene starts without a network wait.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  build: { inlineStylesheets: "always" },
});
