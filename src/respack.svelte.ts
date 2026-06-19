import { Respack } from "kipphi-player";
import { unzip } from "./uncompress";
import { getFileInRespack, setAppBase } from "./background";
import { KPASettings } from "./settings.svelte";
import { writable, type Writable } from "svelte/store";
import { base } from "$app/paths";
import { get } from "svelte/store";

// Initialize base path for background.ts fetch calls
setAppBase(base);

export let respack: Respack;
export let respackId: Writable<string> = writable("Default");

// 缓存已 fetch 的默认资源包文件，避免重复网络请求
const defaultRespackCache = new Map<string, Blob>();

export async function useDefaultRespack() {
    respackId.set("Default")
    respack = await Respack.loadFromPhira(
        async (filename) => {
            if (filename.endsWith(".ogg")) {
                return null;
            }
            // 检查缓存
            const cached = defaultRespackCache.get(filename);
            if (cached) {
                return cached;
            }
            const res = await fetch(`${base}/default/${filename}`);
            if (!res.ok) {
                return null;
            }
            const blob = await res.blob();
            defaultRespackCache.set(filename, blob);
            return blob;
        }
    );
    KPASettings.respack = "Default";
}

export async function useUserRespack(respackName: string) {
    respackId.set(respackName);
    respack = await Respack.loadFromPhira(
        async (filename) => {
            return await getFileInRespack(respackName, filename);
        }
    )
    KPASettings.respack = respackName
}

export async function useRespack(respackName: string) {
    if (respackName === "Default") {
        return await useDefaultRespack(); 
    }
    return await useUserRespack(respackName);
}

// 预加载默认资源包（在首页时就开始加载，编辑器打开时直接用缓存）
let prom = useRespack(KPASettings.respack);

export async function waitRespack() {
    await prom;
}
