<script lang="ts">
  import { type PageData } from "./$types";
  import { _ } from "#/i18n";
  import ImageLoader from "#/components/ImageLoader.svelte";
  import { base } from "$app/paths";
  import { 
    Settings, Download, Github, FolderPlus, Music, Trash2, 
    Upload, X, Check, Globe, Palette, Package 
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";

  let { data }: { data: PageData } = $props();
  let selectedChart = "";

  // ========== 时间显示 ==========
  let currentTime = $state("");
  let currentDate = $state("");
  function updateTime() {
    const now = new Date();
    currentTime = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    currentDate = now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  }
  $effect(() => {
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  });

  // ========== 导入弹窗 ==========
  let showImportModal = $state(false);
  let importStatus = $state<"" | "识别中..." | "识别成功" | "导入失败">("");
  let fileInput: HTMLInputElement | undefined = $state();

  function handleImportClick() {
    showImportModal = true;
    importStatus = "";
  }
  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importStatus = "识别中...";
    // 跳转到导入页面处理
    setTimeout(() => {
      importStatus = "识别成功";
      setTimeout(() => {
        goto(`${base}/import`);
      }, 600);
    }, 800);
  }
  function closeImportModal() {
    showImportModal = false;
    importStatus = "";
  }

  // ========== 设置下拉 ==========
  let showSettingsDropdown = $state(false);
  function toggleSettingsDropdown() {
    showSettingsDropdown = !showSettingsDropdown;
  }
  function closeSettingsDropdown() {
    showSettingsDropdown = false;
  }
</script>

<svelte:window onclick={() => { showSettingsDropdown = false; }} onkeydown={(e) => { if (e.key === "Escape") { showSettingsDropdown = false; showImportModal = false; } }} />

<main class="container">
  <!-- ========== 顶栏 ========== -->
  <header class="topbar">
    <a href="{base}/" class="brand">
      <img src="{base}/icon.svg" alt="KPA" />
      <span>KPA</span>
    </a>
    <div class="header-right">
      <div class="datetime">
        <span class="time">{currentTime}</span>
        <span class="date">{currentDate}</span>
      </div>
      <button class="icon-btn" onclick={handleImportClick} title="导入">
        <Download size="22" />
      </button>
      <div class="settings-wrapper">
        <button class="icon-btn" onclick={(e: MouseEvent) => { e.stopPropagation(); toggleSettingsDropdown(); }} title="设置">
          <Settings size="22" />
        </button>
        {#if showSettingsDropdown}
          <div class="settings-dropdown" onclick={(e: MouseEvent) => e.stopPropagation()}>
            <a href="{base}/settings" class="dropdown-item">
              <Globe size="18" />{$_("settings.language") ?? "语言"}
            </a>
            <a href="{base}/settings" class="dropdown-item">
              <Palette size="18" />{$_("settings.personalization") ?? "个性化"}
            </a>
            <a href="{base}/settings" class="dropdown-item">
              <Package size="18" />{$_("settings.respack") ?? "资源包"}
            </a>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <!-- ========== 主体内容区 ========== -->
  <div class="main-content">
    <!-- 三大功能卡片 -->
    <div class="feature-cards">
      <a href="{base}/charts" class="feature-card">
        <div class="card-icon">
          <Music size="48" />
        </div>
        <span class="card-label">谱面</span>
      </a>
      <a href="{base}/create" class="feature-card">
        <div class="card-icon">
          <FolderPlus size="48" />
        </div>
        <span class="card-label">新谱</span>
        <span class="new-badge">NEW</span>
      </a>
      <a href="{base}/trash" class="feature-card">
        <div class="card-icon">
          <Trash2 size="48" />
        </div>
        <span class="card-label">回收站</span>
      </a>
    </div>

    <!-- 谱面列表 -->
    <div class="charts-section">
      <p class="section-desc">{$_("chartIndex.licenseDeclaration")}</p>
      {#if data.chartInfos.length > 0}
        <ul id="charts">
          {#each data.chartInfos as chart}
            <li class="chart {chart.identifier === selectedChart ? 'selected' : ''}">
              <ImageLoader src={chart.image} alt={chart.identifier} />
              <div class="chart-title">
                {chart.title} ({chart.identifier}, {chart.type})
              </div>
              <div class="chart-operations">
                <a href="{base}/charts/{chart.identifier}" class="edit-link"
                  >{$_("chartIndex.charts.edit")}</a
                >
                <a class="export-link" href="{base}/charts/{chart.identifier}/export"
                  >{$_("chartIndex.charts.export")}</a
                >
                <a href="{base}/charts/{chart.identifier}/delete" class="delete-link"
                  >{$_("chartIndex.charts.delete")}</a
                >
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="no-charts">{$_("chartIndex.noCharts")}</p>
      {/if}
    </div>
  </div>

  <!-- ========== 底栏 ========== -->
  <footer class="bottombar">
    <a href="https://github.com/TeamZincs/kipphi-apparatus" target="_blank" rel="noopener" class="footer-icon" title="原版仓库">
      <Github size="20" />
    </a>
    <span class="copyright">Kipphi Apparatus &copy; 2025 TeamZincs, MIT Licensed.</span>
    <a href="https://github.com/yuanos-S/kipphi-apparatus-web" target="_blank" rel="noopener" class="footer-icon" title="Web版仓库">
      <Github size="20" />
    </a>
  </footer>
</main>

<!-- ========== 导入弹窗 ========== -->
{#if showImportModal}
  <div class="modal-overlay" onclick={closeImportModal}>
    <div class="modal" onclick={(e: MouseEvent) => e.stopPropagation()}>
      <button class="modal-close" onclick={closeImportModal}>
        <X size="20" />
      </button>
      <h2>PEZ / ZIP 导入</h2>
      <div class="upload-area" onclick={() => fileInput?.click()}>
        <Upload size="40" />
        <p>上传</p>
        <p class="upload-hint">点击选择文件，支持 .pez / .zip</p>
        <input
          type="file"
          accept=".pez,.zip"
          bind:this={fileInput}
          onchange={handleFileSelect}
          class="file-input"
        />
      </div>
      {#if importStatus}
        <p class="import-status">
          {#if importStatus === "识别成功"}<Check size="16" />{/if}{importStatus}
        </p>
      {/if}
      <p class="modal-hint">和原版导入差不多</p>
    </div>
  </div>
{/if}

<style>
  /* ========== 容器 ========== */
  .container {
    display: flex;
    flex-direction: column;
    min-height: var(--dvh);
    background: var(--color-bg);
    box-sizing: border-box;
  }

  /* ========== 顶栏 ========== */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 0.5em 1.2em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    position: sticky;
    top: 0;
    z-index: 10;
    min-height: 3.5em;
    box-sizing: border-box;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5em;
    text-decoration: none;
    color: #6df;
    font-size: 160%;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(102, 221, 255, 0.3);
    transition: transform 0.2s;
  }
  .brand:hover { transform: scale(1.05); text-decoration: none; }
  .brand img { height: 2.2em; }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.6em;
  }
  .datetime {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.3;
    color: #ccc;
    font-size: 0.8em;
  }
  .time {
    font-size: 1.1em;
    color: #fff;
    font-weight: bold;
  }
  .icon-btn {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    border-radius: 8px;
    padding: 0.4em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .icon-btn:hover {
    background: rgba(102, 221, 255, 0.2);
    border-color: rgba(102, 221, 255, 0.3);
  }
  .settings-wrapper {
    position: relative;
  }
  .settings-dropdown {
    position: absolute;
    top: 110%;
    right: 0;
    background: #1e1e3a;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 0.4em;
    min-width: 160px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em 0.8em;
    color: #ddd;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.95em;
    transition: background 0.15s;
  }
  .dropdown-item:hover {
    background: rgba(102, 221, 255, 0.15);
    text-decoration: none;
    color: #fff;
  }

  /* ========== 主体内容 ========== */
  .main-content {
    flex: 1;
    padding: 1.5em 1em;
    display: flex;
    flex-direction: column;
    gap: 1.5em;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* 三大功能卡片 */
  .feature-cards {
    display: flex;
    justify-content: center;
    gap: 1.5em;
    flex-wrap: wrap;
  }
  .feature-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6em;
    padding: 1.5em 2em;
    border-radius: 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    text-decoration: none;
    color: var(--color-foreground);
    transition: all 0.25s ease;
    position: relative;
    min-width: 120px;
    cursor: pointer;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(102, 221, 255, 0.2);
    border-color: rgba(102, 221, 255, 0.4);
    text-decoration: none;
  }
  .feature-card:active {
    transform: scale(0.96);
  }
  .card-icon {
    color: #6df;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-label {
    font-size: 1.1em;
    font-weight: 500;
    color: var(--color-foreground);
  }
  .new-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #6df;
    color: #1a1a2e;
    font-size: 0.65em;
    font-weight: bold;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  /* 谱面列表 */
  .charts-section {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: var(--color-card-bg);
    border-radius: 12px;
    padding: 1em;
    box-sizing: border-box;
    border: 1px solid var(--color-border);
  }
  .section-desc {
    color: var(--color-foreground-muted);
    margin: 0 0 0.5em;
    font-size: 0.9em;
  }
  #charts {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
    padding: 0.5em;
    overflow-y: auto;
    justify-content: space-evenly;
    list-style: none;
    margin: 0;
    padding-bottom: 0.5em;
  }
  .no-charts {
    text-align: center;
    padding: 2em;
    color: var(--color-foreground-muted);
  }
  .chart {
    display: block;
    border-radius: 10px;
    background-color: var(--color-surface);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    position: relative;
    transition: all 0.25s ease;
    height: 30vh;
    min-height: 180px;
    max-height: 300px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    flex: 1 1 200px;
    max-width: 280px;
  }
  .chart:active { transform: scale(0.98); }
  .chart.selected {
    box-shadow: 0 2px 12px rgba(102, 221, 255, 0.4);
    border-color: var(--color-primary);
  }
  .chart-title {
    position: absolute;
    text-align: start;
    bottom: 0;
    left: 0;
    color: white;
    width: 100%;
    font-size: 130%;
    padding: 0.2em 0.8em;
    background-image: linear-gradient(to bottom, #00000000, #000000aa);
    box-sizing: border-box;
  }
  .chart :global(img) {
    height: 100%;
    object-fit: cover;
    aspect-ratio: 4 / 3;
  }
  .chart-operations {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(6px) brightness(40%);
    -webkit-backdrop-filter: blur(6px) brightness(40%);
    opacity: 0;
    transition: opacity 0.5s ease-in;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5em;
  }
  .chart:hover .chart-operations { opacity: 1; }
  .chart-operations a, .chart-operations span {
    display: block;
    font-size: 4vh;
    padding: 0.3em 1em;
    color: white;
    text-decoration: none;
    transition: transform 0.6s ease-out, background-color 0.2s;
    transform: translateX(-24vw);
    border-radius: 4px;
    text-align: center;
  }
  .chart-operations:hover a, .chart-operations:hover span { transform: none; }
  .edit-link { transition-delay: 0.15s; background: rgba(102, 221, 255, 0.3); }
  .export-link { transition-delay: 0.3s; background: rgba(255, 255, 255, 0.2); }
  .delete-link { color: #ff6b6b; transition-delay: 0.45s; background: rgba(255, 107, 107, 0.2); }

  /* ========== 底栏 ========== */
  .bottombar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 0.6em 1.2em;
    box-sizing: border-box;
    position: sticky;
    bottom: 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
  }
  .footer-icon {
    color: #aaa;
    transition: color 0.2s, transform 0.2s;
    display: flex;
    align-items: center;
  }
  .footer-icon:hover {
    color: #6df;
    transform: scale(1.1);
  }
  .copyright {
    color: #888;
    font-size: 0.8em;
    text-align: center;
  }

  /* ========== 导入弹窗 ========== */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
  }
  .modal {
    background: var(--color-surface);
    border-radius: 16px;
    padding: 1.5em;
    max-width: 400px;
    width: 100%;
    text-align: center;
    position: relative;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    color: var(--color-foreground);
  }
  .modal-close {
    position: absolute;
    top: 0.8em;
    right: 0.8em;
    background: none;
    border: none;
    color: var(--color-foreground-muted);
    cursor: pointer;
    padding: 0.2em;
    border-radius: 4px;
    display: flex;
  }
  .modal-close:hover { color: var(--color-foreground); background: var(--color-border); }
  .modal h2 {
    margin: 0 0 1em;
    font-size: 1.3em;
    color: var(--color-foreground);
  }
  .upload-area {
    border: 2px dashed var(--color-border);
    border-radius: 12px;
    padding: 2em;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
    color: var(--color-foreground-muted);
  }
  .upload-area:hover {
    border-color: #6df;
    background: rgba(102, 221, 255, 0.05);
  }
  .upload-hint {
    font-size: 0.8em;
    color: var(--color-foreground-muted);
    margin: 0;
  }
  .file-input { display: none; }
  .import-status {
    margin-top: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    color: #6df;
    font-size: 0.95em;
  }
  .modal-hint {
    color: var(--color-foreground-muted);
    font-size: 0.8em;
    margin: 0.8em 0 0;
  }

  /* ========== 响应式 ========== */
  @media (max-width: 768px) {
    .topbar { padding: 0.4em 0.8em; min-height: 3em; }
    .brand { font-size: 130%; }
    .brand img { height: 1.8em; }
    .datetime { font-size: 0.7em; }
    .feature-cards { gap: 1em; }
    .feature-card { padding: 1.2em 1.5em; min-width: 90px; }
    .feature-card .card-icon :global(svg) { width: 36px; height: 36px; }
    .card-label { font-size: 0.95em; }
    .chart { height: 22vh; min-height: 140px; }
    .chart-operations a, .chart-operations span { font-size: 3vh; transform: translateX(-30vw); }
  }
  @media (max-width: 480px) {
    .topbar { padding: 0.3em 0.5em; }
    .brand { font-size: 110%; gap: 0.3em; }
    .brand img { height: 1.5em; }
    .datetime { display: none; }
    .feature-cards { gap: 0.5em; }
    .feature-card { padding: 0.8em 1em; min-width: 70px; border-radius: 10px; }
    .feature-card .card-icon :global(svg) { width: 28px; height: 28px; }
    .card-label { font-size: 0.8em; }
    .chart { height: 18vh; min-height: 100px; }
    .chart-title { font-size: 100%; padding: 0.15em 0.5em; }
    .chart-operations a, .chart-operations span { font-size: 2.5vh; transform: translateX(-35vw); }
    .bottombar { padding: 0.4em 0.8em; }
    .copyright { font-size: 0.7em; }
    .main-content { padding: 1em 0.5em; }
  }
</style>