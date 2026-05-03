<script lang="ts">
  import Skeleton from "./Skeleton.svelte";

  let { variant = "dashboard" }: { variant: string } = $props();
</script>

{#if variant === "dashboard"}
  <!-- Dashboard: stat cards + recent list -->
  <div class="space-y-6">
    <div>
      <Skeleton class="h-7 w-40" />
      <Skeleton class="mt-2 h-4 w-64" />
    </div>
    <Skeleton class="h-12 w-full" />
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each Array(8) as _}
        <div class="rounded-lg border p-5 space-y-2">
          <Skeleton class="h-4 w-28" />
          <Skeleton class="h-8 w-16" />
        </div>
      {/each}
    </div>
    <div class="space-y-3">
      <Skeleton class="h-5 w-48" />
      <div class="rounded-lg border divide-y">
        {#each Array(5) as _}
          <div class="flex items-center justify-between px-4 py-3">
            <div class="space-y-1">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-3 w-24" />
            </div>
            <Skeleton class="h-3 w-20" />
          </div>
        {/each}
      </div>
    </div>
  </div>

{:else if variant === "list"}
  <!-- Contacts, Conversations, Escalations: sidebar + content -->
  <div class="flex gap-6">
    <div class="w-80 shrink-0 space-y-3">
      <Skeleton class="h-9 w-full" />
      <div class="rounded-lg border divide-y">
        {#each Array(8) as _}
          <div class="px-4 py-3 space-y-1">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-3 w-24" />
            <div class="flex gap-1 mt-1">
              <Skeleton class="h-4 w-12 rounded-full" />
              <Skeleton class="h-4 w-16 rounded-full" />
            </div>
          </div>
        {/each}
      </div>
    </div>
    <div class="flex-1">
      <div class="rounded-lg border p-6 space-y-4">
        <div class="space-y-2">
          <Skeleton class="h-6 w-40" />
          <Skeleton class="h-4 w-28" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg border p-3 space-y-1">
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-6 w-10" />
          </div>
          <div class="rounded-lg border p-3 space-y-1">
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-4 w-24" />
          </div>
        </div>
        <div class="space-y-2">
          <Skeleton class="h-4 w-16" />
          <div class="flex gap-2">
            <Skeleton class="h-5 w-14 rounded-full" />
            <Skeleton class="h-5 w-18 rounded-full" />
          </div>
        </div>
        <div class="space-y-2">
          <Skeleton class="h-4 w-16" />
          <Skeleton class="h-20 w-full" />
        </div>
      </div>
    </div>
  </div>

{:else if variant === "chat"}
  <!-- Conversations: sidebar + message thread -->
  <div class="flex" style="height: calc(100vh - 65px);">
    <div class="w-80 shrink-0 border-r space-y-0">
      {#each Array(10) as _}
        <div class="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton class="h-9 w-9 shrink-0 rounded-full" />
          <div class="space-y-1 flex-1">
            <Skeleton class="h-4 w-28" />
            <Skeleton class="h-3 w-20" />
          </div>
        </div>
      {/each}
    </div>
    <div class="flex-1 p-4 space-y-3">
      <div class="flex justify-start"><Skeleton class="h-10 w-48 rounded-lg" /></div>
      <div class="flex justify-end"><Skeleton class="h-10 w-56 rounded-lg" /></div>
      <div class="flex justify-start"><Skeleton class="h-10 w-40 rounded-lg" /></div>
      <div class="flex justify-end"><Skeleton class="h-14 w-52 rounded-lg" /></div>
      <div class="flex justify-start"><Skeleton class="h-10 w-44 rounded-lg" /></div>
      <div class="flex justify-end"><Skeleton class="h-10 w-36 rounded-lg" /></div>
    </div>
  </div>

{:else if variant === "table"}
  <!-- Appointments, Feedback, Broadcasts: table rows -->
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <Skeleton class="h-7 w-40" />
      <Skeleton class="h-9 w-32 rounded-md" />
    </div>
    <div class="rounded-lg border">
      <div class="border-b px-4 py-3 flex gap-8">
        <Skeleton class="h-4 w-24" />
        <Skeleton class="h-4 w-20" />
        <Skeleton class="h-4 w-28" />
        <Skeleton class="h-4 w-16" />
      </div>
      {#each Array(8) as _}
        <div class="border-b px-4 py-3 flex gap-8 items-center">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-28" />
          <Skeleton class="h-6 w-16 rounded-full" />
        </div>
      {/each}
    </div>
  </div>

{:else if variant === "analytics"}
  <!-- Analytics: charts + stat cards -->
  <div class="space-y-6">
    <Skeleton class="h-7 w-36" />
    <div class="grid gap-4 sm:grid-cols-3">
      {#each Array(3) as _}
        <div class="rounded-lg border p-5 space-y-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-8 w-16" />
        </div>
      {/each}
    </div>
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-lg border p-5 space-y-3">
        <Skeleton class="h-5 w-32" />
        <Skeleton class="h-48 w-full" />
      </div>
      <div class="rounded-lg border p-5 space-y-3">
        <Skeleton class="h-5 w-40" />
        <Skeleton class="h-48 w-full" />
      </div>
    </div>
    <div class="rounded-lg border p-5 space-y-3">
      <Skeleton class="h-5 w-36" />
      <Skeleton class="h-48 w-full" />
    </div>
  </div>

{:else if variant === "form"}
  <!-- Settings, Knowledge, Quick Replies: form sections -->
  <div class="space-y-6">
    <Skeleton class="h-7 w-36" />
    {#each Array(3) as _}
      <div class="rounded-lg border p-6 space-y-4">
        <Skeleton class="h-5 w-40" />
        <div class="space-y-3">
          <div class="space-y-1">
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-9 w-full" />
          </div>
          <div class="space-y-1">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-9 w-full" />
          </div>
          <div class="space-y-1">
            <Skeleton class="h-3 w-28" />
            <Skeleton class="h-20 w-full" />
          </div>
        </div>
        <Skeleton class="h-9 w-24 rounded-md" />
      </div>
    {/each}
  </div>

{:else if variant === "cards"}
  <!-- Billing: plan cards -->
  <div class="space-y-6">
    <Skeleton class="h-7 w-36" />
    <div class="rounded-lg border p-5 space-y-2">
      <Skeleton class="h-4 w-32" />
      <Skeleton class="h-5 w-48" />
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      {#each Array(3) as _}
        <div class="rounded-lg border p-6 space-y-3">
          <Skeleton class="h-5 w-24" />
          <Skeleton class="h-8 w-20" />
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-9 w-full rounded-md" />
        </div>
      {/each}
    </div>
  </div>

{:else if variant === "escalations"}
  <!-- Escalations: card list with actions -->
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <Skeleton class="h-7 w-40" />
      <Skeleton class="h-5 w-24 rounded-full" />
    </div>
    {#each Array(4) as _}
      <div class="rounded-lg border p-5 space-y-3">
        <div class="flex items-center justify-between">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-5 w-16 rounded-full" />
        </div>
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-3/4" />
        <div class="border-t pt-3 space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-2/3" />
        </div>
        <div class="flex gap-2">
          <Skeleton class="h-8 w-20 rounded-md" />
          <Skeleton class="h-8 w-20 rounded-md" />
          <Skeleton class="h-8 w-16 rounded-md" />
        </div>
      </div>
    {/each}
  </div>
{/if}
