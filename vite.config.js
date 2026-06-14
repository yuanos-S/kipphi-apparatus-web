
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import fs from "fs";

const getNPMPackageVersion = async (/** @type {string} */packageName, stringified = true) => {
  const jsonContent = fs.readFileSync("./node_modules/" + packageName + "/package.json").toString();
  const version = JSON.parse(jsonContent).version;
  console.log(version)
  return stringified ? JSON.stringify(version) : version;
}

const getNPMPackageLicense = async (/** @type {string} */packageName) => {
  const jsonContent = fs.readFileSync("./node_modules/" + packageName + "/package.json").toString();
  const version = JSON.parse(jsonContent).license;
  return version;
}

const getDependencies = async () => {
  const jsonContent = fs.readFileSync("./package.json").toString();
  const dependencyVersions = JSON.parse(jsonContent).dependencies;
  /** @type {import("./dependency").Dependency[]} */
  const dependencies = []
  for (const name in dependencyVersions) {
    if (["kipphi", "kipphi-player", "kipphi-canvas-editor"].includes(name)) {
      continue;
    }
    dependencies.push({
      name,
      version: await getNPMPackageVersion(name, false),
      license: await getNPMPackageLicense(name)
    })
  }
  return JSON.stringify(dependencies);
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    minify: false,
  },
  define: {
    "__APP_VERSION": JSON.stringify("2.1.4-web"),
    "__PLAYER_VERSION": await getNPMPackageVersion("kipphi-player"),
    "__CANVAS_EDITOR_VERSION": await getNPMPackageVersion("kipphi-canvas-editor"),
    "__KIPPHI_VERSION": await getNPMPackageVersion("kipphi"),
    "__DEPENDENCIES": await getDependencies()
  }
}));