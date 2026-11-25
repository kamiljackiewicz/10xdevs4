import { mergeConfig } from "astro/config";
import config from "../../astro.config.mjs";

const cacheDir = process.env.MEDLAB_HOOK_VITE_CACHE;
if (!cacheDir) throw new Error("Run this config through the agent hook to provide an isolated Vite cache.");

export default mergeConfig(config, { vite: { cacheDir } });
