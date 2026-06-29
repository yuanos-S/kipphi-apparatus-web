<script lang="ts">
    /**
     * 移动端悬浮快捷键按钮
     * - 支持拖拽移动（pointer events，兼容 Safari）
     * - 点击展开快捷操作面板
     * - 可切换查看快捷键列表
     * - PC端自动隐藏
     * - 自动避开安全区域（刘海屏等）
     */
    import { onMount, onDestroy } from "svelte";
    import { Play, Pause, Undo2, Redo2, Save, Maximize, Minimize, Home, Keyboard, X, Info } from "@lucide/svelte";
    import { toggleFullscreen, isFullscreen, isMobileDevice } from "#/userData";

    let isDragging = $state(false);
    let showPanel = $state(false);
    let showShortcuts = $state(false);
    let posX = $state(20);
    let posY = $state(100);
    let isMobile = $state(false);
    let fullscreen = $state(false);

    let startX = 0;
    let startY = 0;
    let startPosX = 0;
    let startPosY = 0;
    let dragThreshold = 5;
    let hasMoved = false;
    let btnSize = 52;

    /**
     * 快捷键列表
     * 展示编辑器中可用的键盘快捷键
     */
    const shortcuts = [
        { key: "Space", desc: "播放/暂停" },
        { key: "Ctrl+Z", desc: "撤销" },
        { key: "Ctrl+Y", desc: "重做" },
        { key: "Ctrl+S", desc: "保存" },
        { key: "F11", desc: "全屏" },
        { key: "1-9", desc: "切换工具" },
        { key: "滚轮", desc: "缩放时间轴" },
        { key: "方向键", desc: "移动音符" },
        { key: "Delete", desc: "删除选中" },
        { key: "Esc", desc: "取消选择" },
    ];

    let {
        onPlayPause,
        onUndo,
        onRedo,
        onSave,
        onHome,
    }: {
        onPlayPause?: () => void;
        onUndo?: () => void;
        onRedo?: () => void;
        onSave?: () => void;
        onHome?: () => void;
    } = $props();

    onMount(() => {
        isMobile = isMobileDevice();

        const savedX = localStorage.getItem("floatingBtnX");
        const savedY = localStorage.getItem("floatingBtnY");
        if (savedX) posX = parseInt(savedX);
        if (savedY) posY = parseInt(savedY);

        window.addEventListener("resize", handleResize);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    });

    onDestroy(() => {
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    });

    function handleResize() {
        isMobile = isMobileDevice();
    }

    function handleFullscreenChange() {
        fullscreen = isFullscreen();
    }

    /** 获取安全区域边距 */
    function getSafeInsets() {
        const style = getComputedStyle(document.documentElement);
        const top = parseInt(style.getPropertyValue("--safe-top")) || 0;
        const bottom = parseInt(style.getPropertyValue("--safe-bottom")) || 0;
        const left = parseInt(style.getPropertyValue("--safe-left")) || 0;
        const right = parseInt(style.getPropertyValue("--safe-right")) || 0;
        return { top, bottom, left, right };
    }

    /** 限制位置在视口内 */
    function clampPosition(x: number, y: number) {
        const insets = getSafeInsets();
        const margin = 10;
        const maxX = window.innerWidth - btnSize - margin - insets.right;
        const maxY = window.innerHeight - btnSize - margin - insets.bottom;
        const minX = margin + insets.left;
        const minY = 60 + insets.top;
        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y)),
        };
    }

    /** pointerdown 开始拖动 */
    function handlePointerDown(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        startPosX = posX;
        startPosY = posY;
    }

    /** pointermove 拖动中 */
    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;
        e.preventDefault();

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
            hasMoved = true;
        }

        const clamped = clampPosition(startPosX + deltaX, startPosY + deltaY);
        posX = clamped.x;
        posY = clamped.y;
    }

    /** pointerup 拖动结束 */
    function handlePointerUp() {
        isDragging = false;
        localStorage.setItem("floatingBtnX", posX.toString());
        localStorage.setItem("floatingBtnY", posY.toString());
    }

    /** 点击按钮 */
    function handleClick() {
        if (hasMoved) return;
        showPanel = !showPanel;
        showShortcuts = false;
    }

    /** 执行操作 */
    function doAction(action: string) {
        showPanel = false;
        switch (action) {
            case "playPause":
                onPlayPause?.();
                break;
            case "undo":
                onUndo?.();
                break;
            case "redo":
                onRedo?.();
                break;
            case "save":
                onSave?.();
                break;
            case "fullscreen":
                toggleFullscreen().then(() => {
                    fullscreen = isFullscreen();
                });
                break;
            case "home":
                onHome?.();
                break;
        }
    }
</script>

{#if isMobile}
    <div
        class="floating-container"
        style="left: {posX}px; top: {posY}px;"
    >
        {#if showPanel && !showShortcuts}
            <div class="floating-panel">
                <div class="panel-header">
                    <span class="panel-title">快捷操作</span>
                    <button class="shortcuts-toggle" onclick={() => { showShortcuts = true; }} title="快捷键">
                        <Info size={16} />
                    </button>
                </div>
                <div class="panel-actions">
                    <button
                        class="panel-btn"
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={() => doAction("playPause")}
                        title="播放/暂停"
                    >
                        <Play size={20} />
                    </button>
                    <button
                        class="panel-btn"
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={() => doAction("undo")}
                        title="撤销"
                    >
                        <Undo2 size={20} />
                    </button>
                    <button
                        class="panel-btn"
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={() => doAction("redo")}
                        title="重做"
                    >
                        <Redo2 size={20} />
                    </button>
                    <button
                        class="panel-btn"
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={() => doAction("save")}
                        title="保存"
                    >
                        <Save size={20} />
                    </button>
                    <button
                        class="panel-btn"
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={() => doAction("fullscreen")}
                        title="全屏"
                    >
                        {#if fullscreen}
                            <Minimize size={20} />
                        {:else}
                            <Maximize size={20} />
                        {/if}
                    </button>
                    <button
                        class="panel-btn"
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={() => doAction("home")}
                        title="首页"
                    >
                        <Home size={20} />
                    </button>
                </div>
            </div>
        {/if}

        {#if showPanel && showShortcuts}
            <div class="floating-panel shortcuts-panel">
                <div class="panel-header">
                    <span class="panel-title">快捷键</span>
                    <button class="shortcuts-toggle" onclick={() => { showShortcuts = false; }} title="返回">
                        <X size={16} />
                    </button>
                </div>
                <div class="shortcuts-list">
                    {#each shortcuts as s}
                        <div class="shortcut-item">
                            <kbd class="shortcut-key">{s.key}</kbd>
                            <span class="shortcut-desc">{s.desc}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <button
            class="floating-btn"
            class:dragging={isDragging}
            onpointerdown={handlePointerDown}
            onpointermove={handlePointerMove}
            onpointerup={handlePointerUp}
            onpointercancel={handlePointerUp}
            onclick={handleClick}
        >
            <Keyboard size={24} />
        </button>
    </div>
{/if}

<style lang="less">
    .floating-container {
        position: fixed;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        /* Safari 性能优化 */
        will-change: left, top;
        -webkit-transform: translateZ(0);
    }

    .floating-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66ddff 0%, #55ccee 100%);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(102, 221, 255, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;

        &.dragging {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(102, 221, 255, 0.6);
        }
    }

    .floating-panel {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: rgba(40, 40, 60, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        animation: fpSlideIn 0.2s ease-out;
    }

    @keyframes fpSlideIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 4px 4px 4px;
        margin-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .panel-title {
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        font-weight: 500;
    }

    .shortcuts-toggle {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;

        &:active {
            background: rgba(255, 255, 255, 0.2);
        }
    }

    .panel-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .shortcuts-panel {
        width: 220px;
        max-height: 60vh;
        overflow-y: auto;
    }

    .shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 50vh;
        overflow-y: auto;
    }

    .shortcut-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 6px;
        border-radius: 6px;
    }

    kbd.shortcut-key {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(102, 221, 255, 0.2);
        border: 1px solid rgba(102, 221, 255, 0.3);
        color: #6df;
        font-family: monospace;
        font-size: 11px;
        white-space: nowrap;
    }

    .shortcut-desc {
        color: rgba(255, 255, 255, 0.8);
        font-size: 11px;
        white-space: nowrap;
    }

    .panel-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;

        &:active {
            background: rgba(102, 221, 255, 0.3);
        }
    }
</style>