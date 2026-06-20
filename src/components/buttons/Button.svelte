<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        onclick,
        text,
        children,
        variant = "default",
        disabled = false
    }: {
        onclick: (event: MouseEvent) => void,
        text?: string
        children?: Snippet,
        variant?: "default" | "progressive" | "destructive",
        disabled?: boolean
    } = $props()
</script>
<button
    onclick={(e) => !disabled && onclick(e)}
    class:progressive={variant === "progressive"}
    class:destructive={variant === "destructive"}
    class:disabled
>
    {#if children}
        {@render children()}
    {:else}
        {text}
    {/if}
</button>
<style lang="less" scoped>
    @import "#/components/mixin.less";
    button {
        background-color: #f9f9f9;
        color: black;
        font-size: 2.5vh;
        appearance: none;
        border: none;
        .wide-button;
        transition: all 0.15s ease;
        cursor: pointer;
        &:active {
            transform: scale(0.97);
        }
        &.progressive {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            &:hover {
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.4);
            }
        }
        &.destructive {
            background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%);
            color: white;
            &:hover {
                box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
            }
        }
        &.disabled {
            pointer-events: none;
            filter: grayscale(0.9);
            opacity: 0.6;
        }
        &:hover {
            background-color: #eee;
        }
    }
</style>