<script lang="ts">
import { Player, AudioProcessor, Images } from "kipphi-player";
import { EventSequenceEditors, NotesEditor, NotesEditorState } from "kipphi-canvas-editor";
import type { PageData } from "./$types";
import { onMount, tick, onDestroy } from "svelte";
import { Chart, EventEndNode, EventStartNode, EventType, KPAError, NoteType, Op as O, TC, type ExtendedEventTypeName } from "kipphi";

import { _ } from "#/i18n";

import AutoSaveRunner from "./autosaveRunner";

import PlayButton from "#/components/IconButtons/PlayButton.svelte";
import GridSwitch from "#/components/IconButtons/GridSwitch.svelte";
import PopupOption from "#/components/PopupOption/PopupOption.svelte";
import TimeDivisorPicker from "#/components/IconButtons/TimeDivisorPicker.svelte";
import SwitchButton from "#/components/IconButtons/SwitchButton.svelte";
import TextSwitchButton from "#/components/IconButtons/TextSwitchButton.svelte";
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
    notesNoteType, notesEditChecked,
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
        console.log("???")
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
<main class="container">
    <div id="inner" onwheel={handleWheel} style:--aspect-ratio={aspect}>
        <canvas bind:this={playerCanvas} id="player" width={playerWidth} height={KPASettings.playerHeight}>Your device does not support the HTML5 canvas element.</canvas>
        <canvas bind:this={notesEditorCanvas} id="ne" width={600} height={900}>Your device does not support the HTML5 canvas element.</canvas>
        <canvas bind:this={eventSequenceEditorCanvas} id="ece" width={600} height={900}>Your device does not support the HTML5 canvas element.</canvas>
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
    <div id="sidebar">
        <div class="sidebar-shadow"></div>
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
    <div id="touch-toolbar">
        <button class="touch-btn" class:active={$notesEditChecked}
            onclick={() => notesEditChecked.update(v => !v)}
            title={$_("main.notes.addNote") ?? "Add Note"}>
            {$_("main.notes.addNote") ?? "Edit"}
        </button>
        <div class="touch-divider"></div>
        {#each [{type: NoteType.tap, label: "Tap"}, {type: NoteType.drag, label: "Drag"}, {type: NoteType.flick, label: "Flick"}, {type: NoteType.hold, label: "Hold"}] as btn}
            <button class="touch-btn" class:active={$notesNoteType === btn.type}
                onclick={() => notesNoteType.set(btn.type)}>
                {btn.label}
            </button>
        {/each}
        <div class="touch-divider"></div>
        <button class="touch-btn del" onclick={handleDelete} title="Delete">
            Del
        </button>
    </div>
    <div id="secondary-footer">
        <span id="tips" onclick={() => {clearTimeout(timeout);updateTip()}}>Tips: {Constants.tips[tipIndex]}</span>
        <div class="footer-actions">
            <button class="home-btn" title={$_("general.return") ?? "Return home"} onclick={() => goto(`${base}/`)}>
                <Home size={"3.5vh"} />
            </button>
            <Undo2 size={"4vh"} opacity={undoAvailable ? 1 : 0.2} onclick={() => operationList.undo()}/>
            <Redo2 size={"4vh"} opacity={redoAvailable ? 1 : 0.2} onclick={() => operationList.redo()}/>
        </div>
    </div>
</main>
{/if}

<style lang="less">
    :root {
        --player-height: 85vh;
        --bottom-bar-height: 11vh;
        --bottom-tips-height: 4vh;
        --player-width: calc(100vw - 50vh);
        --color-foreground: white;
    }
    .container {
        display: grid;
        grid-template-columns: auto 1fr 1fr;
        grid-template-rows: var(--player-height) var(--bottom-bar-height) var(--bottom-tips-height);
        width: 100%;
        background-color: #444;
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
        padding: 0 2vh;
        gap: 1vh;
        background-color: #333;
    }
    #secondary-footer {
        grid-row: 3 / 4;
        grid-column: 1 / 4;
        background-color: #333;
        color: white;
        display: flex;
        #tips {
            flex: 1;
        }
    }
    input[type="range"] {
        flex: 1;
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
    }
    #secondary-sidebar {
        right: 20vh;
        width: 30vh;
    }

    .sidebar-shadow {
        position: absolute;
        height: var(--player-height);
        width: 6px;
        left: -6px;
        top: 0;
        box-shadow: -6px 0 6px -6px #000 inset;
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
        &:focus {
            scroll-behavior: auto;
        }
    }

    /* Loading screen */
    .loading-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
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
        height: 100vh;
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
        &:hover {
            opacity: 1;
        }
    }

    /* Responsive: small screens */
    @media (max-width: 900px) {
        :root {
            --player-height: 70vh;
            --bottom-bar-height: 14vh;
            --bottom-tips-height: 5vh;
        }
        #sidebar {
            width: 16vh;
        }
        #secondary-sidebar {
            right: 16vh;
            width: 24vh;
        }
    }
    @media (max-width: 600px) {
        :root {
            --player-height: 60vh;
            --bottom-bar-height: 18vh;
            --bottom-tips-height: 6vh;
        }
        #sidebar {
            width: 14vh;
        }
        #secondary-sidebar {
            right: 14vh;
            width: 20vh;
        }
        #footer {
            flex-wrap: wrap;
            gap: 0.5vh;
        }
    }

    /* Touch toolbar for mobile/touch devices */
    #touch-toolbar {
        display: none;
        grid-row: 3 / 4;
        grid-column: 1 / 4;
        background: #2a2a2e;
        align-items: center;
        justify-content: center;
        gap: 0.5vh;
        padding: 0 1vh;
        flex-wrap: wrap;
    }
    .touch-btn {
        min-width: 44px;
        min-height: 36px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        background: #3a3a3e;
        color: #ddd;
        font-size: 1.4vh;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.15s;
        padding: 0.5vh 1vh;
        &:active {
            transform: scale(0.94);
            background: #4a4a4e;
        }
        &.active {
            background: #6df;
            color: #111;
            border-color: #6df;
            box-shadow: 0 0 8px rgba(102,221,255,0.4);
        }
        &.del {
            background: #442020;
            border-color: #633;
            &:active {
                background: #553030;
            }
        }
    }
    .touch-divider {
        width: 1px;
        height: 24px;
        background: rgba(255,255,255,0.15);
        margin: 0 0.3vh;
    }

    /* Show touch toolbar on small screens */
    @media (max-width: 900px) {
        :root {
            --player-height: 65vh;
            --bottom-bar-height: 10vh;
            --bottom-tips-height: 4vh;
        }
        #touch-toolbar {
            display: flex;
        }
        /* Adjust grid for extra row */
        .container {
            grid-template-rows: var(--player-height) var(--bottom-bar-height) auto var(--bottom-tips-height);
        }
        #secondary-footer {
            grid-row: 4 / 5;
        }
    }
    @media (max-width: 600px) {
        .touch-btn {
            font-size: 1.2vh;
            min-width: 38px;
            padding: 0.4vh 0.6vh;
        }
    }

</style>