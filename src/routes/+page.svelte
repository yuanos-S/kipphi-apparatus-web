<script lang="ts">
  import { type PageData } from "./$types";
  import { _ } from "#/i18n";
  import ImageLoader from "#/components/ImageLoader.svelte";
  import Navigator from "#/components/Navigator.svelte";
  import { Settings } from "@lucide/svelte";
  import { base } from "$app/paths";

  let { data }: { data: PageData } = $props();
  let selectedChart = undefined;
</script>

<main class="container" style="--bg-icon: url('{base}/icon.svg');">
  <Navigator>
    
    <a href="./about" class="nav-button">{$_("about.title")}</a>
    <a href="./settings" class="nav-button"><Settings size="20"/>{$_("chartIndex.nav.settings")}</a>
    <a href="./create" class="nav-button">{$_("chartIndex.nav.create")}</a>
    <a href="./import" class="nav-button">{$_("chartIndex.nav.import")}</a>
  </Navigator>
  <div id="content">
    <p>{$_("chartIndex.licenseDeclaration")}</p>
    <p>{$_("chartIndex.subscribe")}</p>
    {#if data.chartInfos.length > 0}
      <ul id="charts">
        {#each data.chartInfos as chart}
          <li
            class="chart {chart.identifier === selectedChart ? 'selected' : ''}"
          >
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
      {$_("chartIndex.noCharts")}
    {/if}
  </div>
  <footer>
    Kipphi Apparatus Coded by Zes Minkey Young. Copyright (c) 2025 TeamZincs,
    MIT Licensed.
  </footer>
</main>

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .nav-button {
    background: linear-gradient(135deg, #323334 0%, #2a2a2e 100%);
    color: white;
    border-radius: 8px;
    font-size: 140%;
    padding: 0.2em 0.5em;
    text-decoration: none;
    align-content: center;
    transition: all 0.2s ease;
    border: 1px solid rgba(255,255,255,0.1);
    &:active {
      transform: scale(0.96);
    }
  }

  .nav-button:hover {
    box-shadow: 0 2px 8px rgba(102, 221, 255, 0.3);
    border-color: rgba(102, 221, 255, 0.3);
  }

  .container {
    padding: 3em;
  }

  .container {
    background-image: var(--bg-icon);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }

  #content {
    backdrop-filter: blur(16px);
    width: 100%;
    height: 100%;
    padding: 0.5em;
    display: flex;
    flex-direction: column;
  }

  footer {
    background-color: #f8f9fa;
    padding: 0.2em 0.3em;
    border-bottom-right-radius: 3px;
    border-top-left-radius: 3px;
    border-top-right-radius: 7px;
    position: fixed;
    left: 0;
    bottom: 0;
    border: 1px solid #666768;
  }

  #charts {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    gap: 0.5em;
    padding: 0.5em;
    overflow-y: auto;
    justify-content: space-evenly;
    /* 防止底部版权信息挡住谱面列表 */
    padding-bottom: 6em;
  }

  .chart {
    display: block;
    border-radius: 10px;
    background-color: #f8f9fa44;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    clip-path: fill-box;
    position: relative;
    transition: all 0.25s ease;
    height: 40vh;
    overflow: hidden;
    &:active {
      transform: scale(0.98);
    }
  }

  .chart.selected {
    box-shadow: 0 2px 12px rgba(102, 221, 255, 0.4);
  }

  .chart-title {
    position: absolute;
    text-align: start;
    bottom: 0;
    left: 0;
    color: white;
    width: 100%;
    font-size: 150%;
    padding: 0.2em 0.8em;
    background-image: linear-gradient(to bottom, #00000000, #000000aa);
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
    transition-property: opacity;
    transition-duration: 0.5s;
    transition-delay: 0.6s;
    transition-timing-function: ease-in;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .chart:hover .chart-operations {
    opacity: 1;
    transition-delay: 0s;
  }

  .chart-operations a,
  .chart-operations span {
    display: block;
    font-size: 6vh;
    padding: 0.3em 0;
    /* 让它内收，不要把链接点击范围扩展开 */
    margin: auto;
    transition-property: transform;
    transition-duration: 0.6s;
    transition-timing-function: ease-out;
    transform: translateX(-24vw);
  }

  .chart-operations:hover a,
  .chart-operations:hover span {
    transform: none;
  }

  .edit-link {
    transition-delay: 0.15s;
  }

  .export-link {
    transition-delay: 0.3s;
  }

  .delete-link {
    color: red;
    transition-delay: 0.45s;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 1em;
    }
    .nav-button {
      font-size: 100%;
      padding: 0.2em 0.4em;
    }
    .chart {
      height: 30vh;
    }
  }
  @media (max-width: 480px) {
    .container {
      padding: 0.5em;
    }
    .nav-button {
      font-size: 80%;
    }
    .chart {
      height: 25vh;
    }
    .chart-title {
      font-size: 100%;
    }
    footer {
      font-size: 70%;
    }
  }

</style>
