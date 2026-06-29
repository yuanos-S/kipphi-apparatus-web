import { get, writable } from "svelte/store";
import { type NotesEditor, type EventSequenceEditors, NotesEditorState, EventCurveEditorState, SelectState, NewNodeState } from "kipphi-canvas-editor"
import { easingArray, EventEndNode, EventNode, EventStartNode, EventType, NNList, Note, NoteType, type ExtendedEventTypeName, type Op } from "kipphi";
import type { Player } from "kipphi-player";

type OperationList = Op.OperationList;

export const Sidebar = {
    DEFAULT: 0,
    NOTES: 1,
    EVENTS: 2
} as const;

export const SecondarySidebar = {
    LINES: 0,
    NOTE: 1,
    EVENT: 2,
    LINE: 3,
    CHART: 4,
    MULTI_NODE: 5,
    MULTI_NOTE: 6,
    ERRORS: 7,
    GENERAL: 8
} as const;

let _player: Player | null = null;
let _notesEditor: NotesEditor | null = null;
let _eventSequenceEditors: EventSequenceEditors | null = null;
let _operationList: OperationList | null = null;
let _chartId: string = "";

export function getPlayer(): Player | null { return _player; }
export function getNotesEditor(): NotesEditor | null { return _notesEditor; }
export function getEventSequenceEditors(): EventSequenceEditors | null { return _eventSequenceEditors; }
export function getOperationList(): OperationList | null { return _operationList; }
export function getChartId(): string { return _chartId; }

export let player: Player;
export let notesEditor: NotesEditor;
export let eventSequenceEditors: EventSequenceEditors;
export let operationList: OperationList;
export let chartId: string;

export function setID(id: string) { _chartId = id; chartId = id; }

export function init(
    ne: NotesEditor,
    ece: EventSequenceEditors,
    ol: OperationList,
    pl: Player
) {
    _notesEditor = ne;
    _eventSequenceEditors = ece;
    _operationList = ol;
    _player = pl;
    notesEditor = ne;
    eventSequenceEditors = ece;
    operationList = ol;
    player = pl;
}

export const selectedLineNumber = writable(0);
export const activeSidebar = writable(Sidebar.DEFAULT);
export const activeSecondarySidebar = writable(SecondarySidebar.LINES);
export const previousActiveSecondarySidebar = writable(SecondarySidebar.LINES);

export const selectedNote = writable<Note | null>(null);
export const selectedNotes = writable<Set<Note> | null>(null);
export const selectedNode = writable<EventStartNode<any> | EventEndNode<any> | null>(null);
export const selectedNodes = writable<Set<EventStartNode<any>> | null>(null);
export const timeDivisor = writable(4);

export const playerShowsUI = writable(true);
export const playerShowsLineID = writable(false);
export const playerHitEffectNoFollows = writable(true);
export const playerShowsCurve = writable(false);
export const playerCameraZoom = writable(1);

export const notesEditChecked = writable(false);
export const notesShowsNNN = writable(false);
export const notesNoteType = writable(NoteType.tap);
export const notesTimeSpan = writable(4);
export const notesScopeSelectMode = writable(SelectState.none);
export const notesPositionCenter = writable(0);
export const notesPositionXInterval = writable(135);
export const notesAbove = writable(true);

export const eventsEditChecked = writable(false);
export const eventsLayer = writable<"0" | "1" | "2" | "3" | "ex">("0");
export const eventsType = writable<keyof typeof EventType>("moveX");
export const eventsTimeSpan = writable(4);
export const eventsScopeSelectMode = writable(SelectState.none);
export const newNodeState = writable(NewNodeState.controlsBoth);

export const useEasing = writable(1);
export const templateName = writable("");

const ALL_EVENT_TYPES = [
    "alpha", "moveX", "moveY", "rotate", "speed",
    "scaleX", "scaleY", "text", "color",
    "bpm", "easing"
] satisfies (keyof typeof EventType)[];

function switchEasing(name: string) {
    if (!_operationList || !_eventSequenceEditors) return;
    const easing = _operationList.chart.templateEasingLib.get(name);
    if (!easing) return;
    const seq = easing.eventNodeSequence;
    if (_eventSequenceEditors.activatedEditor.type === EventType.easing) {
        _eventSequenceEditors.easing.targetEasing = easing;
        _eventSequenceEditors.easing.target = seq;
        _eventSequenceEditors.easing.draw();
    }
}

selectedLineNumber.subscribe(v => {
    if (!_player || !_notesEditor || !_eventSequenceEditors) return;
    _player.greenLine = v;
    _notesEditor.target = _player.chart.judgeLines[v];
    _eventSequenceEditors.changeTarget({
        judgeLine: _player.chart.judgeLines[v]
    });
    _notesEditor.draw();
    _eventSequenceEditors.draw();
    _player.render();
});

timeDivisor.subscribe(v => {
    if (!_notesEditor || !_eventSequenceEditors) return;
    _notesEditor.timeDivisor = v;
    _eventSequenceEditors.timeDivisor = v;
    _notesEditor.draw();
    _eventSequenceEditors.draw();
});

playerShowsUI.subscribe(v => {
    if (_player && _player.showsInfo !== v) {
        _player.showsInfo = v;
        _player.render();
    }
});

playerShowsLineID.subscribe(v => {
    if (_player && _player.showsLineID !== v) {
        _player.showsLineID = v;
        _player.render();
    }
});

playerHitEffectNoFollows.subscribe(v => {
    if (_player) _player.hitEffectNoFollows = v;
});

playerShowsCurve.subscribe(v => {
    if (_player) _player.showsLineCurve = v;
});

playerCameraZoom.subscribe(v => {
    if (_player) {
        _player.cameraRatio = v;
        _player.render();
    }
});

notesEditChecked.subscribe(v => {
    if (!_notesEditor) return;
    _notesEditor.state = v ? NotesEditorState.edit : NotesEditorState.select;
});

notesShowsNNN.subscribe(v => {
    if (!_notesEditor) return;
    if (_notesEditor.showsNNNListAttachable !== v) {
        _notesEditor.showsNNNListAttachable = v;
        _notesEditor.draw();
    }
});

notesNoteType.subscribe(v => {
    if (!_notesEditor) return;
    if (_notesEditor.noteType !== v) {
        _notesEditor.noteType = v;
        _notesEditor.draw();
    }
});

notesTimeSpan.subscribe(v => {
    if (!_notesEditor) return;
    _notesEditor.timeSpan = v;
    _notesEditor.draw();
});

notesScopeSelectMode.subscribe(v => {
    if (!_notesEditor) return;
    _notesEditor.selectState = v;
    if (v !== SelectState.none) {
        _notesEditor.state = NotesEditorState.selectScope;
        _notesEditor.lastSelectState = v;
    } else {
        _notesEditor.state = NotesEditorState.select;
    }
    _notesEditor.draw();
});

notesPositionCenter.subscribe(v => {
    if (!_notesEditor) return;
    _notesEditor.setValueAsCenter(v);
    _notesEditor.draw();
});

notesPositionXInterval.subscribe(v => {
    if (!_notesEditor) return;
    _notesEditor.positionGridSpan = v;
    _notesEditor.draw();
});

notesAbove.subscribe(v => {
    if (_notesEditor) _notesEditor.noteAbove = v;
});

eventsEditChecked.subscribe(v => {
    if (!_eventSequenceEditors) return;
    const activatedEditor = _eventSequenceEditors.activatedEditor;
    activatedEditor.state = v ? EventCurveEditorState.edit : EventCurveEditorState.select;
});

eventsLayer.subscribe(v => {
    if (!_eventSequenceEditors) return;
    _eventSequenceEditors.changeTarget({ layerID: v });
});

eventsType.subscribe(v => {
    if (!_eventSequenceEditors) return;
    (_eventSequenceEditors as any).activatedEditor = (_eventSequenceEditors as any)[v];
    eventsEditChecked.set(_eventSequenceEditors.activatedEditor.state === EventCurveEditorState.edit);
    if (v === "easing") {
        switchEasing(get(templateName));
    }
});

eventsTimeSpan.subscribe(v => {
    if (!_eventSequenceEditors) return;
    for (const key of ALL_EVENT_TYPES) {
        (_eventSequenceEditors as any)[key].timeSpan = v;
    }
    _eventSequenceEditors.draw();
});

eventsScopeSelectMode.subscribe(v => {
    if (!_eventSequenceEditors) return;
    _eventSequenceEditors.activatedEditor.selectState = v;
    if (v !== SelectState.none) {
        _eventSequenceEditors.activatedEditor.state = EventCurveEditorState.selectScope;
        _eventSequenceEditors.activatedEditor.lastSelectState = v;
    } else {
        _eventSequenceEditors.activatedEditor.state = EventCurveEditorState.select;
    }
});

newNodeState.subscribe(v => {
    if (!_eventSequenceEditors) return;
    for (const key of ALL_EVENT_TYPES) {
        (_eventSequenceEditors as any)[key].newNodeState = v;
    }
});

useEasing.subscribe(v => {
    if (_eventSequenceEditors) {
        _eventSequenceEditors.useEasing = easingArray[v];
    }
});

templateName.subscribe(v => {
    if (_operationList) switchEasing(v);
});

export function restoreStates() {
    selectedLineNumber.set(0);
    activeSidebar.set(Sidebar.DEFAULT);
    activeSecondarySidebar.set(SecondarySidebar.LINES);
    previousActiveSecondarySidebar.set(SecondarySidebar.LINES);

    selectedNote.set(null);
    selectedNotes.set(null);
    selectedNode.set(null);
    selectedNodes.set(null);
    timeDivisor.set(4);

    playerShowsUI.set(true);
    playerShowsLineID.set(false);
    playerHitEffectNoFollows.set(true);
    playerShowsCurve.set(false);
    playerCameraZoom.set(1);

    notesEditChecked.set(false);
    notesShowsNNN.set(false);
    notesNoteType.set(NoteType.tap);
    notesTimeSpan.set(4);
    notesScopeSelectMode.set(SelectState.none);
    notesPositionCenter.set(0);
    notesPositionXInterval.set(135);
    notesAbove.set(true);

    eventsEditChecked.set(false);
    eventsLayer.set("0");
    eventsType.set("moveX");
    eventsTimeSpan.set(4);
    eventsScopeSelectMode.set(SelectState.none);

    useEasing.set(1);
    templateName.set("");
}
