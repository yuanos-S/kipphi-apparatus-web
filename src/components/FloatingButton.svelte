<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Play, Pause, RotateCcw, Highlighter, Copy, Lock, Unlock, X } from "@lucide/svelte";
    import { _ } from "#/i18n";
    import type { NoteType } from "kipphi";

    let {
        onPlayPause = () => {},
        onUndo = () => {},
        onRedo = () => {},
        onNoteTypeSelect = (_type: NoteType) => {},
        placementActive = false,
        isPlaying = false,
        onSave = () => {},
        onFullscreen = () => {},
    }: {
        onPlayPause?: () => void;
        onUndo?: () => void;
        onRedo?: () => void;
        onNoteTypeSelect?: (type: NoteType) => void;
        placementActive?: boolean;
        isPlaying?: boolean;
        onSave?: () => void;
        onFullscreen?: () => void;
    } = $props();

    let panelOpen = $state(false);
    let posX = $state(typeof window !== "undefined" ? window.innerWidth - 60 : 16);
    let posY = $state(typeof window !== "undefined" ? window.innerHeight - 180 : 16);
    let dragging = $state(false);
    let dragStartX = $state(0);
    let dragStartY = $state(0);
    let dragOffsetX = $state(0);
    let dragOffsetY = $state(0);
    let pageLocked = $state(false);
    let btnRef: HTMLDivElement | undefined = $state();

    const noteTypes: { type: NoteType; label: string; color: string }[] = [
        { type: 1 as NoteType, label: "Tap", color: "#4fc3f7" },
        { type: 2 as NoteType, label: "Drag", color: "#ffd54f" },
        { type: 3 as NoteType, label: "Hold", color: "#ef5350" },
        { type: 4 as NoteType, label: "Flick", color: "#ce93d8" },
    ];

    function handlePointerDown(e: PointerEvent) {
        if (placementActive) return;
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragOffsetX = posX;
        dragOffsetY = posY;
    }

    function handlePointerMove(e: PointerEvent) {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        posX = Math.max(0, Math.min(window.innerWidth - 48, dragOffsetX + dx));
        posY = Math.max(0, Math.min(window.innerHeight - 48, dragOffsetY + dy));
    }

    function handlePointerUp(e: PointerEvent) {
        if (!dragging) return;
        dragging = false;
        const dx = Math.abs(e.clientX - dragStartX);
        const dy = Math.abs(e.clientY - dragStartY);
        // 如果几乎没有移动，视为点击（打开面板）
        if (dx < 5 && dy < 5) {
            panelOpen = !panelOpen;
        }
    }

    function togglePageLock() {
        pageLocked = !pageLocked;
        if (pageLocked) {
            document.body.style.position = "fixed";
            document.body.style.overflow = "hidden";
            document.body.style.width = "100%";
            document.body.style.height = "100%";
        } else {
            document.body.style.position = "";
            document.body.style.overflow = "";
            document.body.style.width = "";
            document.body.style.height = "";
        }
    }

    function handleOutsideClick(e: MouseEvent) {
        if (!panelOpen) return;
        if (btnRef && !btnRef.contains(e.target as Node)) {
            panelOpen = false;
        }
    }

    onMount(() => {
        document.addEventListener("click", handleOutsideClick);
    });

    onDestroy(() => {
        document.removeEventListener("click", handleOutsideClick);
        if (pageLocked) {
            document.body.style.position = "";
            document.body.style.overflow = "";
            document.body.style.width = "";
            document.body.style.height = "";
        }
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="floating-btn-panel"
    class:open={panelOpen}
    class:placement={placementActive}
    style="left: {posX}px; top: {posY}px;"
    bind:this={btnRef}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
>
    <!-- 折叠状态：圆形按钮 -->
    <div class="main-btn" class:locked={pageLocked}>
        <span class="main-icon">+</span>
    </div>

    <!-- 展开面板 -->
    {#if panelOpen}
        <div class="panel">
            <div class="panel-row">
                <button class="action-btn" onclick={onPlayPause} title={isPlaying ? "Pause" : "Play"}>
                    {#if isPlaying}
                        <Pause size={18} />
                    {:else}
                        <Play size={18} />
                    {/if}
                </button>
                <button class="action-btn" onclick={onUndo} title={$_("main.undo")}>
                    <RotateCcw size={18} />
                </button>
                <button class="action-btn" onclick={onRedo} title={$_("main.redo")}>
                    <RotateCcw size={18} style="transform: scaleX(-1)" />
                </button>
                <button class="action-btn" onclick={togglePageLock} title={$_("main.pageLock")}>
                    {#if pageLocked}
                        <Lock size={18} />
                    {:else}
                        <Unlock size={18} />
                    {/if}
                </button>
            </div>
            <div class="panel-row">
                {#each noteTypes as nt}
                    <button
                        class="note-btn"
                        class:active={placementActive}
                        style="--note-bg: {nt.color}22; --note-color: {nt.color};"
                        onclick={() => onNoteTypeSelect(nt.type)}
                        title={nt.label}
                    >
                        <span class="note-dot" style="background: {nt.color};"></span>
                        {nt.label}
                    </button>
                {/each}
            </div>
            <div class="panel-row">
                <button class="action-btn" onclick={onSave} title={$_("main.save")}>
                    <Highlighter size={18} />
                </button>
                <button class="action-btn" onclick={onFullscreen} title={$_("main.fullscreen")}>
                    <Copy size={18} />
                </button>
                <button class="action-btn close-btn" onclick={() => panelOpen = false} title={$_("main.close")}>
                    <X size={18} />
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .floating-btn-panel {
        position: fixed;
        z-index: 100;
        --panel-bg: rgba(30, 30, 50, 0.96);
        --panel-text: white;
        --panel-border: rgba(255, 255, 255, 0.1);
        touch-action: none;
        user-select: none;
    }
    .floating-btn-panel.placement {
        opacity: 0.5;
        pointer-events: none;
    }
    .main-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--panel-bg);
        color: var(--panel-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        border: 1px solid var(--panel-border);
        transition: transform 0.15s;
        font-size: 22px;
        font-weight: bold;
    }
    .main-btn:hover {
        transform: scale(1.1);
    }
    .main-btn.locked {
        background: #ffc107;
        color: #333;
    }
    .panel {
        position: absolute;
        top: 48px;
        left: 0;
        background: var(--panel-bg);
        border-radius: 12px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        border: 1px solid var(--panel-border);
        min-width: 180px;
    }
    .panel-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }
    .action-btn {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        border: 1px solid var(--panel-border);
        background: rgba(255,255,255,0.08);
        color: var(--panel-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s;
        padding: 0;
    }
    .action-btn:hover {
        background: rgba(255,255,255,0.15);
    }
    .close-btn:hover {
        background: rgba(255, 80, 80, 0.3);
    }
    .note-btn {
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid var(--panel-border);
        background: var(--note-bg);
        color: var(--note-color);
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background 0.15s;
    }
    .note-btn:hover {
        background: var(--note-color);
        color: white;
    }
    .note-btn.active {
        background: var(--note-color);
        color: white;
    }
    .note-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }
</style>