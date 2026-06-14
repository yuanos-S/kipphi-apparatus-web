<script lang="ts">
    import { onMount } from "svelte";
    let {src, alt, style}: {src: string | Blob, alt: string, style?: string} = $props();
    let generatedSrc: string = $state("");

    onMount(async () => {
        let blob: Blob;
        if (typeof src === "string") {
            // In web version, treat string src as a URL path
            const res = await fetch(src);
            blob = await res.blob();
        } else {
            blob = src;
        }
        generatedSrc = URL.createObjectURL(blob);
    });

</script>
<img src={generatedSrc} alt={alt} style={style}>