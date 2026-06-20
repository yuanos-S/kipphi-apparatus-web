<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { getExtension } from "#/util"

  import { type PageData } from "./$types";
  import { _ } from "#/i18n";

  import { EasingType, EvaluatorType, EventNodeSequence, SCHEMA, VERSION, 
    type BPMSegmentData, type ChartDataKPA2, type EventLayerDataKPA2,
    type EventNodeSequenceDataKPA2, type EventType, type EventValueESType, type JudgeLineDataKPA2
  } from "kipphi";
  
  import { type ChartMetadata, chartExists, saveTextFileToChart, saveBinaryFileToChart } from "#/background";
  import Navigator from "#/components/Navigator.svelte";

  const { data }: { data: PageData } = $props();
  const identifiers = new Set(data.chartInfos.map((info) => info.identifier));


  //#region 
  function getDuration(blob: Blob): Promise<number> {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return new Promise((resolve) => {
      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      }, {once: true});
    });
  }


  async function createChart(
    music: File,
    title: string,
    baseBPM: number,
  ): Promise<ChartDataKPA2> {
    const duration = await getDuration(music);
    if (!duration) {
      throw new Error("No duration found");
    }

    const eventNodeSequenceData: EventNodeSequenceDataKPA2<EventValueESType>[] = [];
    const orphanLines: JudgeLineDataKPA2[] = [];
    const bpmList: BPMSegmentData[] = [
      {
        bpm: baseBPM,
        startTime: [0, 0, 1],
      },
    ];
    const judgeLineGroups: string[] = ["Default"];
    const addSequence = (
      id: string,
      type: Exclude<EventType, EventType.bpm | EventType.easing>,
    ) => {
      const defaultValue = EventNodeSequence.getDefaultValueFromEventType(type);
      const data: EventNodeSequenceDataKPA2<EventValueESType> = {
        id,
        type,
        events: [
          {
            startTime: [0, 0, 1],
            endTime: [1, 0, 1],
            start: defaultValue as EventValueESType,
            end: defaultValue as EventValueESType,
            evaluator: {
              type: EvaluatorType.eased,
              easing: {
                type: EasingType.normal,
                identifier: 1
              }
            }
          },
        ],
        final: {
          start: defaultValue as EventValueESType,
          startTime: [1, 0, 1],
          evaluator: {
            type: EvaluatorType.eased,
            easing: {
              type: EasingType.normal,
              identifier: 1
            }
          }
        }
      };
      eventNodeSequenceData.push(data);
      return id;
    };
    const addJudgeLine = (i: number) => {
      const eventLayer: EventLayerDataKPA2 = {
        moveX: addSequence(`#${i}.0.moveX`, 0),
        moveY: addSequence(`#${i}.0.moveY`, 1),
        rotate: addSequence(`#${i}.0.rotate`, 2),
        alpha: addSequence(`#${i}.0.alpha`, 3)
      };
      const data: JudgeLineDataKPA2 = {
        id: i,
        group: 0,
        hnLists: {},
        nnLists: {},
        name: "untitled",
        texture: "line.png",
        eventLayers: [eventLayer],
        cover: true,
        speedEventNodeSeq: addSequence(`#${i}.speed`, 4),
        rotatesWithFather: false,
        anchor: [0.5, 0.5],
        zOrder: 0,
        children: [],
      };
      orphanLines.push(data);
    };
    for (let i = 0; i < 24; i++) {
      addJudgeLine(i);
    }
    return {
      version: VERSION,
      $schema: SCHEMA,
      offset: 0,
      duration: duration,
      info: {
        level: "0",
        name: title,
        charter: "",
        illustrator: "",
        composer: ""
      },
      ui: {},
      wrapperEasings: [],
      
      templateEasings: [],
      macroEvaluators: [],
      timeMacros: [],
      valueMacros: [],
      eventNodeSequences: eventNodeSequenceData,
      orphanLines,
      bpmList,
      judgeLineGroups,
    };
  }

  async function create() {
    if (creating) return;
    if (idInput.value.trim() === "") {
      idState = EMPTY;
      return;
    }
    if (nameInput.value.trim() === "") {
      alert($_("create.alert.name"));
      return;
    }
    const bpm = bpmInput.valueAsNumber;
    if (isNaN(bpm) || bpm <= 0) {
      alert($_("create.alert.bpm"))
    }
    const music = musicFileInput.files?.[0];
    if (!music) {
      alert($_("form.alert.music"));
      return;
    }
    const illustration = illustrationFileInput.files?.[0];
    if (!illustration) {
      alert($_("form.alert.illustration"));
      return;
    }

    creating = true;
    try {
      const chart = await createChart(music, nameInput.value, bpm);
      const chartData = JSON.stringify(chart, null, 2);
      const id = idInput.value.trim();
      const imageExt = getExtension(illustration);
      if (imageExt === null) {
        alert($_("form.alert.unknownImageType", {values:{filename: illustration.name}}));
        return;
      }
      const audioExt = getExtension(music);
      if (audioExt === null) {
        alert($_("form.alert.unknownAudioType", {values:{filename: music.name}}));
        return;
      }

      if (await chartExists(id)) {
        alert($_("form.alert.folderOccupied", {values:{folder: id}}));
        return;
      }

      const [illustrationBuf, musicBuf] = await Promise.all([
        illustration.arrayBuffer(),
        music.arrayBuffer(),
      ]);

      await Promise.all([
        saveTextFileToChart(id, "metadata.json", JSON.stringify({
          "chart": "chart.kpa.json",
          "illustration": `illustration.${imageExt}`,
          "music": `music.${audioExt}`,
          "title": nameInput.value.trim(),
          "type": "KPA2",
          "durationSecs": chart.duration
        } satisfies ChartMetadata)),
        saveTextFileToChart(id, "chart.kpa.json", chartData),
        saveBinaryFileToChart(id, `illustration.${imageExt}`, new Uint8Array(illustrationBuf)),
        saveBinaryFileToChart(id, `music.${audioExt}`, new Uint8Array(musicBuf)),
      ]);

      success = true;
      setTimeout(() => {
        goto(`${base}/charts/${id}`);
      }, 800);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      creating = false;
    }

  }

  //#endregion
  let idInput: HTMLInputElement,
    nameInput: HTMLInputElement,
    bpmInput: HTMLInputElement,
    illustrationFileInput: HTMLInputElement,
    musicFileInput: HTMLInputElement;

  const getColor = (state: State) => {
    switch (state) {
      case AVAILABLE:
        return "green";
      case OCCUPIED:
      case EMPTY:
      case INVALID:
        return "red";
    }
  };
  const getContent = (state: State) => {
    switch (state) {
      case AVAILABLE:
        return $_("form.idState.available");
      case OCCUPIED:
        return $_("form.idState.occupied");
      case EMPTY:
        return $_("form.idState.empty");
      case INVALID:
        return $_("form.idState.invalid");
    }
  };

  const checkId = () => {
    if (idInput.value.trim() === "") {
      idState = EMPTY;
    } else if (identifiers.has(idInput.value)) {
      idState = OCCUPIED;
    } else if (idInput.value.match(/[^a-zA-Z0-9-_]/)) {
      idState = INVALID;
    } else {
      idState = AVAILABLE;
    }
  };

  
  const INITIAL = 0;
  const AVAILABLE = 1;
  const OCCUPIED = 2;
  const EMPTY = 3;
  const INVALID = 4;
  type State = 0 | 1 | 2 | 3 | 4;

  let success: boolean = $state(false);
  let creating: boolean = $state(false);
  let idState: State = $state(INITIAL);
</script>

<main>

  <Navigator></Navigator>
  <p>{$_("form.hint")}<br>
    {$_("form.chartsLocation", { values: { location: "(浏览器 IndexedDB)" } })}
  </p>
  <div role="form">
    <label for="id">{$_("form.id")}</label>
    <input
      type="text"
      bind:this={idInput}
      placeholder="Identifier"
      oninput={checkId}
      onfocusout={checkId}
    />
    {#if idState !== INITIAL}
      <span
        style="color: {getColor(idState)};
      font-size: small;
      grid-column: 1 /span 2"
      >
        {getContent(idState)}
      </span>
    {/if}
    <label for="name">{$_("create.name")}</label>
    <input type="text" bind:this={nameInput} placeholder="Song Name" />
    <label for="bpm">{$_("create.bpm")}</label>
    <input type="number" bind:this={bpmInput} placeholder="BPM" />
    <label for="illustration">{$_("form.illustration")}</label>
    <input type="file" bind:this={illustrationFileInput} accept="image/*" />
    <label for="music">{$_("form.music")}</label>
    <input type="file" bind:this={musicFileInput} accept="audio/*"/>
    <input type="button" value={creating ? "Loading..." : $_("create.create")} onclick={create} disabled={creating} />
    {#if creating}
      <div class="loading-bar"><div class="loading-bar-fill"></div></div>
    {/if}
    {#if success}
      <p>{$_("create.success")}</p>
    {/if}
  </div>
</main>

<style>
  @import "#/formPage.css";
  .loading-bar {
    grid-column: 1 / span 2;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
    overflow: hidden;
  }
  .loading-bar-fill {
    height: 100%;
    background: #6df;
    animation: loadingSlide 1.2s ease-in-out infinite;
  }
  @keyframes loadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  input[type="button"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
