// Web version of background.ts - replaces all Tauri FS operations with IndexedDB

import YAML from "yaml";

import { getExtensionFromName, getMimeTypeFromName } from "#/util";
import { Chart, type ChartDataKPA, type ChartDataKPA2, type ChartDataRPE } from "kipphi";
import { unzip } from "./uncompress";

// Base path for GitHub Pages deployment (set from respack.svelte.ts on init)
let APP_BASE = "";
export function setAppBase(b: string) { APP_BASE = b; }

export interface ChartMetadata {
    title: string;
    chart: string;
    music: string;
    illustration: string;
    type: "KPA1" | "KPA2" | "RPE";
    durationSecs: number;
}

export interface ChartHistoryEntry {
    time: number;
    summary: string;
    filename: string;
}

export enum ReturnType {
    u8,
    blob,
    arrayBuffer,
    imageBmp
}

export type NonImageReturnType = ReturnType.u8 | ReturnType.blob | ReturnType.arrayBuffer;

type TypeMap<RT extends ReturnType> = RT extends ReturnType.u8 ? Uint8Array<ArrayBuffer> :
RT extends ReturnType.blob ? Blob :
RT extends ReturnType.arrayBuffer ? ArrayBuffer :
RT extends ReturnType.imageBmp ? ImageBitmap :
null;

const returningFromU8 = async <RT extends ReturnType>(u8Arr: Uint8Array<ArrayBuffer>, type: RT, mime: string): Promise<TypeMap<RT> > =>
    type === ReturnType.u8 ? u8Arr as TypeMap<RT> :
    type === ReturnType.blob ? new Blob([u8Arr], { type: mime }) as TypeMap<RT> :
    type === ReturnType.arrayBuffer ? u8Arr.buffer as TypeMap<RT> :
    type === ReturnType.imageBmp ? await createImageBitmap(new Blob([u8Arr], { type: mime })) as TypeMap<RT> :
    null;

type ChartHistory = ChartHistoryEntry[];

// ============= IndexedDB Storage Layer =============

const DB_NAME = "kipphi-apparatus";
const DB_VERSION = 1;
const STORE_CHARTS = "charts";
const STORE_RESPACKS = "respacks";
const STORE_TRASH = "trash";

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_CHARTS)) {
                db.createObjectStore(STORE_CHARTS);
            }
            if (!db.objectStoreNames.contains(STORE_RESPACKS)) {
                db.createObjectStore(STORE_RESPACKS);
            }
            if (!db.objectStoreNames.contains(STORE_TRASH)) {
                db.createObjectStore(STORE_TRASH);
            }
        };
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(storeName: string, key: string): Promise<any> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

async function dbPut(storeName: string, key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(storeName: string, key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function dbExists(storeName: string, key: string): Promise<boolean> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getKey(key);
        req.onsuccess = () => resolve(req.result !== undefined);
        req.onerror = () => reject(req.error);
    });
}

async function dbGetAllKeys(storeName: string): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
    });
}

async function dbGetAll(storeName: string): Promise<{ key: string; value: any }[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const keysReq = store.getAllKeys();
        const valuesReq = store.getAll();
        let keys: string[];
        let values: any[];
        let done = 0;
        const check = () => {
            done++;
            if (done < 2) return;
            const result: { key: string; value: any }[] = [];
            for (let i = 0; i < keys.length; i++) {
                result.push({ key: keys[i] as string, value: values[i] });
            }
            resolve(result);
        };
        keysReq.onsuccess = () => { keys = keysReq.result as string[]; check(); };
        keysReq.onerror = () => reject(keysReq.error);
        valuesReq.onsuccess = () => { values = valuesReq.result; check(); };
        valuesReq.onerror = () => reject(valuesReq.error);
    });
}

// Helper: list "directory" entries (keys starting with prefix, next path segment only)
function listDir(keys: string[], prefix: string): string[] {
    const entries = new Set<string>();
    for (const key of keys) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const firstSegment = rest.split("/")[0];
        if (firstSegment) entries.add(firstSegment);
    }
    return [...entries];
}

// ============= Meta / Path helpers (kept for API compatibility) =============

// These are no longer real filesystem paths, just logical identifiers
export async function queryMeta() {
    return {
        APP_DATA_DIR: "(IndexedDB)",
        CHART_DIR: "charts/",
        TRASH_DIR: "trash/",
        RESPACK_DIR: "respacks/",
        DOWNLOAD_DIR: "(browser downloads)"
    }
}

export async function getPathOfChart(chartIdentifier: string) {
    return `charts/${chartIdentifier}`;
}

export async function getTexturePathOf(chartIdentifier: string) {
    return `charts/${chartIdentifier}/textures`;
}

// ============= Chart Queries =============

export async function queryCharts() {
    const allKeys = await dbGetAllKeys(STORE_CHARTS);
    const chartDirs = listDir(allKeys, "charts/");
    const chartInfos: {
        chartPath: string,
        identifier: string,
        title: string,
        image: Blob,
        type: "KPA1" | "KPA2" | "RPE",
        lastModified: number
    }[] = [];

    for (const name of chartDirs) {
        const metadataRaw = await dbGet(STORE_CHARTS, `charts/${name}/metadata.json`);
        if (!metadataRaw) continue;
        const metadataJson = JSON.parse(metadataRaw) as ChartMetadata;
        const illustrationData = await dbGet(STORE_CHARTS, `charts/${name}/${metadataJson.illustration}`);
        const history = await queryChartHistory(name);
        chartInfos.push({
            chartPath: metadataJson.chart,
            identifier: name,
            title: metadataJson.title,
            image: illustrationData instanceof Uint8Array
                ? new Blob([illustrationData], { type: `image/${getExtensionFromName(metadataJson.illustration)}` })
                : illustrationData instanceof Blob
                    ? illustrationData
                    : new Blob([], { type: "image/png" }),
            type: metadataJson.type,
            lastModified: history?.[history.length - 1]?.time ?? 0
        });
    }
    chartInfos.sort((a, b) => b.lastModified - a.lastModified);
    return chartInfos;
}

export async function queryChartMeta(chartId: string) {
    const raw = await dbGet(STORE_CHARTS, `charts/${chartId}/metadata.json`);
    if (!raw) throw new Error(`Metadata not found for chart ${chartId}`);
    return JSON.parse(raw) as ChartMetadata;
}

export async function queryChartHistory(chartId: string): Promise<ChartHistory> {
    const raw = await dbGet(STORE_CHARTS, `charts/${chartId}/history.json`);
    if (!raw) return null;
    try {
        const history = JSON.parse(raw) as ChartHistory;
        if (!Array.isArray(history)) return null;
        return history;
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error("History file is not a valid JSON:", raw);
            return null;
        }
        throw e;
    }
}

export async function saveChartMeta(chartId: string, metadata: ChartMetadata) {
    await dbPut(STORE_CHARTS, `charts/${chartId}/metadata.json`, JSON.stringify(metadata, null, 2));
}

async function saveChartHistoryEntry(chartId: string, entry: ChartHistoryEntry) {
    let history = await queryChartHistory(chartId);
    if (history) {
        history.push(entry);
    } else {
        history = [entry];
    }
    await dbPut(STORE_CHARTS, `charts/${chartId}/history.json`, JSON.stringify(history, null, 2));
}

export async function saveChart(chartId: string, chart: Chart, summary: string, beutify = false) {
    const chartMeta = await queryChartMeta(chartId);
    const chartStr = beutify ? JSON.stringify(chart.dumpKPA(), null, 2) : JSON.stringify(chart.dumpKPA());

    const date = new Date();
    const dateStr = date.toISOString()
        .replace(/\:/g, "-")
        .replace(/\./g, "_")
        .replace(/T/g, " ")
        .replace(/Z/g, "");
    const chartPath = `chart.${dateStr}.kpa2.json`;
    chartMeta.chart = chartPath;

    if (chartMeta.type !== "KPA2") {
        chartMeta.type = "KPA2";
    }

    await saveChartHistoryEntry(chartId, {
        summary,
        filename: chartPath,
        time: date.getTime()
    });

    await saveChartMeta(chartId, chartMeta);
    console.log("Chart saved to IndexedDB:", `charts/${chartId}/${chartPath}`);
    await dbPut(STORE_CHARTS, `charts/${chartId}/${chartPath}`, chartStr);
}

interface ChartStruct<RT extends NonImageReturnType = ReturnType.blob> {
    chart: Chart;
    music: TypeMap<RT>;
    illustration: TypeMap<RT>;
}

export async function getChartProject<RT extends NonImageReturnType = ReturnType.blob>(chartId: string, returning?: RT): Promise<ChartStruct<RT>> {
    const metadata = await queryChartMeta(chartId);
    const chartType = metadata.type;
    const musicPath = metadata.music;
    const illustrationPath = metadata.illustration;
    const chartDataRaw = await dbGet(STORE_CHARTS, `charts/${chartId}/${metadata.chart}`);
    if (!chartDataRaw) throw new Error(`Chart data not found: charts/${chartId}/${metadata.chart}`);
    const chartData = JSON.parse(typeof chartDataRaw === "string" ? chartDataRaw : new TextDecoder().decode(chartDataRaw)) as ChartDataRPE | ChartDataKPA | ChartDataKPA2;
    const chart = chartType === "RPE"
        ? Chart.fromRPEJSON(chartData as ChartDataRPE, metadata.durationSecs)
        : Chart.fromKPAJSON(chartData as ChartDataKPA | ChartDataKPA2);
    const music = await readAFileInChart(
        chartId,
        musicPath,
        getMimeTypeFromName(musicPath),
        returning
    );
    const illustration = await readAFileInChart(
        chartId,
        illustrationPath,
        getMimeTypeFromName(illustrationPath),
        returning
    );
    return {
        chart,
        music,
        illustration,
    }
}

export async function getChart(chartId: string): Promise<Chart> {
    const metadata = await queryChartMeta(chartId);
    const chartType = metadata.type;
    const chartDataRaw = await dbGet(STORE_CHARTS, `charts/${chartId}/${metadata.chart}`);
    if (!chartDataRaw) throw new Error(`Chart data not found: charts/${chartId}/${metadata.chart}`);
    const chartData = JSON.parse(typeof chartDataRaw === "string" ? chartDataRaw : new TextDecoder().decode(chartDataRaw)) as ChartDataRPE | ChartDataKPA | ChartDataKPA2;
    const chart = chartType === "RPE"
        ? Chart.fromRPEJSON(chartData as ChartDataRPE, metadata.durationSecs)
        : Chart.fromKPAJSON(chartData as ChartDataKPA | ChartDataKPA2);
    return chart;
}

export async function readAFileInChart<RT extends ReturnType = ReturnType.blob>(identifier: string, filename: string, mimeType: string, returning?: RT) {
    returning = returning || ReturnType.blob as RT;
    const data = await dbGet(STORE_CHARTS, `charts/${identifier}/${filename}`);
    if (!data) throw new Error(`File not found: charts/${identifier}/${filename}`);
    // Data may be stored as Uint8Array (binary) or string (text)
    const u8Arr = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
    return returningFromU8(u8Arr, returning, mimeType);
}

export async function readChart(identifier: string, filename: string) {
    const raw = await dbGet(STORE_CHARTS, `charts/${identifier}/${filename}`);
    if (!raw) throw new Error(`Chart not found: charts/${identifier}/${filename}`);
    return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ChartDataRPE | ChartDataKPA | ChartDataKPA2;
}

export async function saveAFileToChart(identifier: string, filename: string, blob: Blob) {
    const arrayBuffer = await blob.arrayBuffer();
    await dbPut(STORE_CHARTS, `charts/${identifier}/${filename}`, new Uint8Array(arrayBuffer));
}

export function parseInfoTxt(infoTxt: string) {
    const lines = infoTxt.split("\n");
    const info: Record<string, string>= {};
    for (const line of lines) {
        if (line.startsWith("#")) continue;
        if (line.trim() === "") continue;
        const [key, value] = line.split(":");
        if (!key || !value) {
            console.log(`Invalid line: '${line}'d`);
            continue;
        }
        info[key.trim()] = value.trim();
    }
    return info;
}

export function parseRawInfoTxt(raw: Uint8Array | ArrayBuffer) {
    let infoTxt: string;
    try {
        infoTxt = new TextDecoder("utf-8", {fatal: true}).decode(raw);
    } catch (error) {
        if (!(error instanceof TypeError)) {
            throw error;
        }
        infoTxt = new TextDecoder("gbk", {fatal: true}).decode(raw);
    }
    return parseInfoTxt(infoTxt);
}

export async function disposeChart(identifier: string) {
    // Move chart from charts store to trash store
    const allKeys = await dbGetAllKeys(STORE_CHARTS);
    const prefix = `charts/${identifier}/`;
    const entries: { key: string; value: any }[] = [];

    for (const key of allKeys) {
        if (key.startsWith(prefix)) {
            const value = await dbGet(STORE_CHARTS, key);
            entries.push({ key, value });
        }
    }

    // Copy to trash
    for (const entry of entries) {
        const trashKey = entry.key.replace("charts/", "trash/");
        await dbPut(STORE_TRASH, trashKey, entry.value);
    }

    // Delete from charts
    for (const entry of entries) {
        await dbDelete(STORE_CHARTS, entry.key);
    }
}

export async function getTextures(identifier: string): Promise<string[]> {
    const allKeys = await dbGetAllKeys(STORE_CHARTS);
    const texturePrefix = `charts/${identifier}/textures/`;
    const imagePattern = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
    const names = allKeys
        .filter(key => key.startsWith(texturePrefix))
        .map(key => key.slice(texturePrefix.length))
        .filter(name => name.match(imagePattern));
    if (!names.includes("line.png")) {
        names.push("line.png");
    }
    return names;
}

export async function uploadTexture(identifier: string, texture: File) {
    const arrayBuffer = await texture.arrayBuffer();
    await dbPut(STORE_CHARTS, `charts/${identifier}/textures/${texture.name}`, new Uint8Array(arrayBuffer));
}

export async function fetchTexture<RT extends ReturnType = ReturnType.imageBmp>(identifier: string, name: string, returning?: RT): Promise<TypeMap<RT> > {
    returning = returning || ReturnType.imageBmp as RT;

    // First check textures directory
    const textureKey = `charts/${identifier}/textures/${name}`;
    const texData = await dbGet(STORE_CHARTS, textureKey);
    if (texData) {
        const u8Arr = texData instanceof Uint8Array ? texData : new TextEncoder().encode(texData);
        return await returningFromU8(u8Arr, returning, getMimeTypeFromName(name));
    }

    // Then check chart root directory
    const rootKey = `charts/${identifier}/${name}`;
    const rootData = await dbGet(STORE_CHARTS, rootKey);
    if (rootData) {
        const u8Arr = rootData instanceof Uint8Array ? rootData : new TextEncoder().encode(rootData);
        // Also move to textures directory for next time
        try {
            await dbPut(STORE_CHARTS, textureKey, u8Arr);
        } catch {}
        return await returningFromU8(u8Arr, returning, getMimeTypeFromName(name));
    }

    return null;
}

// ============= Respack =============

export interface RespackEntry {
    pathname: string;
    shortPathname: string;
    name: string;
}

export async function queryRespackList() {
    const allKeys = await dbGetAllKeys(STORE_RESPACKS);
    const respackDirs = listDir(allKeys, "");
    const filtered: RespackEntry[] = [];

    for (const dirName of respackDirs) {
        const ymlContent = await dbGet(STORE_RESPACKS, `${dirName}/info.yml`);
        if (ymlContent) {
            try {
                const respackMetadata = YAML.parse(typeof ymlContent === "string" ? ymlContent : new TextDecoder().decode(ymlContent));
                if (respackMetadata.name) {
                    filtered.push({
                        pathname: dirName,
                        name: respackMetadata.name,
                        shortPathname: dirName
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
    return filtered;
}

export async function getFileInRespack(respackName: string, filename: string) {
    if (respackName === "Default") {
        return await (await fetch(`${APP_BASE}/default/${filename}`)).blob();
    }
    const data = await dbGet(STORE_RESPACKS, `${respackName}/${filename}`);
    if (!data) return null;
    if (data instanceof Uint8Array) {
        return new Blob([data]);
    }
    if (typeof data === "string") {
        return new Blob([data]);
    }
    return data;
}

export async function uploadRespack(respackName: string, zipFile: Blob) {
    const unzipped = await unzip(zipFile);
    if (!unzipped.success) {
        throw new Error("Decompression failed.")
    }
    // Check if respack already exists
    const existing = await dbGet(STORE_RESPACKS, `${respackName}/info.yml`);
    if (existing) {
        throw new Error("Occupied.");
    }
    for (const entry of unzipped.files) {
        await dbPut(STORE_RESPACKS, `${respackName}/${entry.name}`, new Uint8Array(entry.buffer));
    }
}

// ============= Download (Browser API) =============

export async function downloadFile(filename: string, file: Uint8Array, opens: boolean = false) {
    const blob = new Blob([file]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============= IndexedDB direct helpers for create/import pages =============

/**
 * Check if a chart with the given identifier already exists.
 */
export async function chartExists(chartId: string): Promise<boolean> {
    return await dbExists(STORE_CHARTS, `charts/${chartId}/metadata.json`);
}

/**
 * Save text data (e.g., metadata.json, chart JSON) for a chart.
 */
export async function saveTextFileToChart(chartId: string, filename: string, content: string): Promise<void> {
    await dbPut(STORE_CHARTS, `charts/${chartId}/${filename}`, content);
}

/**
 * Save binary data (e.g., music, illustration) for a chart.
 */
export async function saveBinaryFileToChart(chartId: string, filename: string, data: Uint8Array): Promise<void> {
    await dbPut(STORE_CHARTS, `charts/${chartId}/${filename}`, data);
}
