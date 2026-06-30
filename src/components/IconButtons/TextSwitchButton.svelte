<script lang="ts">
    /**
     * 开关按钮组件
     * 支持两种样式：apple（苹果风格 pill 滑块）和 classic（经典 N/Y 按钮）
     * 样式根据 toggleStyle 设置自动切换，默认为 auto（自动检测 Apple 设备）
     */
    import { KPASettings } from "#/settings.svelte";
    import { isAppleDevice } from "#/userData";

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

    /** 计算当前应使用的样式 */
    const resolvedStyle = $derived(
        KPASettings.toggleStyle === "auto"
            ? (isAppleDevice() ? "apple" : "classic")
            : KPASettings.toggleStyle
    );
</script>

{#if resolvedStyle === "apple"}
    <!-- Apple 风格：pill 形轨道 + 圆形滑块 -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="toggle-wrapper apple {className}"
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
{:else}
    <!-- 经典风格：N/Y 文字按钮 -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="toggle-wrapper classic {className}"
        class:wide
        class:disabled
        role="switch"
        aria-checked={checked}
        tabindex={disabled ? -1 : 0}
        onclick={toggle}
        onkeydown={handleKeydown}
    >
        {#if bgText}
            <span class="classic-label">{bgText}</span>
        {/if}
        <div class="classic-btn" class:on={checked}>
            {checked ? onText : offText}
        </div>
    </div>
{/if}

<style>
    /* ========== 公共样式 ========== */
    .toggle-wrapper {
        display: inline-flex;
        align-items: center;
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

    /* ========== Apple 风格 ========== */
    .toggle-wrapper.apple {
        gap: 0.6em;
    }
    .toggle-wrapper.apple.wide {
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
    .toggle-wrapper.apple.wide .toggle-label {
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

    .toggle-wrapper.apple:focus-visible .toggle-track {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    /* ========== 经典风格 ========== */
    .toggle-wrapper.classic {
        gap: 0.5em;
    }
    .toggle-wrapper.classic.wide {
        display: flex;
        width: 100%;
        justify-content: space-between;
    }

    .classic-label {
        font-size: var(--font-size-small);
        color: var(--color-foreground);
        white-space: nowrap;
        flex-shrink: 0;
    }
    .toggle-wrapper.classic.wide .classic-label {
        flex: 1;
        min-width: 0;
        white-space: normal;
        word-break: break-all;
        line-height: 1.2;
    }

    .classic-btn {
        width: 2.4em;
        height: 2.4em;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-small);
        font-weight: 700;
        background: var(--color-surface);
        color: var(--color-foreground-muted);
        border: 2px solid var(--color-border);
        transition: all 0.15s;
        flex-shrink: 0;
    }
    .classic-btn.on {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
    }

    .toggle-wrapper.classic:focus-visible .classic-btn {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>