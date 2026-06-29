<script lang="ts">
    /**
     * 竖屏提示横屏组件
     * 当移动端用户处于竖屏模式时显示提示，引导用户横屏使用
     * 仅在移动端显示，PC端自动隐藏
     */
    import { onMount, onDestroy } from "svelte";
    import { RotateCw } from "@lucide/svelte";
    import { isMobileDevice } from "#/userData";

    let isPortrait = $state(false);
    let isMobile = $state(false);

    function checkOrientation() {
        isPortrait = window.innerHeight > window.innerWidth;
        isMobile = isMobileDevice();
    }

    onMount(() => {
        checkOrientation();
        window.addEventListener("resize", checkOrientation);
        window.addEventListener("orientationchange", checkOrientation);
    });

    onDestroy(() => {
        window.removeEventListener("resize", checkOrientation);
        window.removeEventListener("orientationchange", checkOrientation);
    });
</script>

{#if isMobile && isPortrait}
    <div class="rotate-prompt">
        <div class="rotate-icon">
            <RotateCw size={48} />
        </div>
        <h3>请横屏使用</h3>
        <p>为了获得最佳体验，请将设备横过来</p>
        <p class="hint">横屏后自动消失</p>
    </div>
{/if}

<style lang="less">
    .rotate-prompt {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99999;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .rotate-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66ddff 0%, #55ccee 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        animation: rotateHint 2s ease-in-out infinite;
    }

    @keyframes rotateHint {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(90deg); }
    }

    h3 {
        font-size: 1.5em;
        margin: 0 0 12px 0;
        font-weight: 600;
    }

    p {
        font-size: 1em;
        margin: 4px 0;
        opacity: 0.8;
    }

    .hint {
        font-size: 0.85em;
        opacity: 0.5;
        margin-top: 16px;
    }
</style>
