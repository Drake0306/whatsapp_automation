<script lang="ts">
  import { page } from "$app/stores";

  const analytics = $derived($page.data.analytics);

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-500",
    completed: "bg-blue-500",
    cancelled: "bg-red-500",
    no_show: "bg-yellow-500",
  };
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Analytics</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-5xl px-4 py-8">
    <p class="text-sm text-muted-foreground">Last 30 days</p>

    <!-- Summary cards -->
    <div class="mt-4 grid gap-4 sm:grid-cols-4">
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">Total Bookings</p>
        <p class="mt-1 text-2xl font-bold">{analytics?.totalBookings ?? 0}</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">No-Show Rate</p>
        <p class="mt-1 text-2xl font-bold">{analytics?.noShowRate ?? 0}%</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">No-Shows</p>
        <p class="mt-1 text-2xl font-bold">{analytics?.noShowCount ?? 0}</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">Conversations</p>
        <p class="mt-1 text-2xl font-bold">
          {analytics?.convosPerDay?.reduce((s: number, d: { count: number }) => s + Number(d.count), 0) ?? 0}
        </p>
      </div>
    </div>

    <!-- Bookings per day -->
    <div class="mt-8">
      <h2 class="text-lg font-semibold">Bookings per Day</h2>
      {#if analytics?.bookingsPerDay?.length}
        <div class="mt-3 flex items-end gap-1" style="height: 120px;">
          {#each analytics.bookingsPerDay as day}
            {@const maxCount = Math.max(...analytics.bookingsPerDay.map((d: { count: number }) => Number(d.count)))}
            <div class="group relative flex-1">
              <div
                class="w-full rounded-t bg-primary"
                style="height: {Math.max(4, (Number(day.count) / maxCount) * 100)}px"
              ></div>
              <div class="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                {day.date}: {day.count}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">No booking data yet.</p>
      {/if}
    </div>

    <!-- Appointment status breakdown -->
    <div class="mt-8">
      <h2 class="text-lg font-semibold">Appointment Status</h2>
      {#if analytics?.statusBreakdown?.length}
        <div class="mt-3 space-y-2">
          {#each analytics.statusBreakdown as entry}
            {@const total = analytics.totalBookings || 1}
            <div class="flex items-center gap-3">
              <span class="w-24 text-sm capitalize">{entry.status}</span>
              <div class="flex-1">
                <div
                  class="h-6 rounded {statusColors[entry.status] ?? 'bg-muted'}"
                  style="width: {Math.max(2, (Number(entry.count) / total) * 100)}%"
                ></div>
              </div>
              <span class="w-8 text-right text-sm">{entry.count}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">No data yet.</p>
      {/if}
    </div>

    <!-- Replies by skill -->
    <div class="mt-8">
      <h2 class="text-lg font-semibold">Bot Replies by Skill</h2>
      {#if analytics?.messagesBySkill?.length}
        <div class="mt-3 space-y-2">
          {#each analytics.messagesBySkill as entry}
            <div class="flex items-center justify-between rounded-lg border px-4 py-2">
              <span class="text-sm">{entry.skillId ?? "unknown"}</span>
              <span class="text-sm font-medium">{entry.count}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">No reply data yet.</p>
      {/if}
    </div>
  </main>
</div>
