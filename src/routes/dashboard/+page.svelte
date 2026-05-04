<script lang="ts">
  import { page } from "$app/stores";
  import { signOut } from "@auth/sveltekit/client";

  const session = $derived($page.data.session);
  const business = $derived($page.data.business);
  const stats = $derived($page.data.stats);
  const recentConversations = $derived($page.data.recentConversations);
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">WhatsAppFlow</h1>
        {#if business}
          <span class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {business.name}
          </span>
        {/if}
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm text-muted-foreground">
          {session?.user?.email}
        </span>
        <button
          onclick={() => signOut({ callbackUrl: "/" })}
          class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
        >
          Sign out
        </button>
      </div>
    </div>
  </header>

  <nav class="border-b">
    <div class="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4">
      <a href="/dashboard" class="border-b-2 border-primary py-3 text-sm font-medium">
        Dashboard
      </a>
      <a href="/dashboard/conversations" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Conversations
      </a>
      <a href="/dashboard/contacts" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Contacts
      </a>
      <a href="/dashboard/appointments" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Appointments
      </a>
      <a href="/dashboard/services" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Services
      </a>
      <a href="/dashboard/broadcasts" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Broadcasts
      </a>
      <a href="/dashboard/knowledge" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Knowledge
      </a>
      <a href="/dashboard/escalations" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Escalations
      </a>
      <a href="/dashboard/feedback" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Feedback
      </a>
      <a href="/dashboard/analytics" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Analytics
      </a>
      <a href="/dashboard/quick-replies" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Quick Replies
      </a>
      <a href="/dashboard/billing" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Billing
      </a>
      <a href="/dashboard/settings" class="py-3 text-sm text-muted-foreground hover:text-foreground">
        Settings
      </a>
    </div>
  </nav>

  <main class="mx-auto max-w-7xl px-4 py-8">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">Dashboard</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Overview of your WhatsApp AI assistant
        </p>
      </div>
      <!-- Quick Actions -->
      <div class="flex gap-2">
        <a
          href="/dashboard/broadcasts"
          class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Send Broadcast
        </a>
        {#if stats?.pendingEscalations > 0}
          <a
            href="/dashboard/escalations"
            class="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
          >
            {stats.pendingEscalations} Pending Reviews
          </a>
        {/if}
      </div>
    </div>

    <!-- Status indicator -->
    {#if business}
      <div class="mt-4 rounded-lg border p-3">
        <div class="flex items-center gap-2">
          <div
            class="h-2.5 w-2.5 rounded-full {business.whatsappPhoneNumberId
              ? 'bg-green-500'
              : 'bg-yellow-500'}"
          ></div>
          <span class="text-sm font-medium">
            {business.whatsappPhoneNumberId
              ? "WhatsApp connected — bot is live"
              : "WhatsApp not connected yet"}
          </span>
          {#if !business.whatsappPhoneNumberId}
            <a
              href="/onboarding"
              class="ml-2 text-sm text-primary underline hover:no-underline"
            >
              Complete setup
            </a>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Stats grid -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Total Conversations</p>
        <p class="mt-1 text-3xl font-bold">{stats?.conversations ?? 0}</p>
      </div>
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Bookings Today</p>
        <p class="mt-1 text-3xl font-bold">{stats?.todayBookings ?? 0}</p>
      </div>
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Messages Today</p>
        <p class="mt-1 text-3xl font-bold">{stats?.todayMessages ?? 0}</p>
      </div>
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Pending Reviews</p>
        <p class="mt-1 text-3xl font-bold">{stats?.pendingEscalations ?? 0}</p>
      </div>
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Total Contacts</p>
        <p class="mt-1 text-3xl font-bold">{stats?.totalContacts ?? 0}</p>
      </div>
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Avg Customer Rating</p>
        <p class="mt-1 text-3xl font-bold">
          {#if stats?.avgRating}
            {stats.avgRating} <span class="text-lg text-yellow-500">★</span>
          {:else}
            —
          {/if}
        </p>
      </div>
      <div class="rounded-lg border p-5">
        <p class="text-sm font-medium text-muted-foreground">Broadcasts Sent</p>
        <p class="mt-1 text-3xl font-bold">{stats?.broadcastsSent ?? 0}</p>
      </div>
      <a href="/dashboard/analytics" class="rounded-lg border p-5 hover:bg-accent">
        <p class="text-sm font-medium text-muted-foreground">View Full Analytics</p>
        <p class="mt-1 text-sm text-primary">Charts, trends, breakdowns →</p>
      </a>
    </div>

    <!-- Recent conversations -->
    <div class="mt-8">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Recent Conversations</h3>
        <a
          href="/dashboard/conversations"
          class="text-sm text-primary hover:underline"
        >
          View all
        </a>
      </div>
      {#if recentConversations && recentConversations.length > 0}
        <div class="mt-3 divide-y rounded-lg border">
          {#each recentConversations as convo}
            <a
              href="/dashboard/conversations?id={convo.id}"
              class="flex items-center justify-between px-4 py-3 hover:bg-accent"
            >
              <div>
                <p class="text-sm font-medium">
                  {convo.customerName || convo.customerPhone}
                </p>
                {#if convo.customerName}
                  <p class="text-xs text-muted-foreground">{convo.customerPhone}</p>
                {/if}
              </div>
              <span class="text-xs text-muted-foreground">
                {convo.lastMessageAt
                  ? new Date(convo.lastMessageAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </a>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">
          No conversations yet. Once customers message your WhatsApp number,
          they'll appear here.
        </p>
      {/if}
    </div>
  </main>
</div>
