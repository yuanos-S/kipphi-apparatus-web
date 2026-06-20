<script lang="ts">
    import { _ } from "#/i18n";
    import { base } from "$app/paths";
</script>

<nav>
<a href="{base}/" id="logo"><img src="{base}/icon.svg" alt="Kipphi Apparatus"></a>
<header>KPA</header>
    <slot/>
</nav>

<style>
  nav {
    display: flex;
    flex-direction: row;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    padding: 0.5em 1em;
    gap: 0.4em;
    position: fixed;
    z-index: 2;
    top: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    backdrop-filter: blur(8px);
  }
  #logo {
    align-items: center;
    display: flex;
    transition: transform 0.2s;
    &:hover { transform: scale(1.05); }
    &:active { transform: scale(0.95); }
  }
  nav img {
    height: 2.5em;
  }
  nav header {
    flex: 1;
    font-size: 160%;
    align-self: center;
    color: #6df;
    text-shadow: 0 0 8px rgba(102, 221, 255, 0.3);
  }
  @media (max-width: 480px) {
    nav {
      padding: 0.4em 0.5em;
      gap: 0.2em;
    }
    nav img { height: 2em; }
    nav header { font-size: 120%; }
  }
</style>
