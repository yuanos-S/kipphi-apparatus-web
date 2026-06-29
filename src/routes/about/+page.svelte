<script lang="ts">
    import Navigator from "#/components/Navigator.svelte";
    import { _ } from "#/i18n";
    import "./patch";
</script>

<main class="container">
    <Navigator></Navigator>
    <div class="content">
        <h1>{$_("about.title")}</h1>
        <p>{$_("about.desc")}</p>

        <div class="notice">
            <p>This is a <strong>Web Edition</strong> based on the original
            <a href="https://github.com/TeamZincs/kipphi-apparatus" target="_blank" rel="noopener">KipPhi Apparatus</a>
            by Zes M Young / TeamZincs (MIT Licensed).</p>
            <p>Converted from Tauri desktop app to pure browser web app.
            All file operations use IndexedDB. Data stays in your browser.</p>
        </div>

        <div class="table">
            <span>{$_("about.apparatus")}</span><span>{__APP_VERSION}</span>
            <span>{$_("about.kipphi")}</span><span>{__KIPPHI_VERSION}</span>
            <span>{$_("about.player")}</span><span>{__PLAYER_VERSION}</span>
            <span>{$_("about.canvasEditor")}</span><span>{__CANVAS_EDITOR_VERSION}</span>
        </div>

        <div class="table-3">
            {#each __DEPENDENCIES as dep}
                <span>{dep.name}</span><span>{dep.version}</span><span>{dep.license}</span>
            {/each}
        </div>
    </div>
</main>

<style lang="less" scoped>
    @import "#/components/mixin.less";

    .container {
        background-color: var(--color-bg);
        min-height: var(--dvh);
        color: var(--color-foreground);
    }

    .content {
        padding: 6em 2em 2em;
        box-sizing: border-box;
        min-height: var(--dvh);
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    h1 {
        color: var(--color-foreground);
        margin: 0;
    }

    p {
        color: var(--color-foreground);
        font-size: var(--font-size-medium);
        line-height: 1.6;
        max-width: 800px;
    }

    .table {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px;
        border-radius: var(--border-radius);
        border: 1px solid var(--color-border);
        padding: 4px;
        background: var(--color-surface);
        color: var(--color-foreground);

        span {
            padding: 0.5em;
            background: var(--color-card-bg);
            border-radius: 2px;
        }
    }

    .table-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
        border-radius: var(--border-radius);
        border: 1px solid var(--color-border);
        padding: 4px;
        background: var(--color-surface);
        color: var(--color-foreground);

        span {
            padding: 0.5em;
            background: var(--color-card-bg);
            border-radius: 2px;
            font-size: var(--font-size-small);
            word-break: break-word;
        }
    }

    .notice {
        background: var(--color-primary-bg);
        border: 1px solid var(--color-primary);
        border-radius: var(--border-radius);
        padding: 1em;
        margin: 0.5em 0;

        p {
            color: var(--color-foreground);
            font-size: var(--font-size-small);
            margin: 0.5em 0;
        }

        a {
            color: var(--color-text-link);
        }
    }

    /* 响应式适配 */
    @media (max-width: 768px) {
        .content {
            padding: 5em 1em 1em;
        }

        .table {
            grid-template-columns: 1fr;
        }

        .table-3 {
            grid-template-columns: 1fr;
        }
    }
</style>
