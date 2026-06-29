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
      <p class="no-charts">{$_("chartIndex.noCharts")}</p>
    {/if}
  </div>
  <footer>
    Kipphi Apparatus Coded by Zes Minkey Young. Copyright (c) 2025 TeamZincs,
    MIT Licensed.
  </footer>
</main>

<style>
  :root {
    --color-nav-bg: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-image: var(--bg-icon);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    padding: 4em 1em 1em;
    box-sizing: border-box;
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
    flex-shrink: 0;
  }

  .nav-button:hover {
    box-shadow: 0 2px 8px rgba(102, 221, 255, 0.3);
    border-color: rgba(102, 221, 255, 0.3);
  }

  .nav-button:active {
    transform: scale(0.96);
  }

  #content {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: var(--color-card-bg, rgba(255, 255, 255, 0.85));
    width: 100%;
    flex: 1;
    padding: 1em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    border-radius: 8px;
    box-sizing: border-box;
  }

  #content p {
    color: var(--color-foreground);
    margin: 0;
  }

  footer {
    background-color: var(--color-nav-bg);
    color: white;
    padding: 0.5em 1em;
    border-radius: 8px 8px 0 0;
    position: sticky;
    bottom: 0;
    font-size: 0.85em;
  }

  #charts {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    gap: 1em;
    padding: 0.5em;
    overflow-y: auto;
    justify-content: space-evenly;
    list-style: none;
    margin: 0;
    padding-bottom: 4em;
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
    clip-path: fill-box;
    position: relative;
    transition: all 0.25s ease;
    height: 40vh;
    min-height: 200px;
    max-height: 400px;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .chart:active {
    transform: scale(0.98);
  }

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
    font-size: 150%;
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
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5em;
  }

  .chart:hover .chart-operations {
    opacity: 1;
  }

  .chart-operations a,
  .chart-operations span {
    display: block;
    font-size: 6vh;
    min-font-size: 16px;
    padding: 0.3em 1em;
    color: white;
    text-decoration: none;
    transition: transform 0.6s ease-out, background-color 0.2s;
    transform: translateX(-24vw);
    border-radius: 4px;
    text-align: center;
  }

  .chart-operations:hover a,
  .chart-operations:hover span {
    transform: none;
  }

  .edit-link {
    transition-delay: 0.15s;
    background: rgba(102, 221, 255, 0.3);
  }

  .export-link {
    transition-delay: 0.3s;
    background: rgba(255, 255, 255, 0.2);
  }

  .delete-link {
    color: #ff6b6b;
    transition-delay: 0.45s;
    background: rgba(255, 107, 107, 0.2);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 3.5em 0.5em 0.5em;
    }
    .nav-button {
      font-size: 100%;
      padding: 0.2em 0.4em;
    }
    .chart {
      height: 30vh;
      min-height: 150px;
    }
    .chart-operations a,
    .chart-operations span {
      font-size: 4vh;
      transform: translateX(-30vw);
    }
  }

  @media (max-width: 480px) {
    .container {
      padding: 3em 0.25em 0.25em;
    }
    .nav-button {
      font-size: 80%;
      padding: 0.15em 0.3em;
    }
    .chart {
      height: 25vh;
      min-height: 120px;
    }
    .chart-title {
      font-size: 100%;
      padding: 0.15em 0.5em;
    }
    .chart-operations a,
    .chart-operations span {
      font-size: 3vh;
      transform: translateX(-35vw);
    }
    footer {
      font-size: 70%;
      padding: 0.4em 0.8em;
    }
  }

  /* 深色模式 */
  @media (prefers-color-scheme: dark) {
    #content {
      background: var(--color-card-bg, rgba(42, 42, 62, 0.9));
    }
    .chart {
      background-color: var(--color-surface);
    }
    footer {
      background: var(--color-nav-bg);
    }
  }
</style>
