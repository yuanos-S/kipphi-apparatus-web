<script lang="ts">
    import { Trash2, RotateCcw, Trash } from "@lucide/svelte";
    import Navigator from "#/components/Navigator.svelte";
    import { _ } from "#/i18n";
    import { queryTrash, restoreFromTrash, permanentlyDeleteFromTrash, emptyTrash, type TrashEntry } from "#/background";
    import ImageLoader from "#/components/ImageLoader.svelte";
    import ProgressiveButton from "#/components/buttons/ProgressiveButton.svelte";
    import DestructiveButton from "#/components/buttons/DestructiveButton.svelte";
    import { notify } from "#/notify.svelte";

    let trashList: TrashEntry[] = $state([]);
    let loading = $state(true);

    async function loadTrash() {
        loading = true;
        try {
            trashList = await queryTrash();
        } catch (e) {
            console.error(e);
        }
        loading = false;
    }

    loadTrash();

    async function restore(identifier: string, title: string) {
        try {
            await restoreFromTrash(identifier);
            notify(`已恢复: ${title}`, "info");
            await loadTrash();
        } catch (e) {
            notify(`恢复失败: ${e}`, "error");
        }
    }

    async function permanentlyDelete(identifier: string, title: string) {
        if (!confirm(`确定要永久删除 "${title}" 吗？此操作不可撤销。`)) {
            return;
        }
        try {
            await permanentlyDeleteFromTrash(identifier);
            notify(`已永久删除: ${title}`, "info");
            await loadTrash();
        } catch (e) {
            notify(`删除失败: ${e}`, "error");
        }
    }

    async function emptyAll() {
        if (trashList.length === 0) return;
        if (!confirm("确定要清空回收站吗？所有谱面将被永久删除，此操作不可撤销。")) {
            return;
        }
        try {
            await emptyTrash();
            notify("回收站已清空", "info");
            await loadTrash();
        } catch (e) {
            notify(`清空失败: ${e}`, "error");
        }
    }

    function formatDate(ts: number): string {
        const d = new Date(ts);
        return d.toLocaleString();
    }
</script>

<main class="container">
    <Navigator>
        <span class="header-title">
            <Trash2 size="20"/>
            回收站
        </span>
        {#if trashList.length > 0}
            <DestructiveButton onclick={emptyAll}>
                <Trash size="16"/>
                清空回收站
            </DestructiveButton>
        {/if}
    </Navigator>
    <div class="content">
        {#if loading}
            <p class="loading">加载中...</p>
        {:else if trashList.length === 0}
            <div class="empty">
                <Trash2 size="64"/>
                <p>回收站为空</p>
            </div>
        {:else}
            <p class="hint">共 {trashList.length} 个已删除的谱面</p>
            <ul id="charts">
                {#each trashList as entry}
                    <li class="chart">
                        <ImageLoader src={entry.image} alt={entry.identifier} />
                        <div class="chart-title">{entry.title} ({entry.type})</div>
                        <div class="chart-meta">
                            删除于: {formatDate(entry.deletedAt)}
                        </div>
                        <div class="chart-operations">
                            <a
                                class="restore-link"
                                role="button"
                                onclick={(e) => { e.preventDefault(); restore(entry.identifier, entry.title); }}
                            >
                                <RotateCcw size="18"/> 恢复
                            </a>
                            <a
                                class="delete-link"
                                role="button"
                                onclick={(e) => { e.preventDefault(); permanentlyDelete(entry.identifier, entry.title); }}
                            >
                                <Trash2 size="18"/> 永久删除
                            </a>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</main>

<style lang="less">
    .container {
        display: flex;
        flex-direction: column;
        min-height: var(--dvh);
        background: var(--color-bg);
        color: var(--color-foreground);
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 0.5em;
        color: white;
        font-size: 1.2em;
    }

    .content {
        padding: 6em 2em 2em;
        box-sizing: border-box;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    .loading, .empty {
        text-align: center;
        padding: 3em;
        color: var(--color-foreground-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
    }

    .hint {
        color: var(--color-foreground-muted);
        margin: 0;
    }

    #charts {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .chart {
        position: relative;
        border-radius: 10px;
        background-color: var(--color-surface);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        height: 40vh;
        min-height: 200px;
        max-height: 400px;
        overflow: hidden;
        border: 1px solid var(--color-border);
    }

    .chart :global(img) {
        height: 100%;
        object-fit: cover;
        aspect-ratio: 4 / 3;
    }

    .chart-title {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        color: white;
        font-size: 150%;
        padding: 0.5em 0.8em;
        background-image: linear-gradient(to top, #00000000, #000000aa);
        box-sizing: border-box;
    }

    .chart-meta {
        position: absolute;
        bottom: 3em;
        left: 0;
        right: 0;
        color: white;
        font-size: 80%;
        padding: 0.3em 0.8em;
        background: rgba(0,0,0,0.6);
        box-sizing: border-box;
    }

    .chart-operations {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        background: rgba(0,0,0,0.7);
    }

    .chart-operations a {
        flex: 1;
        padding: 0.8em;
        color: white;
        text-align: center;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5em;
        transition: background 0.2s;
        text-decoration: none;
    }

    .restore-link {
        background: rgba(39, 174, 96, 0.3);
    }
    .restore-link:hover {
        background: rgba(39, 174, 96, 0.5);
    }

    .delete-link {
        background: rgba(231, 76, 60, 0.3);
    }
    .delete-link:hover {
        background: rgba(231, 76, 60, 0.5);
    }

    @media (max-width: 768px) {
        .content {
            padding: 5em 1em 1em;
        }
        .chart {
            height: 30vh;
            min-height: 150px;
        }
    }
</style>
