<script lang="ts">
    /**
     * 新用户引导组件
     * 功能：
     * 1. 语言选择（默认根据浏览器语言或IP定位）
     * 2. 数据导入（可选，支持 .kyud 格式）
     * 3. 跳过按钮
     * 首次访问时显示
     */
    import { _ , locale, localeLangNames } from "#/i18n";
    import { KPASettings } from "#/settings.svelte";
    import { importUserData } from "#/userData";
    import { Upload, ChevronRight, SkipForward, Globe } from "@lucide/svelte";
    import { notify } from "#/notify.svelte";

    // 当前步骤
    let step = $state(1);
    const totalSteps = 2;

    // 选中的语言
    let selectedLang = $state(KPASettings.lang || "zh-Hans");

    // 导入相关
    let importFile: File | null = $state(null);
    let importing = $state(false);

    /**
     * 选择语言
     */
    function selectLang(lang: string) {
        selectedLang = lang;
    }

    /**
     * 下一步
     */
    function nextStep() {
        if (step < totalSteps) {
            step++;
        } else {
            finish();
        }
    }

    /**
     * 上一步
     */
    function prevStep() {
        if (step > 1) {
            step--;
        }
    }

    /**
     * 完成引导
     */
    function finish() {
        // 保存语言设置
        KPASettings.lang = selectedLang;
        locale.set(selectedLang);

        // 标记为已访问
        KPASettings.firstVisitDone = true;

        // 刷新页面以应用设置
        window.location.reload();
    }

    /**
     * 跳过引导
     */
    function skip() {
        // 保存语言设置（使用默认或已选择的）
        if (!KPASettings.lang) {
            KPASettings.lang = selectedLang;
            locale.set(selectedLang);
        }

        // 标记为已访问
        KPASettings.firstVisitDone = true;

        // 刷新页面
        window.location.reload();
    }

    /**
     * 处理文件选择
     */
    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            importFile = input.files[0];
        }
    }

    /**
     * 执行导入
     */
    async function doImport() {
        if (!importFile) return;

        importing = true;
        try {
            await importUserData(importFile, true);
            notify("数据导入成功！", "info");
        } catch (e) {
            notify(`导入失败: ${e}`, "error");
        } finally {
            importing = false;
        }
    }
</script>

<div class="onboarding-overlay">
    <div class="onboarding-modal">
        <!-- 进度条 -->
        <div class="progress-bar">
            {#each Array(totalSteps) as _, i}
                <div class="progress-dot {i + 1 <= step ? 'active' : ''} {i + 1 < step ? 'done' : ''}"></div>
                {#if i < totalSteps - 1}
                    <div class="progress-line {i + 1 < step ? 'done' : ''}"></div>
                {/if}
            {/each}
        </div>

        <!-- 步骤1: 语言选择 -->
        {#if step === 1}
            <div class="step-content">
                <div class="step-icon">
                    <Globe size={48} />
                </div>
                <h2>选择语言 / Select Language</h2>
                <p>请选择您偏好的语言</p>
                <div class="lang-list">
                    {#each Object.entries(localeLangNames) as [code, name]}
                        <button
                            class="lang-btn {selectedLang === code ? 'selected' : ''}"
                            onclick={() => selectLang(code)}
                        >
                            {name}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- 步骤2: 数据导入 -->
        {#if step === 2}
            <div class="step-content">
                <div class="step-icon">
                    <Upload size={48} />
                </div>
                <h2>导入数据</h2>
                <p>您可以导入之前备份的 .kyud 格式数据文件</p>
                <p class="hint">如果是首次使用，可以跳过此步骤</p>

                <div class="import-section">
                    <label class="upload-label">
                        <input type="file" accept=".kyud,.zip" onchange={handleFileSelect} hidden />
                        <Upload size={24} />
                        {#if importFile}
                            <span>{importFile.name}</span>
                        {:else}
                            <span>选择 .kyud 文件</span>
                        {/if}
                    </label>

                    {#if importFile}
                        <button class="import-btn" onclick={doImport} disabled={importing}>
                            {importing ? "导入中..." : "开始导入"}
                        </button>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- 底部按钮 -->
        <div class="step-actions">
            <button class="skip-btn" onclick={skip}>
                <SkipForward size={18} />
                跳过
            </button>
            <div class="nav-btns">
                {#if step > 1}
                    <button class="prev-btn" onclick={prevStep}>
                        上一步
                    </button>
                {/if}
                <button class="next-btn" onclick={nextStep}>
                    {step === totalSteps ? "完成" : "下一步"}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    </div>
</div>

<style lang="less">
    .onboarding-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .onboarding-modal {
        background: var(--color-surface, #fff);
        border-radius: 20px;
        padding: 32px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalIn 0.3s ease-out;
    }

    @keyframes modalIn {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .progress-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 32px;
        gap: 8px;
    }

    .progress-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--color-border, #e0e0e0);
        transition: all 0.3s;

        &.active {
            background: var(--color-primary, #6df);
            transform: scale(1.2);
        }

        &.done {
            background: var(--color-primary, #6df);
        }
    }

    .progress-line {
        width: 40px;
        height: 3px;
        background: var(--color-border, #e0e0e0);
        border-radius: 2px;
        transition: background 0.3s;

        &.done {
            background: var(--color-primary, #6df);
        }
    }

    .step-content {
        text-align: center;
        min-height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .step-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66ddff 0%, #55ccee 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        margin-bottom: 24px;
    }

    h2 {
        font-size: 1.5em;
        margin: 0 0 8px 0;
        color: var(--color-foreground, #1a1a1a);
    }

    p {
        color: var(--color-foreground-muted, #666);
        margin: 4px 0;
    }

    .hint {
        font-size: 0.9em;
        opacity: 0.8;
    }

    .lang-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 24px;
        width: 100%;
        max-width: 300px;
    }

    .lang-btn {
        padding: 14px 24px;
        border: 2px solid var(--color-border, #e0e0e0);
        border-radius: 12px;
        background: transparent;
        color: var(--color-foreground, #1a1a1a);
        font-size: 1.1em;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            border-color: var(--color-primary, #6df);
            background: var(--color-primary-bg, rgba(102, 221, 255, 0.1));
        }

        &.selected {
            border-color: var(--color-primary, #6df);
            background: var(--color-primary-bg, rgba(102, 221, 255, 0.1));
            color: var(--color-primary, #6df);
        }
    }

    .import-section {
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: center;
        width: 100%;
        max-width: 300px;
    }

    .upload-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 24px;
        border: 2px dashed var(--color-border, #e0e0e0);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;

        &:hover {
            border-color: var(--color-primary, #6df);
            background: var(--color-primary-bg, rgba(102, 221, 255, 0.05));
        }

        span {
            font-size: 0.95em;
            color: var(--color-foreground-muted, #666);
        }
    }

    .import-btn {
        padding: 12px 32px;
        background: var(--color-primary, #6df);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: var(--color-primary-hover, #5ce);
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }

    .step-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid var(--color-border, #e0e0e0);
    }

    .skip-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        background: transparent;
        border: none;
        color: var(--color-foreground-muted, #666);
        cursor: pointer;
        font-size: 0.95em;
        border-radius: 8px;
        transition: all 0.2s;

        &:hover {
            background: var(--color-surface, #f5f5f5);
            color: var(--color-foreground, #1a1a1a);
        }
    }

    .nav-btns {
        display: flex;
        gap: 12px;
    }

    .prev-btn {
        padding: 10px 20px;
        background: transparent;
        border: 1px solid var(--color-border, #e0e0e0);
        color: var(--color-foreground, #1a1a1a);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95em;
        transition: all 0.2s;

        &:hover {
            background: var(--color-surface, #f5f5f5);
        }
    }

    .next-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 24px;
        background: var(--color-primary, #6df);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95em;
        transition: all 0.2s;

        &:hover {
            background: var(--color-primary-hover, #5ce);
        }
    }

    /* 移动端适配 */
    @media (max-width: 480px) {
        .onboarding-modal {
            padding: 24px 20px;
            border-radius: 16px;
        }

        h2 {
            font-size: 1.3em;
        }

        .step-icon {
            width: 64px;
            height: 64px;
        }

        .lang-btn {
            padding: 12px 20px;
            font-size: 1em;
        }
    }
</style>
