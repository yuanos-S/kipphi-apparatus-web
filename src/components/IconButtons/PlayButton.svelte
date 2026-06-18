<script lang="ts">
    import IconSwitchButton from "./IconSwitchButton.svelte";
    import { base } from "$app/paths";
    let { onchange, checked = $bindable(false) }: { onchange?: (checked: boolean) => void; checked?: boolean } = $props();
</script>
<IconSwitchButton onImgSrc={`${base}/icons/pause.svg`} offImgSrc={`${base}/icons/play.svg`} onchange={onchange} checked={checked} />
