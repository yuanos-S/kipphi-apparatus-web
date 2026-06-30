<script lang="ts">
    /**
     * Apple 风格开关按钮
     * - pill 形轨道 + 圆形滑块
     * - bgText 作为标签显示在开关左侧
     */
    
    let {
        bgText,
        onText,
        offText,
        wide,
        "class": className = "",
        checked = $bindable(false),
        disabled = false,
        onchange: onChange
    }: {
        bgText?: string;
        onText: string;
        offText: string;
        wide?: boolean;
        "class"?: string;
        checked?: boolean;
        disabled?: boolean;
        onchange?: (checked: boolean) => void;
    } = $props();

    function toggle() {
        if (disabled) return;
        checked = !checked;
        onChange?.(checked);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="toggle-wrapper {className}"
    class:wide
    class:disabled
    role="switch"
    aria-checked={checked}
    tabindex={disabled ? -1 : 0}
    onclick={toggle}
    onkeydown={handleKeydown}
>
    {#if bgText}
        <span class="toggle-label">{bgText}</span>
    {/if}
    <div class="toggle-track" class:on={checked}>
        <div class="toggle-knob"></div>
    </div>
    {#if onText && offText}
        <span class="toggle-state-text">{checked ? onText : offText}</span>
    {/if}
</div>

<style>
    .toggle-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
        padding: 0.2em 0;
    }
    .toggle-wrapper.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .toggle-wrapper.wide {
        display: flex;
        width: 100%;
        justify-content: space-between;
    }

    .toggle-label {
        font-size: var(--font-size-small);
        color: var(--color-foreground);
        white-space: nowrap;
        flex-shrink: 0;
    }
    .toggle-wrapper.wide .toggle-label {
        flex: 1;
        min-width: 0;
        white-space: normal;
        word-break: break-all;
        line-height: 1.2;
    }

    .toggle-track {
        position: relative;
        width: 44px;
        height: 26px;
        border-radius: 13px;
        background: #ccc;
        transition: background 0.25s ease;
        flex-shrink: 0;
    }
    .toggle-track.on {
        background: #34c759;
    }

    .toggle-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: transform 0.25s ease;
    }
    .toggle-track.on .toggle-knob {
        transform: translateX(18px);
    }

    .toggle-state-text {
        font-size: var(--font-size-smaller);
        color: var(--color-foreground);
        opacity: 0.6;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: 1.5em;
        text-align: center;
    }

    .toggle-wrapper:focus-visible .toggle-track {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>