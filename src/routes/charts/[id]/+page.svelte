<script lang="ts">
/**
 * 谱面编辑器页面
 * 功能：
 * - 谱面编辑主界面
 * - 播放器、音符编辑器、事件编辑器
 * - 侧边栏面板（可收缩）
 * - 自动保存功能
 * - 移动端悬浮快捷键
 * - 全屏模式
 */
import { Player, AudioProcessor, Images } from "kipphi-player";
import { EventSequenceEditors, NotesEditor, NotesEditorState } from "kipphi-canvas-editor";
import type { PageData } from "./$types";
import { onMount, tick, onDestroy } from "svelte";
import { get } from "svelte/store";
import { Chart, EventEndNode, EventStartNode, EventType, KPAError, NoteType, Op as O, TC, type ExtendedEventTypeName } from "kipphi";

import { _ } from "#/i18n";

import AutoSaveRunner from "./autosaveRunner";
import { saveChart } from "./save";

import PlayButton from "#/components/IconButtons/PlayButton.svelte";
import GridSwitch from "#/components/IconButtons/GridSwitch.svelte";
import PopupOption from "#/components/PopupOption/PopupOption.svelte";
import TimeDivisorPicker from "#/components/IconButtons/TimeDivisorPicker.svelte";
import SwitchButton from "#/components/IconButtons/SwitchButton.svelte";
import TextSwitchButton from "#/components/IconButtons/TextSwitchButton.svelte";
import FloatingButton from "#/components/FloatingButton.svelte";
    import ArrowedInput from "#/components/Inputs/ArrowedInput.svelte";
    import Label from "#/components/Label.svelte";
    import UnitInput from "#/components/Inputs/UnitInput.svelte";
    import JudgeLines from "./JudgeLinesManager.svelte";

import { Sidebar, init as EditorGlobalInit, SecondarySidebar, restoreStates,
    operationList,
    eventsType, eventsLayer,
    playerShowsUI, playerShowsLineID, playerHitEffectNoFollows, playerShowsCurve, playerCameraZoom,
    selectedLineNumber, activeSidebar, activeSecondarySidebar, previousActiveSecondarySidebar, selectedNote, selectedNotes, selectedNode, selectedNodes,
    timeDivisor, chartId,
    notesNoteType, notesEditChecked, notesAbove,
    } from "./store.svelte";
    import NoteEditor from "./NoteEditor.svelte";
    import Constants from "./constants";
    import NotesSidebar from "./NotesSidebar.svelte";
    import Tooltip from "#/components/Tooltip.svelte";
    import JudgeLineEditor from "./JudgeLineEditor.svelte";
    import EventsSidebar from "./EventsSidebar.svelte";
    import EventEditor from "./EventEditor.svelte";
    import ChartInfoEditor from "./ChartInfoEditor.svelte";
    import MultiNodeEditor from "./MultiNodeEditor.svelte";
    import MultiNoteEditor from "./MultiNoteEditor.svelte";
    import { KPASettings } from "#/settings.svelte";
    import { notify } from "#/notify.svelte";
    import { respack, waitRespack } from "#/respack.svelte";
    import { fetchTexture } from "#/background";
    import { isMobileDevice, enterFullscreen } from "#/userData";
    import Errors from "./Errors.svelte";
    import { Redo2, Undo2, Home } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { base } from "$app/paths";


let {
    data
}: {data: PageData} = $props();

let loadError: string | null = $state(null);
let loading: boolean = $state(true);



const audio = new Audio(URL.createObjectURL(data.music));
audio.addEventListener("timeupdate", () => {
    if (!player?.playing) {
        return;
    }
    pre0 = 0;
    progressBar.value = audio.currentTime + '';
});
audio.addEventListener("ended", () => {
    player?.pause();
    isPlaying = false;
})

// 初始化资源包、图片、音频处理器 — 并行加载加速启动
let illustration: ImageBitmap;
let audioProcessor: AudioProcessor;

try {
    // 并行执行不相互依赖的初始化任务
    const [_, imgBmp] = await Promise.all([
        waitRespack(),
        createImageBitmap(data.illustration),
    ]);
    illustration = imgBmp;

    // 资源包和图片都准备好后，并行初始化音频和图片
    if (respack?.TAP_SE && respack?.DRAG_SE && respack?.FLICK_SE) {
        audioProcessor = AudioProcessor.fromRespack(respack);
    } else {
        audioProcessor = new AudioProcessor();
    }

    // 并行加载音频处理器和编辑器图片
    await Promise.all([
        respack?.TAP_SE && respack?.DRAG_SE && respack?.FLICK_SE
            ? Promise.resolve()
            : audioProcessor.init({ tap: data.tap, drag: data.drag, flick: data.flick }),
        Images.loadAndOptimize({ anchor: data.anchorImg, below: data.belowImg }),
        Images.initImagesForEditor({
            selectNote: data.selectNoteImg,
            startNode: data.startNodeImg,
            endNode: data.endNodeImg
        }),
    ]);
} catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
    console.error("Editor init failed:", e);
}
loading = false;

// 操作光标状态
let cursorX: number = $state(0);
let cursorY: number = $state(0);
let cursorVisible: boolean = $state(false);

function handleInnerMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cursorX = e.clientX - rect.left;
    cursorY = e.clientY - rect.top;
    cursorVisible = true;
}
function handleInnerLeave() {
    cursorVisible = false;
}


// @ts-expect-error 仅供调试
window.Images = Images;
// @ts-expect-error 仅供调试
window.audioProcessor = audioProcessor;

let playerCanvas: HTMLCanvasElement;
let notesEditorCanvas: HTMLCanvasElement;
let eventSequenceEditorCanvas: HTMLCanvasElement;
let player: Player = null;
let notesEditor: NotesEditor;
let eventSequenceEditors: EventSequenceEditors;

let aspect = $state(3 / 2);

const playerWidth = $derived(aspect * KPASettings.playerHeight);
// svelte-ignore non_reactive_update
let judgeLinesManager: JudgeLines;
let progressBar: HTMLInputElement;
// let playButton: PlayButton;
let isPlaying = $state(false);
let showingGrid = $state(true);
let speed = $state("1.0x");
let preservesPitch = $state(true);
let sidebarCollapsed = $state(false);
/** 移动端放置模式 */
let placementActive = $state(false);

let undoAvailable = $state(false);
let redoAvailable = $state(false);

let volume = $state(3.5);

// let selectedLineNumber = $state(0);

$effect(() => {
    audioProcessor.volume = volume;
});

$effect(() => {
    let s = parseFloat(speed); // 反正末尾有东西不影响解析
    audio.playbackRate = s;
});
$effect(() => {
    audio.preservesPitch = preservesPitch;
});


let selectedLineName = $derived.by(() => {
    const lineNumber = $selectedLineNumber;
    const line = data.chart.judgeLines[lineNumber];
    return line?.name ?? "?";
});

let pre0 = 0;

const renderingTimeCalculator = Object.getOwnPropertyDescriptor(Player.prototype, "renderingTime").get;

const computeTimeWithPre0 = () => {
    return renderingTimeCalculator.call({
        time: player.time - pre0,
        audio: audio,
        renderingOffset: player.renderingOffset
    })
}

const forward = (delta: number) => {
    const easingECE = eventSequenceEditors.easing;
    if (easingECE.active) {
        easingECE.draw((easingECE.lastBeats || 0) + delta)
        return;
    }
    const tc = operationList.chart.timeCalculator;
    if (pre0 > 0) {
        pre0 -= delta;
        if (pre0 <=0) {
            pre0 = 0;
        }
        // HACK: 使得能够显示0之前的部分。
        const renderingBeats = tc.secondsToBeats(computeTimeWithPre0());
        eventSequenceEditors.draw(renderingBeats);
        notesEditor.draw(renderingBeats)
        return;
    }
    audio.currentTime += delta;
    player.render();
}

const backward = (delta: number) => {
    const easingECE = eventSequenceEditors.easing;
    if (easingECE.active) {
        easingECE.draw((easingECE.lastBeats || 0) - delta)
        return;
    }
    const tc = operationList.chart.timeCalculator;
    const audioCurTime = audio.currentTime;
    if (audioCurTime <= 0) {
        pre0 += delta;
        const renderingBeats = tc.secondsToBeats(computeTimeWithPre0());
        eventSequenceEditors.draw(renderingBeats);
        notesEditor.draw(renderingBeats)
    } else {
        pre0 = 0;
        audio.currentTime = audioCurTime - delta;
        player.render();
    }
}



/**
 * 处理滚轮事件。
 * @param event
 */
function handleWheel(event: WheelEvent) {
    if (event.ctrlKey) { // 不处理Ctrl
        return;
    }
    if (audio) {
        const isForward = event.deltaY > 0 !== KPASettings.useRpeWheel;
        const absDelta = Math.abs(event.deltaY);
        if (isForward) {
            forward(absDelta / 1000);
        } else {
            backward(absDelta / 1000);
        }
        progressBar.value = audio.currentTime + '';
    }
}

function globalHandleWheel(event: WheelEvent) {
    if (event.ctrlKey) { // 按下CTRL则认为在切换判定线
        selectedLineNumber.set(($selectedLineNumber + ((event.deltaY > 0 !== KPASettings.useRpeWheel) ? 1 : -1) + data.chart.judgeLines.length) % data.chart.judgeLines.length);
        return;
    }
}

const handleKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
    case "Control":
        if (document.activeElement !== document.body) {
            return;
        }
        if ($activeSecondarySidebar === SecondarySidebar.LINES) {
            return;
        }
        previousActiveSecondarySidebar.set($activeSecondarySidebar);
        activeSecondarySidebar.set(SecondarySidebar.LINES);
        break;
    case " ":
        if (document.hasFocus() && document.activeElement !== document.body) {
            return;
        }
        if (isPlaying) {
            player.pause();
        } else {
            play();
        }
        event.preventDefault();
        break;
    case "Tab":
        if ($activeSidebar === Sidebar.EVENTS) {
            const offset = event.shiftKey ? -1 : 1;
            const currentType = $eventsType;
            const currentLayer = $eventsLayer;
            const NORMALS = ["moveX", "moveY", "rotate", "alpha", "speed", "easing"] as Exclude<keyof typeof EventType, ExtendedEventTypeName>[]
            const EXTENDED = ["scaleX", "scaleY", "text", "color", "bpm"] as ExtendedEventTypeName[]
            eventsType.set(
                currentLayer === "ex"
                    ? EXTENDED[(EXTENDED.indexOf(currentType as ExtendedEventTypeName) + offset + EXTENDED.length) % EXTENDED.length] ?? EXTENDED[0]
                    : NORMALS[(NORMALS.indexOf(currentType) + offset + NORMALS.length) % NORMALS.length] ?? NORMALS[0]
            );
        }
        break;
    case "Escape":
        activeSecondarySidebar.set(SecondarySidebar.CHART);
        break;
    case "z":
        operationList.undo();
        break;
    case "y":
        operationList.redo();
        break;
    case "Delete":
        handleDelete();
    }
}

const handleKeyup = (event: KeyboardEvent) => {
    if (document.activeElement !== document.body) {
        return;
    }
    switch (event.key) {
    case "Control":
        activeSecondarySidebar.set($previousActiveSecondarySidebar);
        break;
    }
}
const handleExit = (e: BeforeUnloadEvent) => {
    if (operationList.chart?.modified) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
}
const handleDelete = () => {
    if ($activeSecondarySidebar === SecondarySidebar.NOTE) {
        const note = $selectedNote;
        if (!note) { return }
        operationList.do(new O.NoteDeleteOperation(note));
    } else if ($activeSecondarySidebar === SecondarySidebar.EVENT) {
        const node = $selectedNode;
        if (!node || (node instanceof EventStartNode && node.isFirstStart())) { return }
        operationList.do(new O.EventNodePairRemoveOperation(
            node instanceof EventEndNode ? node.previous : node,
            true
        ));
    } else if ($activeSecondarySidebar === SecondarySidebar.MULTI_NOTE) {
        const notes = $selectedNotes;
        if (!notes || notes.size === 0) { return; }
        operationList.do(new O.MultiNoteDeleteOperation(
            notes
        ));
    } else if ($activeSecondarySidebar === SecondarySidebar.MULTI_NODE) {
        const nodes = $selectedNodes;
        if (!nodes || nodes.size === 0) { return; }
        operationList.do(new O.MultiNodeDeleteOperation(
            [...nodes].sort((a, b) => TC.lt(a.time, b.time) ? -1 : 1)
        ));
    }

}

const play = async () => {
    audio.currentTime -= KPASettings.replayCompensation;
    player.play();
}

document.addEventListener("wheel", globalHandleWheel);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);

window.addEventListener("beforeunload", handleExit);


onMount(async () => {
    await tick();
    const chart = data.chart;
    player = new Player(
        playerCanvas,
        audioProcessor,
        audio,
        illustration,
        respack
    );
    player.hitEffectNoFollows = $playerHitEffectNoFollows;
    player.baseOffset = KPASettings.baseOffset
    //player.cameraRatio = 0.8;
    player.addEventListener("play", () => {
        isPlaying = true;
    });
    player.addEventListener("pause", () => {
        isPlaying = false;
    });
    const operationList = new O.OperationList(chart);

    notesEditor = new NotesEditor(
        notesEditorCanvas,
        [0, 0, 600, 900],
        operationList,
        respack
    );
    notesEditor.target = chart.judgeLines[0];
    notesEditor.showsNNNListAttachable = false;
    notesEditorCanvas.addEventListener("click", () => {
        activeSidebar.set(Sidebar.NOTES);
    });
    eventSequenceEditorCanvas.addEventListener("click", () => {
        activeSidebar.set(Sidebar.EVENTS);
    })
    playerCanvas.addEventListener("click", () => {
        activeSidebar.set(Sidebar.DEFAULT);
    })
    eventSequenceEditors = new EventSequenceEditors(
        eventSequenceEditorCanvas,
        [0, 0, 600, 900],
        operationList,
        0.5
    );
    eventSequenceEditors.changeTarget({ judgeLine: chart.judgeLines[0] });
    player.addEventListener("drawn", () => {
        if (showingGrid && pre0 === 0) {
            notesEditor.draw(player.renderingBeats);
            eventSequenceEditors.draw(player.renderingBeats);
        }
        judgeLinesManager?.update();
    });
    const updateUndoRedoAvailability = () => {
        undoAvailable = operationList.operations.length > 0;
        redoAvailable = operationList.undoneOperations.length > 0;
    }
    operationList.addEventListener("do", updateUndoRedoAvailability);
    operationList.addEventListener("undo", updateUndoRedoAvailability);
    operationList.addEventListener("redo", updateUndoRedoAvailability);

    operationList.addEventListener("needsupdate", () => {
        player.render();
    });
    operationList.addEventListener("maxcombochanged", (ev) => {
        chart.maxCombo += ev.comboDelta;
        if (isNaN(chart.maxCombo)) {
            chart.countMaxCombo();
        }
    });
    operationList.addEventListener("firstmodified", (ev) => {
        chart.modified = true;
    });
    operationList.addEventListener("undo", (e) => {
        notify("Undo: " + e.operation.constructor.name, "info");
    })
    operationList.addEventListener("redo", (e) => {
        notify("Redo: " + e.operation.constructor.name, "info");
    });
    operationList.addEventListener("error", (e) => {
        notify("Error: " + e.error.message, "error")
    })
    notesEditor.addEventListener("noteselected", (ev) => {
        // 放置模式下：不切换侧边栏，保持在编辑模式以便连续放置音符
        if (get(notesEditChecked)) {
            return;
        }
        selectedNote.set(ev.note);
        activeSecondarySidebar.set(SecondarySidebar.NOTE);
    });
    notesEditor.addEventListener("notescopeselected", (ev) => {
        selectedNotes.set(ev.notes);
        activeSecondarySidebar.set(SecondarySidebar.MULTI_NOTE);
    });
    eventSequenceEditors.addEventListenerForAll("nodeselected", (ev) => {
        selectedNode.set(ev.node);
        activeSecondarySidebar.set(SecondarySidebar.EVENT);
    });
    eventSequenceEditors.addEventListenerForAll("nodescopeselected", (ev) => {
        selectedNodes.set(ev.nodes);
        activeSecondarySidebar.set(SecondarySidebar.MULTI_NODE);
    });
    player.renderingOffset = KPASettings.renderingOffset;
    // @ts-expect-error 仅供调试
    window.player = player;
    // @ts-expect-error 仅供调试
    window.operationList = operationList;
    player.receive(chart, (name) => {
        return fetchTexture(chartId, name)
    });

    if (KPAError.buffer.length > 0) {
        setTimeout(() => {
            notify($_("main.errors.notify"), "error")
        }, 3000)
    }

    if (KPASettings.autosaveEnabled) {
        AutoSaveRunner.init(chart);
        AutoSaveRunner.run();
    }

    // 移动端自动全屏
    if (KPASettings.autoFullscreen && isMobileDevice()) {
        // 需要用户交互后才能进入全屏，这里延迟尝试
        setTimeout(() => {
            enterFullscreen().catch(() => {
                // 自动全屏失败不影响使用
            });
        }, 1000);
    }

    EditorGlobalInit(notesEditor, eventSequenceEditors, operationList, player);
    restoreStates();

    // 初始渲染：确保 canvas 在页面加载后立即显示内容，不需要鼠标 hover 触发
    requestAnimationFrame(() => {
        player.render();
        if (showingGrid) {
            notesEditor.draw(player.renderingBeats);
            eventSequenceEditors.draw(player.renderingBeats);
        }
    });

    // 放置模式下，每次放置音符后冷却 1 秒，防止连续快速放置
    // 放在 NotesEditor 的 upHandler 之后注册，确保在其后执行
    let placeCooldown: ReturnType<typeof setTimeout> | null = null;
    playerCanvas.addEventListener("pointerup", () => {
        if (get(notesEditChecked)) {
            notesEditor.state = NotesEditorState.select;
            if (placeCooldown) clearTimeout(placeCooldown);
            placeCooldown = setTimeout(() => {
                if (get(notesEditChecked)) {
                    notesEditor.state = NotesEditorState.edit;
                }
                placeCooldown = null;
            }, 1000);
        }
    });

    // 释放内存
    // data.chart = null;
});

onDestroy(() => {
    // 停止音频播放
    if (audio) {
        audio.pause();
        audio.src = "";
        audio.load();
    }
    // 停止播放器
    if (player) {
        player.pause();
    }

    
    document.removeEventListener("wheel", globalHandleWheel);
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("keyup", handleKeyup);

    window.removeEventListener("beforeunload", handleExit);

    if (KPASettings.autosaveEnabled) {
        AutoSaveRunner.stop();
    }
    // 清理编辑器
    if (notesEditor) {
        // 如果有清理方法，调用它
    }
    if (eventSequenceEditors) {
        // 如果有清理方法，调用它
    }
    // 移除全局引用
    // @ts-expect-error 仅供调试
    if (window.player === player) window.player = null;
    // @ts-expect-error 仅供调试
    if (window.Images === Images) delete window.Images;
    // @ts-expect-error 仅供调试
    if (window.audioProcessor === audioProcessor) delete window.audioProcessor;
});



let tipIndex: number = $state(0);
let timeout: number;
function updateTip() {
    tipIndex = Math.floor(Constants.tips.length * Math.random());
    timeout = window.setTimeout(() => {
        updateTip();
    }, Constants.TIP_INTERVAL);
}
updateTip();


</script>

{#if loading}
<div class="loading-screen">
    <div class="loading-spinner"></div>
    <p>{$_("general.loading") ?? "Loading editor..."}</p>
</div>
{:else if loadError}
<div class="error-screen">
    <h2>Editor failed to load</h2>
    <pre>{loadError}</pre>
    <a href="{base}/" class="return-link">Return to home</a>
</div>
{:else}
<main class="container" class:sidebar-collapsed={sidebarCollapsed}>
    <div id="inner" onwheel={handleWheel} style:--aspect-ratio={aspect}
        onmousemove={handleInnerMove} onmouseleave={handleInnerLeave}>
        <canvas bind:this={playerCanvas} id="player" width={playerWidth} height={KPASettings.playerHeight}>Your device does not support the HTML5 canvas element.</canvas>
        <canvas bind:this={notesEditorCanvas} id="ne" width={600} height={900}>Your device does not support the HTML5 canvas element.</canvas>
        <canvas bind:this={eventSequenceEditorCanvas} id="ece" width={600} height={900}>Your device does not support the HTML5 canvas element.</canvas>
        {#if cursorVisible}
        <div class="edit-cursor" style="left: {cursorX}px; top: {cursorY}px;">
            <div class="cursor-h-line"></div>
            <div class="cursor-v-line"></div>
        </div>
        {/if}
    </div>
    <div id="secondary-sidebar">
        <div class="sidebar-shadow"></div>
        <div class="sidebar-content">
            <PopupOption wide
                options={
                    [SecondarySidebar.LINES, SecondarySidebar.NOTE, SecondarySidebar.EVENT, SecondarySidebar.LINE,
                    SecondarySidebar.CHART, SecondarySidebar.MULTI_NODE, SecondarySidebar.MULTI_NOTE,
                    SecondarySidebar.ERRORS, SecondarySidebar.GENERAL
                ]
                }
                displayTexts={[
                    $_("main.secondary.lines"),
                    $_("main.secondary.note"),
                    $_("main.secondary.event"),
                    $_("main.secondary.line"),
                    $_("main.secondary.chart"),
                    $_("main.secondary.multiNode"),
                    $_("main.secondary.multiNote"),
                    $_("main.secondary.errors"),
                    $_("main.secondary.general")
                ]}
                bind:currentOption={$activeSecondarySidebar}
            ></PopupOption>
            {#if $activeSecondarySidebar === SecondarySidebar.LINES}
                <JudgeLines chart={data.chart} bind:this={judgeLinesManager}></JudgeLines>
            {:else if $activeSecondarySidebar === SecondarySidebar.NOTE}
                {#if $selectedNote && $selectedNote.parentNode}
                <NoteEditor target={$selectedNote}></NoteEditor>
                {:else}
                <div style="color: var(--color-foreground)">{$_("main.note.noNote")}</div>
                {/if}
            {:else if $activeSecondarySidebar === SecondarySidebar.EVENT}
                {#if $selectedNode && $selectedNode.parentSeq}
                <EventEditor></EventEditor>
                {:else}
                <div style="color: var(--color-foreground)">{$_("main.event.noEvent")}</div>
                {/if}
            {:else if $activeSecondarySidebar === SecondarySidebar.LINE}
                <JudgeLineEditor></JudgeLineEditor>
            {:else if $activeSecondarySidebar === SecondarySidebar.CHART}
                <ChartInfoEditor></ChartInfoEditor>
            {:else if $activeSecondarySidebar === SecondarySidebar.MULTI_NODE}
                {#if $selectedNodes && $selectedNodes.size > 0}
                    <svelte:boundary>
                        <MultiNodeEditor target={$selectedNodes}></MultiNodeEditor>
                        {#snippet failed()}
                            Error!
                        {/snippet}
                    </svelte:boundary>
                {/if}
            {:else if $activeSecondarySidebar === SecondarySidebar.MULTI_NOTE}
                {#if $selectedNotes && $selectedNotes.size > 0}
                    <svelte:boundary>
                        <MultiNoteEditor target={$selectedNotes}></MultiNoteEditor>
                        {#snippet failed()}
                            Error!
                        {/snippet}
                    </svelte:boundary>
                {/if}
            {:else if $activeSecondarySidebar === SecondarySidebar.ERRORS}
                <Errors/>
            {:else if $activeSecondarySidebar === SecondarySidebar.GENERAL}
                <Label small>
                    {$_("main.sidebar.timeDivisor.term")}
                    <Tooltip>{$_("main.sidebar.timeDivisor.desc")}</Tooltip>
                </Label>
                <ArrowedInput
                    bind:value={$timeDivisor}
                    />
                <Label small>
                    {$_("main.sidebar.renderingOffset.term")}
                    <Tooltip>{$_("main.sidebar.renderingOffset.desc")}</Tooltip>
                </Label>
                <UnitInput
                    unit="s"
                    bind:value={
                        () => KPASettings.renderingOffset,
                        (v) => {
                            player.renderingOffset = v;
                            KPASettings.renderingOffset = v;
                        }
                    }/>
                <Label small>
                    {$_("main.general.baseOffset")}
                    <Tooltip>{$_("main.general.baseOffsetDesc")}</Tooltip>
                </Label>
                <UnitInput
                    unit="s"
                    bind:value={
                        () => KPASettings.baseOffset,
                        (v) => {
                            player.baseOffset = v;
                            KPASettings.baseOffset = v;
                        }
                    }
                />
                <Label small>
                    {$_("main.general.replayCompensation")}
                    <Tooltip>{$_("main.general.replayCompensationDesc")}</Tooltip>
                </Label>
                <UnitInput
                    unit="s"
                    bind:value={KPASettings.replayCompensation}
                />
            {/if}
        </div>
    </div>
    <div id="sidebar" class:collapsed={sidebarCollapsed}>
        <div class="sidebar-shadow"></div>
        <button class="sidebar-toggle" onclick={() => { sidebarCollapsed = !sidebarCollapsed; }}>
            {sidebarCollapsed ? "▶" : "◀"}
        </button>
        <div class="sidebar-content">
            <!--TimeDivisorPicker /-->
            <Label small>{$_("main.sidebar.linenumber") + ` (${data.chart.judgeLines.length ?? 0})`}</Label>
            <ArrowedInput
                max={(data.chart.judgeLines.length ?? 1) - 1} min={0}
                bind:value={$selectedLineNumber}
                suffix={`(${selectedLineName})`}
                loops
            />
            {#if $activeSidebar === Sidebar.DEFAULT}
                <Label>{$_("main.sidebar.player")}</Label>
                <TextSwitchButton wide bgText={$_("main.player.showsUI")} onText="Y" offText="N" bind:checked={$playerShowsUI}/>
                <TextSwitchButton wide bgText={$_("main.player.showsLineID")} onText="Y" offText="N" bind:checked={$playerShowsLineID}/>
                <TextSwitchButton wide bgText={$_("main.player.hitEffectNoFollows")} onText="Y" offText="N" bind:checked={$playerHitEffectNoFollows}/>
                <TextSwitchButton wide bgText={$_("main.player.showsCurve")} onText="Y" offText="N" bind:checked={$playerShowsCurve}/>
                <Label small>{$_("main.player.volume")}</Label>
                <ArrowedInput bind:value={volume} step={0.5}></ArrowedInput>
                <PopupOption wide
                    bind:currentOption={aspect}
                    options={
                        [3 / 2, 16 / 9, 4 / 3]
                    }
                    displayTexts={
                        ["3:2", "16:9", "4:3"]
                    }
                    onchange={
                        async () => {
                            await tick();
                            player.useNewAspect();
                        }
                    }
                ></PopupOption>
                <Label small>{$_("main.player.cameraZoom")}</Label>
                <ArrowedInput bind:value={$playerCameraZoom}></ArrowedInput>
            {:else if $activeSidebar === Sidebar.NOTES}
                <NotesSidebar/>
            {:else if $activeSidebar === Sidebar.EVENTS}
                <EventsSidebar/>
            {/if}
        </div>
    </div>
    <div id="footer">
        <PlayButton checked={isPlaying} onchange={(playing) => playing ? play() : player.pause()}/>
        <GridSwitch bind:checked={showingGrid} onchange={(checked) => {
            if (checked) {
                notesEditorCanvas.style.display = "";
                eventSequenceEditorCanvas.style.display = "";
                // 如果没有在播放，手动渲染一次
                if (!player.playing) {
                    notesEditor.draw(player.renderingBeats);
                    eventSequenceEditors.draw(player.renderingBeats);
                }
            } else {
                notesEditorCanvas.style.display = "none";
                eventSequenceEditorCanvas.style.display = "none";
            }
        }} />
            <input type="range" bind:this={progressBar} value={audio.currentTime} step="0.01" max={data.chart.duration}
                oninput={
                    (event) => {
                        audio.currentTime = progressBar.valueAsNumber;
                        player.pause();
                        requestAnimationFrame(() => player.render())
                    }
                }
                onmousedown={() => player.pause()}>
        <!-- !表示preservesPitch=false -->
        <PopupOption options={[
            "1.0x", "0.5x",  "0.25x",  "0.75x",  "1.5x",  "2.0x"
        ]} bind:currentOption={speed} />
        <TextSwitchButton onText="Y" offText="N" bgText={$_("general.preservesPitch")} bind:checked={preservesPitch} />
    </div>
    <div id="secondary-footer">
        <span id="tips" onclick={() => {clearTimeout(timeout);updateTip()}}>Tips: {Constants.tips[tipIndex]}</span>
        {#if KPASettings.autosaveEnabled}
            <span class="autosave-status">
                <span class="autosave-dot"></span>
                自动保存已开启 ({KPASettings.autosaveInterval}s)
            </span>
        {/if}
        <div class="footer-actions">
            <button class="home-btn" title={$_("general.return") ?? "Return home"} onclick={() => goto(`${base}/`)}>
                <Home size={"3.5vh"} />
            </button>
            <Undo2 size={"4vh"} opacity={undoAvailable ? 1 : 0.2} onclick={() => operationList.undo()}/>
            <Redo2 size={"4vh"} opacity={redoAvailable ? 1 : 0.2} onclick={() => operationList.redo()}/>
        </div>
    </div>
</main>

<!-- 移动端悬浮快捷键按钮 -->
<FloatingButton
    onPlayPause={() => {
        if (isPlaying) {
            player.pause();
        } else {
            play();
        }
    }}
    onUndo={() => operationList.undo()}
    onRedo={() => operationList.redo()}
    onSave={() => {
        saveChart(operationList.chart, "Manual save");
        notify("保存成功", "info");
    }}
    onHome={() => goto(`${base}/`)}
    onNoteTypeSelect={(type) => {
        notesNoteType.set(type);
        notesEditChecked.set(true);
        placementActive = true;
    }}
    onFinish={() => {
        notesEditChecked.set(false);
        placementActive = false;
    }}
    onCancelPlace={() => {
        notesEditChecked.set(false);
        placementActive = false;
        // 撤销最后放置的音符
        operationList.undo();
    }}
    currentNoteType={$notesNoteType}
    placementActive={placementActive}
/>
{/if}

<style lang="less">
    /**
     * 编辑器页面样式
     * 使用 dvh（动态视口高度）适配 Safari 移动端地址栏
     * 使用 safe-area-inset 适配刘海屏/全面屏
     */
    :root {
        --player-height: calc(0.85 * var(--dvh));
        --bottom-bar-height: calc(0.11 * var(--dvh));
        --bottom-tips-height: calc(0.04 * var(--dvh));
        --player-width: calc(100vw - 50 * var(--dvh) / 100);
    }

    /* 编辑器全局：禁用文本选中、防止页面乱动 */
    .container {
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        overscroll-behavior: none;
        overflow: hidden;

        /* 禁止所有文本选中 */
        *, *::before, *::after {
            -webkit-user-select: none;
            user-select: none;
        }

        /* 输入框允许选中 */
        input, textarea, [contenteditable] {
            -webkit-user-select: text;
            user-select: text;
        }
    }
    .container {
        display: grid;
        grid-template-columns: auto 1fr 1fr;
        grid-template-rows: var(--player-height) var(--bottom-bar-height) var(--bottom-tips-height);
        width: 100%;
        background-color: #444;
        --color-foreground: white;
    }
    #inner {
        --aspect-ratio: calc(3 / 2);
        --actual-player-height: min(var(--player-height), calc(var(--player-width) / var(--aspect-ratio)));
        height: var(--actual-player-height);
        grid-column: 1 / 2;
        position: relative;
    }
    #footer {
        grid-row: 2 / 3;
        grid-column: 1 / 4;
        display: flex;
        align-items: center;
        padding: 0.5vh 2vh;
        gap: 1vh;
        background-color: #333;
        min-height: var(--bottom-bar-height);
        position: relative;
        z-index: 10;
        box-sizing: border-box;
        flex-wrap: nowrap;
        /* Safari 安全区适配：底部留出 Home Indicator 空间 */
        padding-bottom: calc(0.5vh + env(safe-area-inset-bottom, 0px));
    }
    #secondary-footer {
        grid-row: 3 / 4;
        grid-column: 1 / 4;
        background-color: #333;
        color: white;
        display: flex;
        align-items: center;
        padding: 0.3vh 2vh;
        min-height: var(--bottom-tips-height);
        position: relative;
        z-index: 10;
        box-sizing: border-box;
        gap: 2vh;
        #tips {
            flex: 1;
            font-size: 0.85em;
        }
    }
    .autosave-status {
        display: flex;
        align-items: center;
        gap: 0.5em;
        font-size: 0.85em;
        opacity: 0.8;
    }
    .autosave-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #2ecc71;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }
    input[type="range"] {
        flex: 1;
        min-width: 0;
        max-width: 100%;
    }
    #player {
        height: var(--actual-player-height); 
    }
    #ne {
        position: absolute;
        top: 0;
        height: var(--actual-player-height);
        left: 0;
        transition: 0.3s opacity ease;
        //opacity: 0.3;
    }
    #ece {
        position: absolute;
        top: 0;
        height: var(--actual-player-height);
        right: 0;
        transition: 0.3s opacity ease;
        //opacity: 0.3;
    }
    #ne:hover, #ece:hover {
        opacity: 1.0;
    }
    #ne:active, #ece:active {
        cursor: grabbing;
    }






    #sidebar, #secondary-sidebar {
        position: fixed;
        height: var(--player-height);
        width: 20vh;
        right: 0;
        top: 0;
        background-color: #555;
        z-index: 1;
        padding: 1vh;
        box-sizing: border-box;
        scrollbar-width: none;
        transition: width 0.3s ease, padding 0.3s ease, right 0.3s ease;
        /* Safari 安全区适配：顶部留出刘海屏空间 */
        padding-top: max(1vh, env(safe-area-inset-top, 0px));
        height: calc(var(--player-height) - env(safe-area-inset-bottom, 0px));
    }
    #sidebar.collapsed {
        width: 4vh;
        padding: 1vh 0.5vh;
    }
    #sidebar.collapsed .sidebar-content {
        display: none;
    }
    #sidebar.collapsed .sidebar-shadow {
        display: none;
    }
    #secondary-sidebar {
        right: 20vh;
        width: 30vh;
        transition: right 0.3s ease, width 0.3s ease, padding 0.3s ease;
    }
    .container.sidebar-collapsed #secondary-sidebar {
        right: 4vh;
        width: 0;
        padding: 1vh 0;
        overflow: hidden;
    }
    .container.sidebar-collapsed #secondary-sidebar .sidebar-content {
        display: none;
    }
    .container.sidebar-collapsed #secondary-sidebar .sidebar-shadow {
        display: none;
    }

    .sidebar-shadow {
        position: absolute;
        width: 6px;
        left: -6px;
        top: 0;
        height: calc(100% - env(safe-area-inset-bottom, 0px));
        box-shadow: -6px 0 6px -6px #000 inset;
    }
    .sidebar-toggle {
        position: absolute;
        left: -3vh;
        top: 50%;
        transform: translateY(-50%);
        width: 3vh;
        height: 6vh;
        background: #555;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 1.5vh;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px 0 0 4px;
        z-index: 2;
        transition: background 0.2s;
    }
    .sidebar-toggle:hover {
        background: #666;
    }
    .sidebar-content {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        overflow-y: auto;
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 3px;

        scrollbar-width: none;
    }
    .sidebar-content:focus {
        scroll-behavior: auto;
    }

    /* Loading screen */
    .loading-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: var(--dvh);
        gap: 1.5em;
        color: #333;
        font-size: 1.5rem;
        background: #fafafa;
    }
    .loading-spinner {
        width: 48px;
        height: 48px;
        border: 5px solid #ccc;
        border-top-color: #6df;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Error screen */
    .error-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: var(--dvh);
        padding: 2em;
        font-size: 1.2rem;
        color: #c00;
        h2 { margin-bottom: 1em; }
        pre {
            white-space: pre-wrap;
            max-width: 80%;
            background: #f5f5f5;
            padding: 1em;
            border-radius: 4px;
        }
    }
    .return-link {
        margin-top: 1em;
        color: #6df;
    }

    /* Footer actions (home + undo/redo) */
    .footer-actions {
        display: flex;
        align-items: center;
        gap: 1vh;
        padding-right: 1vh;
    }
    .home-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: white;
        opacity: 0.7;
        transition: opacity 0.2s;
        padding: 0.5vh;
    }
    .home-btn:hover {
        opacity: 1;
    }

    /* 操作光标 */
    .edit-cursor {
        position: absolute;
        pointer-events: none;
        z-index: 10;
        transform: translate(-50%, -50%);
    }
    .cursor-h-line {
        position: absolute;
        left: -100vw;
        top: 0;
        width: 200vw;
        height: 1px;
        background: rgba(102, 221, 255, 0.4);
    }
    .cursor-v-line {
        position: absolute;
        left: 0;
        top: -100vh;
        width: 1px;
        height: 200vh;
        background: rgba(102, 221, 255, 0.4);
    }

    /**
     * 移动端适配
     * - 竖屏：播放器占满视口，侧边栏隐藏，底部工具栏最小化
     * - 横屏：侧边栏缩小，播放器占主要区域
     * - Safari 适配：使用 dvh + safe-area-inset
     */
    @media (max-width: 768px) {
        .container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
            height: var(--dvh);
            /* Safari: 确保容器不超出视口，防止页面拖动 */
            max-height: var(--dvh);
            overflow: hidden;
        }

        #inner {
            grid-column: 1 / 2;
            --player-width: 100vw;
            width: 100%;
            height: 100%;
            /* Safari: 确保 canvas 不溢出 */
            overflow: hidden;
        }

        #player, #ne, #ece {
            width: 100% !important;
            height: 100% !important;
        }

        #sidebar, #secondary-sidebar {
            width: 0 !important;
            padding: 0 !important;
            overflow: hidden;
        }

        #footer {
            flex-wrap: wrap;
            gap: 3px;
            padding: 4px 6px;
            min-height: auto;
            overflow-x: auto;
            justify-content: center;
            /* Safari: 底部安全区 */
            padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
        }

        #footer > * {
            flex-shrink: 0;
            transform: scale(0.85);
        }

        #secondary-footer {
            display: none;
        }
    }

    /* 横屏移动端 */
    @media (max-width: 768px) and (orientation: landscape) {
        .container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
        }

        #sidebar {
            width: 16vh !important;
            padding: 4px !important;
            padding-top: max(4px, env(safe-area-inset-top, 0px)) !important;
            height: calc(var(--player-height) - env(safe-area-inset-bottom, 0px)) !important;
        }

        #sidebar.collapsed {
            width: 3vh !important;
            padding: 4px 0 !important;
        }

        #sidebar .sidebar-toggle {
            left: -2.5vh;
            width: 2.5vh;
            height: 5vh;
            font-size: 1.2vh;
        }

        #secondary-sidebar {
            right: 16vh;
            width: 20vh !important;
            padding: 4px !important;
            padding-top: max(4px, env(safe-area-inset-top, 0px)) !important;
            height: calc(var(--player-height) - env(safe-area-inset-bottom, 0px)) !important;
        }

        .container.sidebar-collapsed #secondary-sidebar {
            right: 3vh;
            width: 0 !important;
            padding: 4px 0 !important;
        }

        #footer {
            gap: 4px;
            padding: 3px 6px;
            padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
        }

        #footer > * {
            transform: scale(0.8);
        }
    }

</style>