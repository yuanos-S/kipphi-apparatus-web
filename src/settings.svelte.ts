/**
 * Kipphi Apparatus 全局设置管理
 * 使用 localStorage 持久化用户设置
 * 所有设置项通过 getter/setter 实现响应式和持久化
 */
export const KPASettings = $state({
    // ==================== 编辑器设置 ====================
    
    /** 是否使用 RPE 缓动 ID */
    get useRpeEasingId() {
        return !!localStorage.getItem('useRpeEasingId')
    },
    set useRpeEasingId(value: boolean) {
        localStorage.setItem('useRpeEasingId', value ? '1' : '');
    },

    // ==================== 语言设置 ====================
    
    /** 当前语言 */
    get lang() {
        return localStorage.getItem('lang') || ''
    },
    set lang(value: string) {
        localStorage.setItem('lang', value);
    },

    // ==================== 自动保存设置 ====================
    
    /** 是否启用自动保存 */
    get autosaveEnabled() {
        const it = localStorage.getItem('autosaveEnabled')
        return it === null ? true : !!it;
    },
    set autosaveEnabled(value: boolean) {
        localStorage.setItem('autosaveEnabled', value ? '1' : '');
    },

    /** 自动保存间隔（秒） */
    get autosaveInterval() {
        const it = localStorage.getItem('autosaveInterval')
        return it === null ? 60 : parseInt(it);
    },
    set autosaveInterval(value: number) {
        localStorage.setItem('autosaveInterval', value.toString());
    },

    // ==================== 资源包设置 ====================
    
    /** 当前使用的资源包 */
    get respack() {
        const it = localStorage.getItem("respack");
        return it || "Default";
    },
    set respack(value: string) {
        localStorage.setItem("respack", value)
    },

    // ==================== 播放器设置 ====================
    
    /** 播放器画布高度 */
    get playerHeight() {
        const it = localStorage.getItem("playerHeight");
        return parseInt(it) || 900
    },
    set playerHeight(value: number) {
        localStorage.setItem("playerHeight", value + "");
    },

    /** 是否使用 RPE 风格滚轮操作 */
    get useRpeWheel() {
        const it = localStorage.getItem("usesRpeWheel");
        return it === null ? true : it === "1";
    },
    set useRpeWheel(value: boolean) {
        localStorage.setItem("usesRpeWheel", value ? "1" : "");
    },

    /** 基础偏移时间（秒） */
    get baseOffset() {
        const it = localStorage.getItem("baseOffset");
        return it === null ? 0.036 : parseFloat(it);
    },
    set baseOffset(value: number) {
        localStorage.setItem("baseOffset", value.toString());
    },

    /** 回放补偿时间（秒） */
    get replayCompensation() {
        const it = localStorage.getItem("replayCompensation");
        return it === null ? 0 : parseFloat(it);
    },
    set replayCompensation(value: number) {
        localStorage.setItem("replayCompensation", value.toString());
    },

    /** 渲染偏移时间（秒） */
    get renderingOffset() {
        const it = localStorage.getItem("renderingOffset");
        return it === null ? -0.1 : parseFloat(it);
    },
    set renderingOffset(value: number) {
        localStorage.setItem("renderingOffset", value.toString());
    },

    // ==================== 移动端设置 ====================
    
    /** 字体大小缩放比例 (0.8 - 1.5) */
    get fontSizeScale() {
        const it = localStorage.getItem("fontSizeScale");
        return it === null ? 1 : parseFloat(it);
    },
    set fontSizeScale(value: number) {
        localStorage.setItem("fontSizeScale", value.toString());
        // 应用到根元素
        document.documentElement.style.setProperty('--font-size-scale', value.toString());
    },

    /** 是否启用自动全屏（移动端） */
    get autoFullscreen() {
        const it = localStorage.getItem("autoFullscreen");
        return it === null ? false : it === "1";
    },
    set autoFullscreen(value: boolean) {
        localStorage.setItem("autoFullscreen", value ? "1" : "");
    },

    /** 移动端悬浮窗位置 X */
    get floatingBtnX() {
        const it = localStorage.getItem("floatingBtnX");
        return it === null ? 20 : parseInt(it);
    },
    set floatingBtnX(value: number) {
        localStorage.setItem("floatingBtnX", value.toString());
    },

    /** 移动端悬浮窗位置 Y */
    get floatingBtnY() {
        const it = localStorage.getItem("floatingBtnY");
        return it === null ? 100 : parseInt(it);
    },
    set floatingBtnY(value: number) {
        localStorage.setItem("floatingBtnY", value.toString());
    },

    // ==================== 引导设置 ====================
    
    /** 是否为首次访问（用于显示引导页面） */
    get firstVisit() {
        return localStorage.getItem("firstVisitDone") === null;
    },
    set firstVisitDone(value: boolean) {
        if (value) {
            localStorage.setItem("firstVisitDone", "1");
        } else {
            localStorage.removeItem("firstVisitDone");
        }
    },

    /** IP 定位是否已执行（避免重复请求） */
    get ipLocaleDetected() {
        return localStorage.getItem("ipLocaleDetected") === "1";
    },
    set ipLocaleDetected(value: boolean) {
        localStorage.setItem("ipLocaleDetected", value ? "1" : "");
    },

    // ==================== 外观设置 ====================
    
    /** 开关样式：auto(自动检测) | apple(苹果风格) | hmos(鸿蒙风格) | classic(经典风格) */
    get toggleStyle() {
        return localStorage.getItem("toggleStyle") || "auto";
    },
    set toggleStyle(value: string) {
        localStorage.setItem("toggleStyle", value);
    },
})