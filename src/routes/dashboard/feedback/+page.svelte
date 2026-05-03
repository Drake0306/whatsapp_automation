<script lang="ts">
  import { page } from "$app/stores";

  const business = $derived($page.data.business);
  const responses = $derived($page.data.responses ?? []);
  const stats = $derived($page.data.stats);

  function stars(rating: number | null): string {
    if (!rating) return "—";
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Customer Feedback</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-4xl px-4 py-6">
    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-4">
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Average Rating</p>
        <p class="mt-1 text-3xl font-bold">
          {stats?.averageRating ?? "—"}
          {#if stats?.averageRating}
            <span class="text-lg text-yellow-500">★</span>
          {/if}
        </p>
      </div>
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Feedback Sent</p>
        <p class="mt-1 text-3xl font-bold">{stats?.totalSent ?? 0}</p>
      </div>
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Responses</p>
        <p class="mt-1 text-3xl font-bold">{stats?.totalResponded ?? 0}</p>
      </div>
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Response Rate</p>
        <p class="mt-1 text-3xl font-bold">{stats?.responseRate ?? 0}%</p>
      </div>
    </div>

    <!-- Rating distribution -->
    {#if stats?.ratingDistribution && stats.ratingDistribution.length > 0}
      <div class="mt-6 rounded-lg border p-4">
        <h2 class="text-sm font-semibold">Rating Distribution</h2>
        <div class="mt-3 space-y-2">
          {#each [5, 4, 3, 2, 1] as r}
            {@const item = stats.ratingDistribution.find(
              (d: { rating: number | null; count: number }) => d.rating === r,
            )}
            {@const count = item?.count ?? 0}
            {@const total = stats.totalResponded || 1}
            <div class="flex items-center gap-3">
              <span class="w-12 text-right text-sm">{r} ★</span>
              <div class="flex-1">
                <div class="h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full {r >= 4
                      ? 'bg-green-500'
                      : r === 3
                        ? 'bg-yellow-500'
                        : 'bg-red-500'}"
                    style="width: {(count / total) * 100}%"
                  ></div>
                </div>
              </div>
              <span class="w-8 text-sm text-muted-foreground">{count}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Individual responses -->
    <div class="mt-6">
      <h2 class="text-lg font-semibold">Recent Feedback</h2>
      {#if responses.length > 0}
        <div class="mt-3 space-y-3">
          {#each responses as fb}
            <div class="rounded-lg border p-4">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-lg text-yellow-500">{stars(fb.rating)}</span>
                  <span class="ml-2 text-sm text-muted-foreground">{fb.customerPhone}</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if fb.googleReviewNudgeSent}
                    <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800">
                      Review nudge sent
                    </span>
                  {/if}
                  <span class="text-xs text-muted-foreground">
                    {fb.respondedAt
                      ? new Date(fb.respondedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </span>
                </div>
              </div>
              {#if fb.comment}
                <p class="mt-2 text-sm">{fb.comment}</p>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">
          No feedback collected yet. Feedback requests are automatically sent after completed appointments.
        </p>
      {/if}
    </div>
  </main>
</div>
