export function isMobileDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isAppleDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
}

export function isHMOSDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /HarmonyOS|OpenHarmony|ArkWeb/.test(navigator.userAgent);
}