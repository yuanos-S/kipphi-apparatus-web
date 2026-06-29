<script lang="ts">
    /**
     * 设置页面
     * 包含：语言设置、编辑器设置、自动保存、播放器设置、
     * 移动端设置（字体大小、全屏）、数据管理（导入导出）、资源包管理
     */
    import { Languages, Download, Upload, Maximize2, Type } from "@lucide/svelte";

    import ProgressiveButton from "#/components/buttons/ProgressiveButton.svelte";
    import UploadButton from "#/components/buttons/UploadButton.svelte";
    import TextSwitchButton from "#/components/IconButtons/TextSwitchButton.svelte";
    import UnitInput from "#/components/Inputs/UnitInput.svelte";
    import Label from "#/components/Label.svelte";
    import Navigator from "#/components/Navigator.svelte";
    import PopupOption from "#/components/PopupOption/PopupOption.svelte";
    import Tooltip from "#/components/Tooltip.svelte";
    import DestructiveButton from "#/components/buttons/DestructiveButton.svelte";
    import { _, localeLangNames, locale } from "#/i18n";
    import { notify } from "#/notify.svelte";
    import {
        queryRespackList,
        uploadRespack,
        uploadTexture,
        type RespackEntry,
    } from "#/background";
    import { KPASettings } from "#/settings.svelte";
    import { exportAllUserData, importUserData, isMobileDevice, toggleFullscreen, isFullscreen } from "#/userData";
    import Respack from "./Respack.svelte";

    // 资源包列表
    let respackList: RespackEntry[] = $state([]);
    let file: File = $state(null);
    respackList = await queryRespackList();

    // 是否为移动端
    let isMobile = $state(false);

    // 导入文件
    let importFile: File | null = $state(null);

    // 字体大小选项
    const fontSizeOptions = [
        { value: 0.8, label: "较小 (80%)" },
        { value: 0.9, label: "略小 (90%)" },
        { value: 1.0, label: "正常 (100%)" },
        { value: 1.1, label: "略大 (110%)" },
        { value: 1.2, label: "较大 (120%)" },
        { value: 1.3, label: "很大 (130%)" },
    ];

    // 初始化字体大小
    $effect(() => {
        document.documentElement.style.setProperty('--font-size-scale', KPASettings.fontSizeScale.toString());
    });

    // 检测是否为移动端
    $effect(() => {
        isMobile = isMobileDevice();
    });
</script>

<main class="container">
    <Navigator><span class="return">{$_("general.pressIconToReturn")}</span></Navigator>
    <div class="content">
        <h1>{$_("chartIndex.nav.settings")}</h1>
        <div class="settings-columns">
            <div class="settings-column">
                <Label small><Languages/>{$_("settings.language")}</Label>
                <PopupOption
                    wide
                    options={Object.keys(localeLangNames)}
                    displayTexts={Object.values(localeLangNames)}
                    bind:currentOption={
                        () => KPASettings.lang,
                        (val) => {
                            KPASettings.lang = val;
                            locale.set(val);
                            console.log("Locale changed.", val);
                        }
                    }
                ></PopupOption>
                <Label small
                    >{$_("settings.useRpeEasingId")}
                    <Tooltip>{$_("settings.useRpeEasingIdWarning")}</Tooltip>
                </Label>
                <TextSwitchButton
                    wide
                    onText="Y"
                    offText="N"
                    bind:checked={KPASettings.useRpeEasingId}
                ></TextSwitchButton>
                <Label small
                    >{$_("settings.autosaveEnabled")}
                    <Tooltip>{$_("settings.autosaveComment")}</Tooltip>
                </Label>
                <TextSwitchButton
                    wide
                    onText="Y"
                    offText="N"
                    bind:checked={KPASettings.autosaveEnabled}
                ></TextSwitchButton>
                <Label small>{$_("settings.autosaveInterval")}</Label>
                <UnitInput
                    bind:value={KPASettings.autosaveInterval}
                    step={1}
                    unit="s"
                    disabled={!KPASettings.autosaveEnabled}
                ></UnitInput>
                <Label small>{$_("settings.playerHeight")}</Label>
                <PopupOption wide
                    bind:currentOption={KPASettings.playerHeight}
                    options={[540, 900, 1080, 1200, 1800]}
                    displayTexts={
                        [
                            "540px",
                            "900px",
                            "1080px",
                            "1200px",
                            "1800px"
                        ]
                    }
                ></PopupOption>

                <!-- 字体大小设置 -->
                <Label small><Type size={16}/>字体大小</Label>
                <PopupOption wide
                    bind:currentOption={KPASettings.fontSizeScale}
                    options={fontSizeOptions.map(o => o.value)}
                    displayTexts={fontSizeOptions.map(o => o.label)}
                    onchange={() => {
                        document.documentElement.style.setProperty('--font-size-scale', KPASettings.fontSizeScale.toString());
                    }}
                ></PopupOption>

                <!-- 自动全屏设置（仅移动端显示） -->
                {#if isMobile}
                    <Label small><Maximize2 size={16}/>自动全屏
                        <Tooltip>进入编辑器时自动进入全屏模式</Tooltip>
                    </Label>
                    <TextSwitchButton
                        wide
                        onText="Y"
                        offText="N"
                        bind:checked={KPASettings.autoFullscreen}
                    ></TextSwitchButton>
                {/if}
            </div>

            <!-- 数据管理列 -->
            <div class="settings-column-flex">
                <Label>数据管理</Label>
                <p style="font-size: var(--font-size-smaller); color: var(--color-foreground-muted);">
                    导出或导入您的所有用户数据（谱面、设置、资源包等）
                </p>

                <!-- 导出数据 -->
                <ProgressiveButton onclick={exportAllUserData}>
                    <Download size={16}/>
                    导出数据 (.kyud)
                </ProgressiveButton>

                <!-- 导入数据 -->
                <div class="import-section">
                    <UploadButton accept=".kyud,.zip" bind:file={importFile}></UploadButton>
                    <ProgressiveButton
                        onclick={async () => {
                            if (importFile) {
                                await importUserData(importFile, true);
                            } else {
                                notify("请先选择文件", "warning");
                            }
                        }}
                        disabled={!importFile}
                    >
                        <Upload size={16}/>
                        导入数据
                    </ProgressiveButton>
                </div>

                <p style="font-size: var(--font-size-smaller); color: var(--color-foreground-muted); margin-top: 1em;">
                    .kyud 格式是 Kipphi Apparatus 的用户数据备份格式，本质是 ZIP 压缩包
                </p>
            </div>
            <div class="settings-column hotkeys">
                <div class="whole-row">
                    <Label>{$_("settings.hotkey")}</Label>
                    <p>{$_("settings.joke")}</p>
                </div>
                <span>Space:</span>
                <span>{$_("settings.hotkeys.playpause")}</span>
                <span>R:</span>
                <span>{$_("settings.hotkeys.placeNode")}</span>
                <span>Q/W/E/R:</span>
                <span>{$_("settings.hotkeys.placeNote")}</span>
                <span>Ctrl:</span>
                <span>{$_("settings.hotkeys.toLines")}</span>
                <span>{$_("general.wheel")}:</span>
                <span>{$_("settings.hotkeys.scrollTime")}</span>
                <span>Ctrl + {$_("general.wheel")}:</span>
                <span>{$_("settings.hotkeys.switchLine")}</span>
                <span>Ctrl + S:</span>
                <span>{$_("settings.hotkeys.save")}</span>
                <span>Tab:</span>
                <span>{$_("settings.hotkeys.switchSeq")}</span>
                <span>Shift + Tab:</span>
                <span>{$_("settings.hotkeys.switchSeqPrev")}</span>
            </div>
            <div class="settings-column-flex respacks">
                <Label>{$_("settings.respack")}</Label>
                <div class="respack-list">
                <Respack pathname={null} name={"KPA-Official"} shortPathname={"Default"}></Respack>
                    {#each respackList as respackEntry}
                        <Respack
                            pathname={respackEntry.pathname}
                            name={respackEntry.name}
                            shortPathname={respackEntry.shortPathname}
                        />
                    {/each}
                </div>
                <div class="flex-row">
                    <UploadButton accept="application/zip" bind:file
                    ></UploadButton>
                    <ProgressiveButton
                        onclick={async () => {
                            if (
                                file.name === "Default" ||
                                respackList.find(
                                    (res) => res.pathname === file.name,
                                )
                            ) {
                                return notify(
                                    $_("settings.respackExists"),
                                    "error",
                                );
                            }
                            try {
                                await uploadRespack(file.name, file);
                                notify($_("settings.uploadSuccess"), "info");
                                respackList = await queryRespackList();
                            } catch (e) {
                                return notify(e + "", "error");
                            }
                        }}>{$_("settings.upload")}</ProgressiveButton
                    >
                </div>
            </div>
        </div>
    </div>
</main>

<style lang="less" scoped>
    @import "#/components/mixin.less";

    .container {
        background-color: var(--color-bg);
        min-height: var(--dvh);
        color: var(--color-foreground);
        overflow-y: auto;
    }

    .content {
        padding: 5em 2em 2em;
        box-sizing: border-box;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        gap: 2em;
    }

    h1 {
        color: var(--color-foreground);
        margin: 0;
    }

    .return {
        color: var(--color-foreground);
    }

    .settings-columns {
        display: flex;
        flex-wrap: wrap;
        gap: 2em;
        width: 100%;
    }

    .settings-column {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 1vh;
        min-width: 300px;
        max-width: 500px;
    }

    .whole-row {
        grid-column: 1 / 3;
    }

    .settings-column-flex {
        display: flex;
        flex-direction: column;
        gap: 1vh;
        align-items: flex-start;
        min-width: 300px;
        max-width: 400px;
    }

    .respacks {
        min-height: 20vh;
        width: 100%;

        .respack-list {
            overflow-y: auto;
            scrollbar-width: thin;
            width: 100%;
            padding: 1vh;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 1vh;
            background: var(--color-surface);
            border-radius: var(--border-radius);
            border: 1px solid var(--color-border);
            max-height: 300px;
        }
    }

    input {
        width: 100%;
        .input();
        font-size: var(--font-size-medium);
        background: var(--color-input-bg);
        color: var(--color-foreground);
        border: 1px solid var(--color-border);
    }

    p {
        font-size: var(--font-size-smaller);
        color: var(--color-foreground-muted);
        margin: 0.5em 0;
    }

    .hotkeys {
        gap: 2px;

        span {
            display: block;
            width: 100%;
            height: 100%;
            background-color: var(--color-surface);
            color: var(--color-foreground);
            border-radius: var(--border-radius);
            font-size: var(--font-size-small);
            padding: 0.4em 0.5em;
            box-sizing: border-box;
            border: 1px solid var(--color-border);
        }
    }

    /* 导入区域样式 */
    .import-section {
        display: flex;
        flex-direction: column;
        gap: 1vh;
        width: 100%;
    }

    .import-section button {
        width: 100%;
        justify-content: center;
    }

    .settings-column-flex button {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }

    /* 响应式适配 */
    @media (max-width: 768px) {
        .content {
            padding: 4em 0.8em 1em;
            gap: 1.2em;
        }

        .settings-columns {
            flex-direction: column;
            gap: 1.2em;
        }

        .settings-column,
        .settings-column-flex {
            min-width: 100%;
            max-width: 100%;
        }

        .settings-column {
            grid-template-columns: auto 1fr;
            gap: 0.6vh;
        }

        h1 {
            font-size: 1.3em;
        }
    }
</style>
