<script lang="ts">
    /**
     * 根布局组件
     * 功能：
     * - 加载全局样式
     * - 等待 i18n 初始化
     * - 首次访问显示引导页面
     * - IP 定位自动切换语言（首次访问时）
     * - 应用字体大小缩放
     */
    import { onMount } from "svelte";
    import '#/app.css';
    import { locale, localeLangNames } from "#/i18n";
    import { KPASettings } from "#/settings.svelte";
    import Onboarding from "#/components/Onboarding.svelte";
    // import "#/shadcn.css"

    // 是否显示引导页
    let showOnboarding = $state(false);

    onMount(() => {
        // 应用字体大小缩放
        document.documentElement.style.setProperty('--font-size-scale', KPASettings.fontSizeScale.toString());

        // 如果语言未设置，先根据浏览器语言设置默认语言
        if (!KPASettings.lang) {
            const browserLang = navigator.language || "zh-Hans";
            let defaultLang = "zh-Hans";

            // 匹配语言
            if (browserLang.startsWith("zh")) {
                if (browserLang.includes("TW") || browserLang.includes("HK") || browserLang.includes("Hant")) {
                    defaultLang = "zh-Hant";
                } else {
                    defaultLang = "zh-Hans";
                }
            } else if (browserLang.startsWith("en")) {
                defaultLang = "en";
            }

            KPASettings.lang = defaultLang;
            locale.set(defaultLang);
        }

        // 检测是否为首次访问
        if (KPASettings.firstVisit) {
            showOnboarding = true;

            // 尝试 IP 定位（仅首次访问）
            if (!KPASettings.ipLocaleDetected) {
                detectLocaleByIP().then(detectedLang => {
                    if (detectedLang && detectedLang !== KPASettings.lang) {
                        // 如果检测到的语言与当前不同，更新引导页的默认选择
                        console.log("IP 定位检测到语言:", detectedLang);
                    }
                    KPASettings.ipLocaleDetected = true;
                }).catch(() => {
                    // IP 定位失败不影响使用
                    KPASettings.ipLocaleDetected = true;
                });
            }
        }
    });

    /**
     * 通过 IP 定位检测用户语言
     * 使用免费的 IP 地理位置 API
     */
    async function detectLocaleByIP(): Promise<string | null> {
        try {
            // 使用 ip-api.com 免费 API（注意有速率限制）
            const response = await fetch("http://ip-api.com/json/?fields=country,lang");
            if (!response.ok) return null;

            const data = await response.json();
            const country = data.country;
            const lang = data.lang;

            // 根据国家/语言判断
            if (country === "CN" || country === "TW" || country === "HK" || country === "MO") {
                if (country === "TW" || country === "HK" || country === "MO") {
                    return "zh-Hant";
                }
                return "zh-Hans";
            }

            // 其他国家默认英语
            return "en";
        } catch (e) {
            console.warn("IP 定位失败:", e);
            return null;
        }
    }
</script>

{#if $locale}
    <slot />

    <!-- 新用户引导弹窗 -->
    {#if showOnboarding}
        <Onboarding />
    {/if}
{/if}
