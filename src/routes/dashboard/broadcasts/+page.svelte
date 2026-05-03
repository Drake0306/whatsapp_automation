<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const business = $derived($page.data.business);
  const campaigns = $derived($page.data.campaigns ?? []);
  const availableTags = $derived($page.data.availableTags ?? []);
  const totalContacts = $derived($page.data.totalContacts ?? 0);

  let showCreate = $state(false);
  let sending = $state<string | null>(null);
  let useTemplate = $state(false);
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Broadcasts</h1>
      <div class="flex items-center gap-3">
        <button
          onclick={() => (showCreate = !showCreate)}
          class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Campaign
        </button>
        <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
          Back to Dashboard
        </a>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-4xl px-4 py-6">
    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">Total Contacts</p>
        <p class="text-2xl font-bold">{totalContacts}</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">Campaigns Sent</p>
        <p class="text-2xl font-bold">{campaigns.filter((c: Record<string, unknown>) => c.status === "sent").length}</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-sm text-muted-foreground">Draft Campaigns</p>
        <p class="text-2xl font-bold">{campaigns.filter((c: Record<string, unknown>) => c.status === "draft").length}</p>
      </div>
    </div>

    {#if showCreate}
      <div class="mt-6 rounded-lg border p-6">
        <h2 class="text-lg font-semibold">Create Campaign</h2>
        <form
          method="POST"
          action="?/create"
          class="mt-4 space-y-4"
          use:enhance={() => {
            return async ({ update }) => {
              await update();
              showCreate = false;
            };
          }}
        >
          <div>
            <label for="name" class="block text-sm font-medium">Campaign Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Diwali Offers, Weekly Reminder"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" bind:checked={useTemplate} class="rounded" />
              Use WhatsApp Template (pre-approved by Meta)
            </label>
          </div>

          {#if useTemplate}
            <div>
              <label for="templateName" class="block text-sm font-medium">Template Name</label>
              <input
                id="templateName"
                name="templateName"
                type="text"
                placeholder="e.g. appointment_reminder"
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          {/if}

          <div>
            <label for="messageText" class="block text-sm font-medium">
              {useTemplate ? "Fallback Text (if template fails)" : "Message Text"}
            </label>
            <textarea
              id="messageText"
              name="messageText"
              rows="3"
              placeholder="Type your broadcast message..."
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            ></textarea>
          </div>

          <div>
            <label for="tags" class="block text-sm font-medium">
              Filter by Tags <span class="text-muted-foreground">(optional, comma-separated)</span>
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              placeholder="e.g. vip, salon-regular"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {#if availableTags.length > 0}
              <div class="mt-2 flex flex-wrap gap-1">
                {#each availableTags as tag}
                  <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800">
                    {tag}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create Draft
            </button>
            <button
              type="button"
              onclick={() => (showCreate = false)}
              class="rounded-md border border-input px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Campaign list -->
    <div class="mt-6">
      <h2 class="text-lg font-semibold">Campaigns</h2>
      {#if campaigns.length > 0}
        <div class="mt-3 space-y-3">
          {#each campaigns as campaign}
            <div class="rounded-lg border p-4">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="font-medium">{campaign.name}</h3>
                  <p class="mt-0.5 text-sm text-muted-foreground">
                    {campaign.totalRecipients} recipients
                    {#if campaign.templateName}
                      &middot; Template: {campaign.templateName}
                    {/if}
                  </p>
                  {#if campaign.messageText}
                    <p class="mt-1 text-sm">{campaign.messageText.slice(0, 120)}{campaign.messageText.length > 120 ? "..." : ""}</p>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium
                      {campaign.status === 'sent'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'sending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-muted text-muted-foreground'}"
                  >
                    {campaign.status}
                  </span>
                  {#if campaign.status === "draft"}
                    <form method="POST" action="?/send" use:enhance>
                      <input type="hidden" name="broadcastId" value={campaign.id} />
                      <button
                        type="submit"
                        class="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Send Now
                      </button>
                    </form>
                  {/if}
                </div>
              </div>
              {#if campaign.status === "sent"}
                <div class="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Sent: {campaign.sentCount}</span>
                  <span>Failed: {campaign.failedCount}</span>
                  <span>
                    Sent at: {campaign.sentAt
                      ? new Date(campaign.sentAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">
          No campaigns yet. Create your first broadcast to reach all your contacts at once.
        </p>
      {/if}
    </div>
  </main>
</div>
