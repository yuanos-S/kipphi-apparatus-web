<script lang="ts">
    /**
     * 移动端悬浮快捷键按钮
     * - 支持拖拽移动（pointer events，兼容 Safari）
     * - 音符类型选择进入预放置模式
     * - 预放置模式：显示放置/取消，用户拖动定位后点击放置
     * - Hold 两步放置：起点 → 终点
     * - 面板可关闭/最小化
     * - PC端自动隐藏
     */
    import { onMount, onDestroy } from "svelte";
    import { Play, Pause, Undo2, Redo2, Save, Maximize, Minimize, Home, Keyboard, X, Info, Music, Check, Ban, Lock, Unlock } from "@lucide/svelte";
    import { toggleFullscreen, isFullscreen, isMobileDevice } from "#/userData";

    let isDragging = $state(false);
    let showPanel = $state(false);
    let showShortcuts = $state(false);
    let posX = $state(20);
    let posY = $state(100);
    let isMobile = $state(false);
    let fullscreen = $state(false);
    let btnSize = 48;

    let startX = 0;
    let startY = 0;
    let startPosX = 0;
    let startPosY = 0;
    let dragThreshold = 5;
    let hasMoved = false;

    /** 放置模式状态 */
    let placeState: "normal" | "placing" = $state("normal");
    let placingNoteType = $state(1);

    /** 页面锁定状态：防止页面乱动 */
    let pageLocked = $state(false);

    /** 锁定页面：阻止滚动/拖动 */
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

    interface NoteTypeOption {
        type: number;
        label: string;
        icon: string;
    }

    const noteTypes: NoteTypeOption[] = [
        { type: 1, label: "Tap", icon: "●" },
        { type: 4, label: "Drag", icon: "◆" },
        { type: 3, label: "Flick", icon: "▲" },
        { type: 2, label: "Hold", icon: "■" },
    ];

    function getNoteLabel(type: number) {
        return noteTypes.find(n => n.type === type)?.label ?? "Tap";
    }

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
        onNoteTypeSelect,
        onFinish,
        onCancelPlace,
        currentNoteType = 1,
        placementActive = false,
    }: {
        onPlayPause?: () => void;
        onUndo?: () => void;
        onRedo?: () => void;
        onSave?: () => void;
        onHome?: () => void;
        /** 用户选择了音符类型，进入预放置模式 */
        onNoteTypeSelect?: (type: number) => void;
        /** 用户点击完成 */
        onFinish?: () => void;
        /** 用户点击取消放置 */
        onCancelPlace?: () => void;
        currentNoteType?: number;
        /** 外部控制：是否处于放置模式 */
        placementActive?: boolean;
    } = $props();

    onMount(() => {
        isMobile = isMobileDevice();
        // 检查悬浮窗是否被用户在设置中关闭
        if (localStorage.getItem("floatingEnabled") === "0") {
            isMobile = false;
        }
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
        // 清理：离开页面时解除锁定
        if (pageLocked) {
            document.body.style.position = "";
            document.body.style.overflow = "";
            document.body.style.width = "";
            document.body.style.height = "";
        }
    });

    function handleResize() { isMobile = isMobileDevice(); }
    function handleFullscreenChange() { fullscreen = isFullscreen(); }

    function getSafeInsets() {
        const style = getComputedStyle(document.documentElement);
        return {
            top: parseInt(style.getPropertyValue("--safe-top")) || 0,
            bottom: parseInt(style.getPropertyValue("--safe-bottom")) || 0,
            left: parseInt(style.getPropertyValue("--safe-left")) || 0,
            right: parseInt(style.getPropertyValue("--safe-right")) || 0,
        };
    }

    function clampPosition(x: number, y: number) {
        const insets = getSafeInsets();
        const margin = 8;
        return {
            x: Math.max(margin + insets.left, Math.min(window.innerWidth - btnSize - margin - insets.right, x)),
            y: Math.max(insets.top + 60, Math.min(window.innerHeight - btnSize - margin - insets.bottom, y)),
        };
    }

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

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) hasMoved = true;
        const c = clampPosition(startPosX + dx, startPosY + dy);
        posX = c.x;
        posY = c.y;
    }

    function handlePointerUp() {
        isDragging = false;
        localStorage.setItem("floatingBtnX", posX.toString());
        localStorage.setItem("floatingBtnY", posY.toString());
    }

    function handleClick() {
        if (hasMoved) return;
        showPanel = !showPanel;
        showShortcuts = false;
    }

    function doAction(action: string) {
        showPanel = false;
        switch (action) {
            case "playPause": onPlayPause?.(); break;
            case "undo": onUndo?.(); break;
            case "redo": onRedo?.(); break;
            case "save": onSave?.(); break;
            case "fullscreen":
                toggleFullscreen().then(() => { fullscreen = isFullscreen(); });
                break;
            case "home": onHome?.(); break;
        }
    }

    /** 选择音符类型，进入预放置模式 */
    function selectNoteType(nt: NoteTypeOption) {
        placingNoteType = nt.type;
        placeState = "placing";
        onNoteTypeSelect?.(nt.type);
    }

    /** 点击完成 */
    function doFinish() {
        placeState = "normal";
        onFinish?.();
    }

    /** 点击取消放置 */
    function doCancelPlace() {
        placeState = "normal";
        onCancelPlace?.();
    }

    /** 关闭面板 */
    function closePanel() {
        showPanel = false;
        showShortcuts = false;
    }

    /** 同步外部放置状态 */
    $effect(() => {
        if (!placementActive && placeState !== "normal") {
            placeState = "normal";
        }
    });
</script>

{#if isMobile}
    <div class="floating-container" style="left: {posX}px; top: {posY}px;">
        {#if showPanel && !showShortcuts}
            <div class="floating-panel">
                <!-- 预放置模式 -->
                {#if placeState !== "normal"}
                    <div class="placement-header">
                        <span class="pl-title">{getNoteLabel(placingNoteType)}</span>
                    </div>
                    <div class="placement-actions">
                        <button class="place-btn confirm" onpointerdown={(e) => e.stopPropagation()} onclick={doFinish}>
                            <Check size={18} />
                            Finish
                        </button>
                        <button class="place-btn cancel" onpointerdown={(e) => e.stopPropagation()} onclick={doCancelPlace}>
                            <Ban size={18} />
                            取消
                        </button>
                    </div>
                {:else}
                    <!-- 面板标题 -->
                    <div class="panel-header">
                        <span class="panel-title">快捷操作</span>
                        <div class="header-actions">
                            <button class="icon-btn" onclick={() => { showShortcuts = true; }} title="快捷键">
                                <Info size={14} />
                            </button>
                            <button class="icon-btn" onclick={closePanel} title="关闭">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <!-- 操作按钮区 -->
                    <div class="panel-actions">
                        <button class="act-btn" onpointerdown={(e) => e.stopPropagation()} onclick={() => doAction("playPause")}>
                            <Play size={18} />
                        </button>
                        <button class="act-btn" onpointerdown={(e) => e.stopPropagation()} onclick={() => doAction("undo")}>
                            <Undo2 size={18} />
                        </button>
                        <button class="act-btn" onpointerdown={(e) => e.stopPropagation()} onclick={() => doAction("redo")}>
                            <Redo2 size={18} />
                        </button>
                        <button class="act-btn" onpointerdown={(e) => e.stopPropagation()} onclick={() => doAction("save")}>
                            <Save size={18} />
                        </button>
                        <button class="act-btn" onpointerdown={(e) => e.stopPropagation()} onclick={() => doAction("fullscreen")}>
                            {#if fullscreen}
                                <Minimize size={18} />
                            {:else}
                                <Maximize size={18} />
                            {/if}
                        </button>
                        <button class="act-btn" onpointerdown={(e) => e.stopPropagation()} onclick={() => doAction("home")}>
                            <Home size={18} />
                        </button>
                    </div>

                    <!-- 分隔线 -->
                    <div class="divider"></div>

                    <!-- 页面锁定按钮 -->
                    <button
                        class="page-lock-btn"
                        class:locked={pageLocked}
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={togglePageLock}
                        title={pageLocked ? "解除页面锁定" : "锁定页面，防止拖动"}
                    >
                        {#if pageLocked}
                            <Lock size={14} />
                        {:else}
                            <Unlock size={14} />
                        {/if}
                        <span>{pageLocked ? "已锁定" : "锁定页面"}</span>
                    </button>

                    <!-- 分隔线 -->
                    <div class="divider"></div>

                    <!-- 音符类型按钮区 -->
                    <div class="panel-header">
                        <span class="panel-title"><Music size={12} /> 音符类型</span>
                    </div>
                    <div class="note-type-row">
                        {#each noteTypes as nt}
                            <button
                                class="note-type-btn"
                                class:active={currentNoteType === nt.type && placeState === "normal"}
                                onpointerdown={(e) => e.stopPropagation()}
                                onclick={() => selectNoteType(nt)}
                                title={nt.label}
                            >
                                <span class="nt-icon">{nt.icon}</span>
                                <span class="nt-label">{nt.label}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        {#if showPanel && showShortcuts}
            <div class="floating-panel shortcuts-panel">
                <div class="panel-header">
                    <span class="panel-title">快捷键</span>
                    <button class="icon-btn" onclick={() => { showShortcuts = false; }} title="返回">
                        <X size={14} />
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
            class:placing={placeState !== "normal"}
            onpointerdown={handlePointerDown}
            onpointermove={handlePointerMove}
            onpointerup={handlePointerUp}
            onpointercancel={handlePointerUp}
            onclick={handleClick}
        >
            {#if placeState !== "normal"}
                <Music size={22} />
            {:else}
                <Keyboard size={22} />
            {/if}
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
        gap: 8px;
        will-change: left, top;
        -webkit-transform: translateZ(0);
    }

    .floating-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66ddff 0%, #55ccee 100%);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(102, 221, 255, 0.4);
        transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;

        &.dragging {
            transform: scale(1.15);
            box-shadow: 0 6px 24px rgba(102, 221, 255, 0.6);
        }

        &.placing {
            background: linear-gradient(135deg, #ff9966 0%, #ff7744 100%);
            box-shadow: 0 4px 16px rgba(255, 153, 102, 0.4);
        }
    }

    .floating-panel {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: rgba(30, 30, 50, 0.96);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 14px;
        padding: 10px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        animation: fpSlideIn 0.2s ease-out;
        min-width: 180px;
    }

    @keyframes fpSlideIn {
        from { opacity: 0; transform: scale(0.85); }
        to { opacity: 1; transform: scale(1); }
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2px;
    }

    .header-actions {
        display: flex;
        gap: 4px;
    }

    .panel-title {
        color: rgba(255, 255, 255, 0.65);
        font-size: 11px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .icon-btn {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        padding: 0;
        &:active { background: rgba(255, 255, 255, 0.2); }
    }

    .panel-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
    }

    .act-btn {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        transition: background 0.15s;
        &:active { background: rgba(102, 221, 255, 0.3); }
    }

    .divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 2px 0;
    }

    .note-type-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 5px;
    }

    .note-type-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1.5px solid transparent;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        transition: all 0.15s;
        .nt-icon { font-size: 14px; line-height: 1; }
        .nt-label { font-size: 11px; font-weight: 500; }
        &.active {
            background: rgba(102, 221, 255, 0.15);
            border-color: rgba(102, 221, 255, 0.5);
            color: #6df;
        }
        &:active { background: rgba(102, 221, 255, 0.25); }
    }

    /* 页面锁定按钮 */
    .page-lock-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1.5px solid transparent;
        color: rgba(255, 255, 255, 0.65);
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        transition: all 0.15s;
        &:active { background: rgba(255, 255, 255, 0.12); }
        &.locked {
            background: rgba(255, 193, 7, 0.15);
            border-color: rgba(255, 193, 7, 0.4);
            color: #ffc107;
        }
    }

    /* 放置模式 */
    .placement-header {
        text-align: center;
        padding: 4px 0;
    }

    .pl-title {
        color: #ff9966;
        font-size: 13px;
        font-weight: 600;
    }

    .placement-actions {
        display: flex;
        gap: 8px;
    }

    .place-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px;
        border-radius: 10px;
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        transition: all 0.15s;

        &.confirm {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
            border: 1.5px solid rgba(46, 204, 113, 0.4);
            &:active { background: rgba(46, 204, 113, 0.35); }
        }

        &.cancel {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 1.5px solid rgba(231, 76, 60, 0.4);
            &:active { background: rgba(231, 76, 60, 0.35); }
        }
    }

    .shortcuts-panel {
        width: 200px;
        max-height: 55vh;
        overflow-y: auto;
    }

    .shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .shortcut-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 3px 6px;
        border-radius: 5px;
    }

    kbd.shortcut-key {
        display: inline-block;
        padding: 2px 5px;
        border-radius: 3px;
        background: rgba(102, 221, 255, 0.15);
        border: 1px solid rgba(102, 221, 255, 0.25);
        color: #6df;
        font-family: monospace;
        font-size: 10px;
        white-space: nowrap;
    }

    .shortcut-desc {
        color: rgba(255, 255, 255, 0.7);
        font-size: 10px;
    }
</style>