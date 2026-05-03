<script lang="ts">
  import "../app.css";
  import { navigating } from "$app/stores";

  let { children } = $props();
</script>

{#if $navigating}
  <div class="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/20">
    <div class="h-full w-1/3 animate-[loading_1s_ease-in-out_infinite] bg-primary"></div>
  </div>
{/if}

{@render children()}

<style>
  @keyframes loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
</style>
