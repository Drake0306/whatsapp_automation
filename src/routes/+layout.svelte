<script lang="ts">
  import "../app.css";
  import { navigating } from "$app/stores";

  let { children } = $props();

  let showBar = $state(false);
  let showTimeout: ReturnType<typeof setTimeout> | undefined;
  let hideTimeout: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if ($navigating) {
      clearTimeout(hideTimeout);
      showTimeout = setTimeout(() => { showBar = true; }, 80);
    } else {
      clearTimeout(showTimeout);
      if (showBar) {
        hideTimeout = setTimeout(() => { showBar = false; }, 150);
      }
    }

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  });
</script>

<div
  class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-150 {showBar ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
>
  <div class="h-full w-full bg-primary/20">
    <div class="h-full w-1/3 animate-[loading_0.8s_ease-in-out_infinite] bg-primary"></div>
  </div>
</div>

{@render children()}

<style>
  @keyframes loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
</style>
