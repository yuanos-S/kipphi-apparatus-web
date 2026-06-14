<script lang="ts">
    import ProgressiveButton from "#/components/buttons/ProgressiveButton.svelte";
    import Navigator from "#/components/Navigator.svelte";
    import { convertPEZ, convertRPEJSON } from "#/convertChart";
    import { _ } from "#/i18n";

    import type { PageData } from "./$types";

    let { data }: { data: PageData} = $props();

    const chartId = data.id;

    function downloadFile(fileName: string, content: ArrayBuffer | string) {
        const blob = typeof content === "string"
            ? new Blob([content], { type: "application/json" })
            : new Blob([content]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

</script>

<main>
    <Navigator />
    <div id="content">
        <ProgressiveButton onclick={
            async () => {
                const json = await convertRPEJSON(chartId);
                downloadFile(`${chartId}.rpe.json`, json);
            }
        }>{$_("export.convertToRPEJSONOnly")}</ProgressiveButton>
        <ProgressiveButton onclick={
            async () => {
                const pez = await convertPEZ(chartId);
                downloadFile(`${chartId}.pez`, pez);
            }
        }>{$_("export.exportPEZ")}</ProgressiveButton>
    </div>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    #content {
        position: relative;
        font-size: 4vh;
        z-index: 1;
        position: absolute;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(16px) brightness(40%);
        color: white;
        padding-top: 10vh;
        padding-left: 10vw;
        padding-right: 10vw;
        box-sizing: border-box;
        flex: 1;
        align-content: center;
    }
</style>
