import mime from "./mime";

/**
 * 获取文件的扩展名。
 * 如果文件名中包含扩展名，则提取扩展名；否则根据文件的MIME类型推断扩展名。
 *
 * @param file - 需要获取扩展名的文件对象。
 * @returns - 文件的扩展名，如果无法获取则返回null。
 */
export function getExtension(file: File) {
    const filename = file.name;
    const match = filename.match(/\.([^.]+)$/);
    if (match) {
        return match[1].toLowerCase();
    } else {
        // 没有扩展名，根据MIME类型推断
        const mimeType = file.type;
        if (mimeType.startsWith("image/")) {
            return mimeType.substring(6);
        } else if (mimeType.startsWith("audio/")) {
            // 常见音频MIME到扩展名映射
            const audioExtMap: Record<string, string> = {
                "audio/mpeg": "mp3",
                "audio/mp3": "mp3",
                "audio/wav": "wav",
                "audio/x-wav": "wav",
                "audio/wave": "wav",
                "audio/ogg": "ogg",
                "audio/flac": "flac",
                "audio/x-flac": "flac",
                "audio/mp4": "m4a",
                "audio/m4a": "m4a",
                "audio/x-m4a": "m4a",
                "audio/aac": "aac",
                "audio/opus": "opus",
                "audio/webm": "webm",
            };
            return audioExtMap[mimeType] || mimeType.substring(6);
        } else {
            return null;
        }
    }
}

export function getExtensionFromName(filename: string) {
    return filename.match(/\.([^.]+)$/)?.[1] || null;
}

 

export function getMimeTypeFromName(filename: string) {
    return mime.getType(filename)
}

export function addListenerForElements<T extends keyof HTMLElementEventMap>(elements: HTMLElement[], type: T, fn: (event: HTMLElementEventMap[T]) => void) {
    for (const ele of elements) {
        ele.addEventListener(type, fn);
    }
}
