<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const business = $derived($page.data.business);
  const replies = $derived($page.data.quickReplies ?? []);

  let showCreate = $state(false);
  let editingId = $state<string | null>(null);
  let creatingReply = $state(false);
  let updatingReply = $state(false);
  let deletingId = $state<string | null>(null);
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Quick Replies</h1>
      <div class="flex items-center gap-3">
        <button
          onclick={() => {
            showCreate = !showCreate;
            editingId = null;
          }}
          class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Template
        </button>
        <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
          Back to Dashboard
        </a>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-3xl px-4 py-6">
    <p class="text-sm text-muted-foreground">
      Pre-saved message templates you can quickly send to customers during conversations or escalations.
    </p>

    {#if showCreate}
      <div class="mt-6 rounded-lg border p-4">
        <h3 class="text-sm font-semibold">New Quick Reply</h3>
        <form
          method="POST"
          action="?/create"
          class="mt-3 space-y-3"
          use:enhance={() => {
            creatingReply = true;
            return async ({ update }) => {
              await update();
              creatingReply = false;
              showCreate = false;
            };
          }}
        >
          <div>
            <label for="title" class="block text-sm font-medium">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Welcome Message, Booking Confirmation"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label for="shortcut" class="block text-sm font-medium">
              Shortcut <span class="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="shortcut"
              name="shortcut"
              type="text"
              placeholder="e.g. /welcome, /confirm"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label for="body" class="block text-sm font-medium">Message Body</label>
            <textarea
              id="body"
              name="body"
              rows="4"
              required
              placeholder="Type your template message... Use *bold* and _italic_ for WhatsApp formatting."
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            ></textarea>
          </div>
          <div class="flex gap-3">
            <button
              type="submit"
              disabled={creatingReply}
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {creatingReply ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onclick={() => (showCreate = false)}
              disabled={creatingReply}
              class="rounded-md border border-input px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Reply list -->
    <div class="mt-6 space-y-3">
      {#each replies as reply}
        <div class="rounded-lg border p-4">
          {#if editingId === reply.id}
            <form
              method="POST"
              action="?/update"
              class="space-y-3"
              use:enhance={() => {
                updatingReply = true;
                return async ({ update }) => {
                  await update();
                  updatingReply = false;
                  editingId = null;
                };
              }}
            >
              <input type="hidden" name="replyId" value={reply.id} />
              <input
                name="title"
                type="text"
                value={reply.title}
                required
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                name="shortcut"
                type="text"
                value={reply.shortcut ?? ""}
                placeholder="Shortcut (optional)"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                name="body"
                rows="3"
                required
                value={reply.body}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              ></textarea>
              <div class="flex gap-2">
                <button
                  type="submit"
                  disabled={updatingReply}
                  class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {updatingReply ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onclick={() => (editingId = null)}
                  disabled={updatingReply}
                  class="rounded-md border border-input px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          {:else}
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-medium">{reply.title}</h3>
                {#if reply.shortcut}
                  <span class="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {reply.shortcut}
                  </span>
                {/if}
                <p class="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{reply.body}</p>
              </div>
              <div class="flex gap-2">
                <button
                  onclick={() => (editingId = reply.id)}
                  class="rounded-md border border-input px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Edit
                </button>
                <form method="POST" action="?/delete" use:enhance={() => {
                  deletingId = reply.id;
                  return async ({ update }) => {
                    await update();
                    deletingId = null;
                  };
                }}>
                  <input type="hidden" name="replyId" value={reply.id} />
                  <button
                    type="submit"
                    disabled={deletingId === reply.id}
                    class="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === reply.id ? "Deleting..." : "Delete"}
                  </button>
                </form>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">
          No quick replies yet. Create templates for common responses to save time when reviewing escalations.
        </p>
      {/each}
    </div>
  </main>
</div>
