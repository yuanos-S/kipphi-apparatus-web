// Web version of opener.ts - uses browser download instead of Tauri openPath

export function openPath(path: string, openWith?: string) {
    // In web version, we can't open filesystem paths.
    // This is a no-op. Use downloadFile from background.ts instead.
    console.warn("openPath is not supported in web version. Path:", path);
}
