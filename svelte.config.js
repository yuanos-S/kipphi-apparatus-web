import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

// For GitHub Pages: set BASE_PATH env var to your repo name, e.g. "/kipphi-apparatus-web/"
// For custom domain or root deployment: leave empty or set to "/"
const BASE_PATH = process.env.BASE_PATH || "";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    paths: {
      base: BASE_PATH,
    },
    alias: {
      "#": resolve("./src")
    }
  },
  compilerOptions: {
    experimental: {
      async: true
    }
  }
};

export default config;
