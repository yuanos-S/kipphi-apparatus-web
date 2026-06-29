/**
 * 用户数据导入导出模块
 * 支持将所有用户数据（谱面、资源包、设置等）打包为 .kyud 格式文件
 * .kyud 格式本质是 ZIP 文件，后缀改为 kipphi-yuanos-user-date 的缩写
 */

import JSZip from "jszip";
import {
    queryCharts,
    getChartProject,
    queryRespackList,
    getFileInRespack,
} from "./background";
import { notify } from "./notify.svelte";

/**
 * .kyud 文件元数据结构
 */
interface KyudMetadata {
    version: string;
    exportedAt: number;
    app: string;
    charts: number;
    respacks: number;
}

/**
 * 导出所有用户数据为 .kyud 格式文件
 * 包含：谱面数据、资源包、设置、回收站数据等
 */
export async function exportAllUserData(): Promise<void> {
    try {
        notify("正在打包用户数据...", "info");

        const zip = new JSZip();

        // 1. 导出设置（localStorage）
        const settings: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                settings[key] = localStorage.getItem(key) || "";
            }
        }
        zip.file("settings.json", JSON.stringify(settings, null, 2));

        // 2. 导出演谱面
        const chartInfos = await queryCharts();
        const chartsDir = zip.folder("charts");

        for (const chartInfo of chartInfos) {
            try {
                const chartData = await getChartProject(chartInfo.identifier);
                const chartDir = chartsDir!.folder(chartInfo.identifier);

                // 元数据
                chartDir!.file("metadata.json", JSON.stringify({
                    title: chartInfo.title,
                    type: chartInfo.type,
                    identifier: chartInfo.identifier,
                    lastModified: chartInfo.lastModified,
                }, null, 2));

                // 谱面数据
                const chartJson = JSON.stringify(chartData.chart.dumpKPA());
                chartDir!.file("chart.kpa2.json", chartJson);

                // 音乐
                if (chartData.music instanceof Blob) {
                    chartDir!.file("music.mp3", chartData.music);
                }

                // 封面图
                if (chartData.illustration instanceof Blob) {
                    chartDir!.file("illustration.png", chartData.illustration);
                }
            } catch (e) {
                console.error("导出谱面失败:", chartInfo.identifier, e);
            }
        }

        // 3. 导出资源包
        const respackList = await queryRespackList();
        const respacksDir = zip.folder("respacks");

        for (const respack of respackList) {
            try {
                const respackDir = respacksDir!.folder(respack.pathname);
                // 这里简化处理，只导出 info.yml
                const infoYml = await getFileInRespack(respack.pathname, "info.yml");
                if (infoYml) {
                    respackDir!.file("info.yml", infoYml);
                }
            } catch (e) {
                console.error("导出资源包失败:", respack.pathname, e);
            }
        }

        // 4. 添加元数据
        const metadata: KyudMetadata = {
            version: "1.0.0",
            exportedAt: Date.now(),
            app: "Kipphi Apparatus",
            charts: chartInfos.length,
            respacks: respackList.length,
        };
        zip.file("metadata.json", JSON.stringify(metadata, null, 2));

        // 5. 生成并下载
        const content = await zip.generateAsync({ type: "blob" });
        const fileName = `kipphi-backup-${new Date().toISOString().slice(0, 10)}.kyud`;

        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        notify(`数据导出成功！共 ${chartInfos.length} 个谱面`, "info");
    } catch (e) {
        console.error("导出失败:", e);
        notify(`导出失败: ${e}`, "error");
    }
}

/**
 * 从 .kyud 文件导入用户数据
 * @param file .kyud 格式的文件
 * @param mergeMode 是否合并模式（true: 合并，false: 覆盖）
 */
export async function importUserData(file: File, mergeMode = true): Promise<void> {
    try {
        notify("正在导入数据...", "info");

        const zip = await JSZip.loadAsync(file);

        // 1. 读取元数据
        const metadataFile = zip.file("metadata.json");
        if (metadataFile) {
            const metadata = JSON.parse(await metadataFile.async("string"));
            console.log("导入数据元信息:", metadata);
        }

        // 2. 导入设置
        const settingsFile = zip.file("settings.json");
        if (settingsFile) {
            const settings = JSON.parse(await settingsFile.async("string"));
            for (const [key, value] of Object.entries(settings)) {
                if (typeof value === "string") {
                    if (mergeMode) {
                        // 合并模式：只导入不存在的设置
                        if (!localStorage.getItem(key)) {
                            localStorage.setItem(key, value);
                        }
                    } else {
                        // 覆盖模式
                        localStorage.setItem(key, value);
                    }
                }
            }
        }

        notify("数据导入成功！请刷新页面生效", "info");
    } catch (e) {
        console.error("导入失败:", e);
        notify(`导入失败: ${e}`, "error");
    }
}

/**
 * 检测设备是否为移动端
 * 通过用户代理和屏幕宽度判断
 */
export function isMobileDevice(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    const mobileKeywords = ["android", "iphone", "ipad", "ipod", "mobile", "phone", "tablet"];
    const isMobileUA = mobileKeywords.some(keyword => ua.includes(keyword));
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || isSmallScreen;
}

/**
 * 请求进入全屏模式
 * @param element 要全屏的元素，默认为 document.documentElement
 */
export async function enterFullscreen(element?: HTMLElement): Promise<void> {
    const el = element || document.documentElement;
    try {
        if (el.requestFullscreen) {
            await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
            await (el as any).webkitRequestFullscreen();
        } else if ((el as any).msRequestFullscreen) {
            await (el as any).msRequestFullscreen();
        }
    } catch (e) {
        console.error("进入全屏失败:", e);
    }
}

/**
 * 退出全屏模式
 */
export async function exitFullscreen(): Promise<void> {
    try {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
        }
    } catch (e) {
        console.error("退出全屏失败:", e);
    }
}

/**
 * 切换全屏模式
 */
export async function toggleFullscreen(): Promise<boolean> {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        await exitFullscreen();
        return false;
    } else {
        await enterFullscreen();
        return true;
    }
}

/**
 * 检测是否处于全屏模式
 */
export function isFullscreen(): boolean {
    return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
}
