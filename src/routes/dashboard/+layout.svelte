<script lang="ts">
  import { navigating } from "$app/stores";
  import PageSkeleton from "$lib/components/PageSkeleton.svelte";

  let { children } = $props();

  const skeletonMap: Record<string, string> = {
    "/dashboard": "dashboard",
    "/dashboard/conversations": "chat",
    "/dashboard/contacts": "list",
    "/dashboard/appointments": "table",
    "/dashboard/broadcasts": "table",
    "/dashboard/escalations": "escalations",
    "/dashboard/feedback": "table",
    "/dashboard/analytics": "analytics",
    "/dashboard/knowledge": "form",
    "/dashboard/quick-replies": "form",
    "/dashboard/settings": "form",
    "/dashboard/services": "table",
    "/dashboard/billing": "cards",
  };

  const targetVariant = $derived(
    $navigating?.to?.url?.pathname
      ? skeletonMap[$navigating.to.url.pathname] ?? "dashboard"
      : null,
  );
</script>

{#if targetVariant}
  <div class="min-h-screen">
    <header class="border-b">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div class="h-7 w-40 animate-pulse rounded bg-muted"></div>
        <div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
      </div>
    </header>
    {#if targetVariant !== "chat"}
      <main class="mx-auto max-w-7xl px-4 py-8">
        <PageSkeleton variant={targetVariant} />
      </main>
    {:else}
      <PageSkeleton variant="chat" />
    {/if}
  </div>
{:else}
  {@render children()}
{/if}
