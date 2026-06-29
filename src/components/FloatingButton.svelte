<script lang="ts">
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

    const shortcuts = [
        { key: "Space", desc: "播放/暂停" },
        { key: "R", desc: "放置事件节点对" },
        { key: "Q/W/E/R", desc: "放置音符(蓝/黄/红/长)" },
        { key: "Ctrl", desc: "切换至判定线列表" },
        { key: "滚轮", desc: "滚动时间轴" },
        { key: "Ctrl+滚轮", desc: "切换判定线" },
        { key: "Ctrl+S", desc: "保存谱面" },
        { key: "Tab", desc: "切换下个序列" },
        { key: "Shift+Tab", desc: "切换上个序列" },
        { key: "Z", desc: "撤销" },
        { key: "Y", desc: "重做" },
        { key: "Delete", desc: "删除选中项" },
        { key: "Esc", desc: "切换到谱面信息" },
    ];

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

    function handleStart(e: TouchEvent | MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        hasMoved = false;

        const point = "touches" in e ? e.touches[0] : e;
        startX = point.clientX;
        startY = point.clientY;
        startPosX = posX;
        startPosY = posY;

        if ("touches" in e) {
            document.addEventListener("touchmove", handleMove, { passive: false });
            document.addEventListener("touchend", handleEnd);
        } else {
            document.addEventListener("mousemove", handleMove);
            document.addEventListener("mouseup", handleEnd);
        }
    }

    function handleMove(e: TouchEvent | MouseEvent) {
        if (!isDragging) return;
        e.preventDefault();

        const point = "touches" in e ? e.touches[0] : e;
        const deltaX = point.clientX - startX;
        const deltaY = point.clientY - startY;

        if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
            hasMoved = true;
        }

        let newX = startPosX + deltaX;
        let newY = startPosY + deltaY;

        const btnSize = 56;
        newX = Math.max(10, Math.min(window.innerWidth - btnSize - 10, newX));
        newY = Math.max(60, Math.min(window.innerHeight - btnSize - 10, newY));

        posX = newX;
        posY = newY;
    }

    function handleEnd() {
        isDragging = false;

        localStorage.setItem("floatingBtnX", posX.toString());
        localStorage.setItem("floatingBtnY", posY.toString());

        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
    }

    function handleClick() {
        if (hasMoved) return;
        showPanel = !showPanel;
        showShortcuts = false;
    }

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
    <div class="floating-container" style="left: {posX}px; top: {posY}px;">
        {#if showPanel && !showShortcuts}
            <div class="floating-panel">
                <div class="panel-header">
                    <span class="panel-title">快捷操作</span>
                    <button class="shortcuts-toggle" onclick={() => { showShortcuts = true; }} title="快捷键">
                        <Info size={16} />
                    </button>
                </div>
                <div class="panel-actions">
                    <button class="panel-btn" onclick={() => doAction("playPause")} title="播放/暂停">
                        <Play size={20} />
                    </button>
                    <button class="panel-btn" onclick={() => doAction("undo")} title="撤销">
                        <Undo2 size={20} />
                    </button>
                    <button class="panel-btn" onclick={() => doAction("redo")} title="重做">
                        <Redo2 size={20} />
                    </button>
                    <button class="panel-btn" onclick={() => doAction("save")} title="保存">
                        <Save size={20} />
                    </button>
                    <button class="panel-btn" onclick={() => doAction("fullscreen")} title="全屏">
                        {#if fullscreen}
                            <Minimize size={20} />
                        {:else}
                            <Maximize size={20} />
                        {/if}
                    </button>
                    <button class="panel-btn" onclick={() => doAction("home")} title="首页">
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
            onmousedown={handleStart}
            ontouchstart={handleStart}
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
        gap: 12px;
    }

    .floating-btn {
        width: 56px;
        height: 56px;
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

        &:active {
            transform: scale(0.95);
        }

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
        border-radius: 16px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.2s ease-out;
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
        transition: background 0.2s;

        &:hover {
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
        transition: background 0.15s;

        &:hover {
            background: rgba(255, 255, 255, 0.05);
        }
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

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .panel-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, transform 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        &:active {
            transform: scale(0.95);
            background: rgba(102, 221, 255, 0.3);
        }
    }
</style>
