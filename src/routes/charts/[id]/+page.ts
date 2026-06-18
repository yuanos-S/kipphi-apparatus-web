import { Chart, type ChartDataKPA, type ChartDataKPA2, type ChartDataRPE } from "kipphi";
import { getChartProject, queryMeta, readAFileInChart, type ChartMetadata } from "#/background";
import type { PageLoad } from "./$types";
import { setID } from "./store.svelte";
import { KPAError } from "kipphi";
import { error } from "@sveltejs/kit";
import { base } from "$app/paths";

export const load: PageLoad = async (event) => {
    const chartId = event.params.id;
    setID(chartId);
    // 防止缓冲区堆积错误
    KPAError.flush();
    try {
        const {chart, music, illustration} = await getChartProject(chartId)
        return {
            chart,
            music,
            illustration,
            tap: `${base}/Tap.wav`,
            drag: `${base}/Drag.wav`,
            flick: `${base}/Flick.wav`,
            anchorImg: `${base}/Anchor.png`,
            belowImg: `${base}/Below.png`,
            selectNoteImg: `${base}/selectNote.png`,
            startNodeImg: `${base}/South.png`,
            endNodeImg: `${base}/North.png`,
        };
    } catch (e) {
        error(500, e)
    }
};





