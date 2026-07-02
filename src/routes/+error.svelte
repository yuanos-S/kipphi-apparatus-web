<script>
  import { page } from "$app/stores";
</script>

<div class="bsod">
  <div class="bsod-content">
    <div class="bsod-face">:(</div>
    <p class="bsod-title">你的设备遇到问题，需要重启。</p>
    <p class="bsod-info">我们只收集某些错误信息，然后为你重新启动。</p>
    <div class="bsod-progress">
      <span class="bsod-percent">0% complete</span>
    </div>
    <div class="bsod-qr">
      <div class="bsod-qr-placeholder">
        <svg viewBox="0 0 80 80" fill="none">
          <rect width="80" height="80" fill="white" />
          <rect x="4" y="4" width="24" height="24" fill="#0078D7" />
          <rect x="8" y="8" width="16" height="16" fill="white" />
          <rect x="12" y="12" width="8" height="8" fill="#0078D7" />
          <rect x="52" y="4" width="24" height="24" fill="#0078D7" />
          <rect x="56" y="8" width="16" height="16" fill="white" />
          <rect x="60" y="12" width="8" height="8" fill="#0078D7" />
          <rect x="4" y="52" width="24" height="24" fill="#0078D7" />
          <rect x="8" y="56" width="16" height="16" fill="white" />
          <rect x="12" y="60" width="8" height="8" fill="#0078D7" />
          <rect x="36" y="36" width="8" height="8" fill="white" />
        </svg>
      </div>
    </div>
    <p class="bsod-stop-code">
      有关此问题的详细信息和可能的解决方法，请访问
      <a href="https://github.com/yuanos-S/kipphi-apparatus-web" target="_blank" rel="noopener">https://github.com/yuanos-S/kipphi-apparatus-web</a>
    </p>
    <p class="bsod-error">
      {#if $page.error?.message}
        错误代码: {$page.error.message}
      {/if}
    </p>
    {#if $page.status}
      <p class="bsod-status">HTTP {$page.status}</p>
    {/if}
  </div>
</div>

<style>
  .bsod {
    position: fixed;
    inset: 0;
    background: #0078D7;
    color: #fff;
    font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 2em;
    box-sizing: border-box;
  }
  .bsod-content {
    max-width: 600px;
    width: 100%;
  }
  .bsod-face {
    font-size: 6em;
    font-weight: 300;
    line-height: 1;
    margin-bottom: 0.2em;
  }
  .bsod-title {
    font-size: 1.5em;
    font-weight: 400;
    margin: 0 0 0.3em;
  }
  .bsod-info {
    font-size: 0.9em;
    opacity: 0.85;
    margin: 0 0 1.5em;
  }
  .bsod-progress {
    margin-bottom: 1.5em;
  }
  .bsod-percent {
    font-size: 0.85em;
    opacity: 0.7;
  }
  .bsod-qr {
    margin-bottom: 1.5em;
  }
  .bsod-qr-placeholder {
    width: 80px;
    height: 80px;
  }
  .bsod-stop-code {
    font-size: 0.8em;
    opacity: 0.8;
    margin: 0 0 0.5em;
    line-height: 1.4;
  }
  .bsod-stop-code a {
    color: #fff;
    opacity: 0.9;
  }
  .bsod-error {
    font-size: 0.8em;
    opacity: 0.7;
    margin: 0.5em 0;
    word-break: break-all;
  }
  .bsod-status {
    font-size: 0.8em;
    opacity: 0.6;
    margin: 0.3em 0 0;
  }
</style>