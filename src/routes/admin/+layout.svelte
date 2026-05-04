<script lang="ts">
  import { page } from "$app/stores";
  import { navigating } from "$app/stores";

  let { children } = $props();

  const adminEmail = $derived($page.data.adminEmail);
  const currentPath = $derived($page.url.pathname);

  const NAV_ITEMS = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/invite", label: "Invite Tenant" },
    { href: "/admin/models", label: "Models" },
  ];
</script>

{#if !adminEmail}
  {@render children()}
{:else}
  <div class="min-h-screen">
    <header class="border-b bg-zinc-900 text-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold">WhatsAppFlow Admin</h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-zinc-400">
            {adminEmail}
          </span>
          <form method="POST" action="/admin/logout">
            <button
              type="submit"
              class="rounded-md border border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>

    <nav class="relative border-b">
      {#if $navigating}
        <div class="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-primary/20">
          <div class="h-full w-1/3 animate-[nav-loading_0.8s_ease-in-out_infinite] bg-primary"></div>
        </div>
      {/if}
      <div class="mx-auto flex max-w-7xl gap-4 px-4">
        {#each NAV_ITEMS as item}
          <a
            href={item.href}
            class="relative py-3 text-sm transition-colors {currentPath === item.href
              ? 'font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'}"
          >
            {item.label}
            {#if currentPath === item.href}
              <span class="absolute inset-x-0 bottom-0 h-0.5 bg-primary"></span>
            {/if}
          </a>
        {/each}
      </div>
    </nav>

    {@render children()}
  </div>
{/if}

<style>
  @keyframes nav-loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
</style>
