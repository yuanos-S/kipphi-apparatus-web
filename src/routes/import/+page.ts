
import { queryCharts } from "../../background";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    return {
        chartInfos: await queryCharts(),
        meta: { CHART_DIR: "(浏览器 IndexedDB)" }
    };
    
};