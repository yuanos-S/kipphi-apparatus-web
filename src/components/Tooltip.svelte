<script lang="ts">
    import type { Snippet } from "svelte";
    import Portal from "svelte-portal";

    let { children }: { children: Snippet } = $props();
    let hovering = $state(false);
    let tooltipEl: HTMLElement;
    let contentEl: HTMLElement;
    let top = $state(0);
    let left = $state(0);

    $effect(() => {
        if (hovering && tooltipEl && contentEl) {
            const rect = tooltipEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            
            // 显示在tooltip元素下方，子元素右侧对齐父元素右侧
            top = rect.bottom + 8;
            const newLeft = rect.right - contentRect.width;
            if (newLeft < 0) {
                left = rect.right;
            } else {
                left = newLeft;
            }
        }
    });
</script>

<span class="tooltip" bind:this={tooltipEl} onmouseenter={() => hovering = true} onmouseleave={() => hovering = false} role="button" tabindex="0">
    ?
    {#if hovering}
        <Portal target="body">
            <div class="tooltip-content" bind:this={contentEl} style="top: {top}px; left: {left}px;">
                {@render children()}
            </div>
        </Portal>
    {/if}
</span>
<style scoped lang="less">
    .tooltip {
        font-size: 80%;
        display: inline-block;
        border-radius: 50%;
        border: 2px solid var(--color-foreground);
        width: 1.5em;
        color: var(--color-foreground);
        text-align: center;
        font-weight: bold;
        cursor: pointer;
        opacity: 60%;
        transition: all 0.15s;
        &:hover {
            background-color: var(--color-foreground);
            color: var(--color-bg);
            border-color: var(--color-foreground);
            opacity: 100%;
        }
    }
    .tooltip-content {
        position: fixed;
        width: max-content;
        max-width: 280px;
        z-index: 10000;
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius);
        color: var(--color-foreground);
        padding: 0.5em 0.75em;
        white-space: pre-wrap;
        font-size: var(--font-size-smaller);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
        line-height: 1.4;
    }
</style>