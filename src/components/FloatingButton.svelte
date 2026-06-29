<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Play, Pause, Undo2, Redo2, Save, Maximize, Minimize, Home, Keyboard } from "@lucide/svelte";
    import { toggleFullscreen, isFullscreen, isMobileDevice } from "#/userData";

    let isDragging = $state(false);
    let showPanel = $state(false);
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
        {#if showPanel}
            <div class="floating-panel">
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
        gap: 8px;
        background: rgba(40, 40, 60, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 12px 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.2s ease-out;
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
