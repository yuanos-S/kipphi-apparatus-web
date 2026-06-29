import type {
    ChartMetadata,
    ChartHistoryEntry,
    NonImageReturnType,
    RespackEntry,
    ChartStruct,
} from "./background-indexeddb";
import { ReturnType } from "./background-indexeddb";

export type { ChartMetadata, ChartHistoryEntry, NonImageReturnType, RespackEntry, ChartStruct };
export { ReturnType };
export type { ReturnType as BGReturnType } from "./background-indexeddb";

type Impl = typeof import("./background-indexeddb");

let implPromise: Promise<Impl> | null = null;

function getImpl(): Promise<Impl> {
    if (!implPromise) {
        implPromise = import("./background-indexeddb");
    }
    return implPromise;
}

export async function setAppBase(b: string) {
    const impl = await getImpl();
    return impl.setAppBase(b);
}

export async function queryMeta() {
    const impl = await getImpl();
    return impl.queryMeta();
}

export async function getPathOfChart(chartIdentifier: string) {
    const impl = await getImpl();
    return impl.getPathOfChart(chartIdentifier);
}

export async function getTexturePathOf(chartIdentifier: string) {
    const impl = await getImpl();
    return impl.getTexturePathOf(chartIdentifier);
}

export async function queryCharts() {
    const impl = await getImpl();
    return impl.queryCharts();
}

export async function queryChartMeta(chartId: string) {
    const impl = await getImpl();
    return impl.queryChartMeta(chartId);
}

export async function queryChartHistory(chartId: string) {
    const impl = await getImpl();
    return impl.queryChartHistory(chartId);
}

export async function saveChartMeta(chartId: string, metadata: ChartMetadata) {
    const impl = await getImpl();
    return impl.saveChartMeta(chartId, metadata);
}

export async function saveChart(chartId: string, chart: any, summary: string, beutify = false) {
    const impl = await getImpl();
    return impl.saveChart(chartId, chart, summary, beutify);
}

export async function getChartProject(chartId: string, returning?: any) {
    const impl = await getImpl();
    return impl.getChartProject(chartId, returning);
}

export async function getChart(chartId: string) {
    const impl = await getImpl();
    return impl.getChart(chartId);
}

export async function readAFileInChart(identifier: string, filename: string, mimeType: string, returning?: any) {
    const impl = await getImpl();
    return impl.readAFileInChart(identifier, filename, mimeType, returning);
}

export async function readChart(identifier: string, filename: string) {
    const impl = await getImpl();
    return impl.readChart(identifier, filename);
}

export async function saveAFileToChart(identifier: string, filename: string, blob: Blob) {
    const impl = await getImpl();
    return impl.saveAFileToChart(identifier, filename, blob);
}

export function parseInfoTxt(infoTxt: string) {
    return parseInfoTxtSync(infoTxt);
}

export function parseRawInfoTxt(raw: Uint8Array | ArrayBuffer) {
    return parseRawInfoTxtSync(raw);
}

function parseInfoTxtSync(infoTxt: string) {
    const lines = infoTxt.split("\n");
    const info: Record<string, string> = {};
    for (const line of lines) {
        if (line.startsWith("#")) continue;
        if (line.trim() === "") continue;
        const [key, value] = line.split(":");
        if (!key || !value) continue;
        info[key.trim()] = value.trim();
    }
    return info;
}

function parseRawInfoTxtSync(raw: Uint8Array | ArrayBuffer) {
    let infoTxt: string;
    try {
        infoTxt = new TextDecoder("utf-8", { fatal: true }).decode(raw);
    } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        infoTxt = new TextDecoder("gbk", { fatal: true }).decode(raw);
    }
    return parseInfoTxtSync(infoTxt);
}

export async function disposeChart(identifier: string) {
    const impl = await getImpl();
    return impl.disposeChart(identifier);
}

export async function getTextures(identifier: string) {
    const impl = await getImpl();
    return impl.getTextures(identifier);
}

export async function uploadTexture(identifier: string, texture: File) {
    const impl = await getImpl();
    return impl.uploadTexture(identifier, texture);
}

export async function fetchTexture(identifier: string, name: string, returning?: any) {
    const impl = await getImpl();
    return impl.fetchTexture(identifier, name, returning);
}

export async function queryRespackList() {
    const impl = await getImpl();
    return impl.queryRespackList();
}

export async function getFileInRespack(respackName: string, filename: string) {
    const impl = await getImpl();
    return impl.getFileInRespack(respackName, filename);
}

export async function uploadRespack(respackName: string, zipFile: Blob) {
    const impl = await getImpl();
    return impl.uploadRespack(respackName, zipFile);
}

export async function downloadFile(filename: string, file: Uint8Array, opens = false) {
    const impl = await getImpl();
    return impl.downloadFile(filename, file, opens);
}

export async function chartExists(chartId: string) {
    const impl = await getImpl();
    return impl.chartExists(chartId);
}

export async function saveTextFileToChart(chartId: string, filename: string, content: string) {
    const impl = await getImpl();
    return impl.saveTextFileToChart(chartId, filename, content);
}

export async function saveBinaryFileToChart(chartId: string, filename: string, data: Uint8Array) {
    const impl = await getImpl();
    return impl.saveBinaryFileToChart(chartId, filename, data);
}

export type { TrashEntry } from "./background-indexeddb";

export async function queryTrash() {
    const impl = await getImpl();
    return impl.queryTrash();
}

export async function restoreFromTrash(identifier: string) {
    const impl = await getImpl();
    return impl.restoreFromTrash(identifier);
}

export async function permanentlyDeleteFromTrash(identifier: string) {
    const impl = await getImpl();
    return impl.permanentlyDeleteFromTrash(identifier);
}

export async function emptyTrash() {
    const impl = await getImpl();
    return impl.emptyTrash();
}
