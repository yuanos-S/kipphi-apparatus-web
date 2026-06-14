import type { PageLoad } from "./$types";
import { queryCharts, readChart } from "#/background";
import type { ChartDataRPE } from "kipphi";
import type { ChartDataKPA } from "kipphi";

export const load: PageLoad = async (event) => {
    const chartInfos = await queryCharts();
    const id = event.params.id;
    const chartInfo = chartInfos.find(chartInfo => chartInfo.identifier === id);
    if (!chartInfo) {
        return {
            chartInfo: null,
            time: null,
            inKPA: false,
            meta: { TRASH_DIR: "(浏览器 IndexedDB 回收站)" }
        }
    } else {
        const chart = await readChart(id, chartInfo.chartPath);
        if ("META" in chart) {
            return {
                chartInfo,
                inKPA: false,
                time: 0,
                meta: { TRASH_DIR: "(浏览器 IndexedDB 回收站)" }
            }
        } else {
            return {
                chartInfo,
                inKPA: true,
                time: chart.chartTime,
                meta: { TRASH_DIR: "(浏览器 IndexedDB 回收站)" }
            }
        }
    }
    
};