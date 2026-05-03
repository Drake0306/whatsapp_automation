<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const escalations = $derived($page.data.escalations ?? []);

  let editingId = $state<string | null>(null);
  let editText = $state("");

  function startEdit(id: string, text: string) {
    editingId = id;
    editText = text;
  }

  function cancelEdit() {
    editingId = null;
    editText = "";
  }
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">WhatsAppFlow</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-3xl px-4 py-8">
    <h2 class="text-2xl font-bold">Escalation Queue</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Review low-confidence replies before they're sent to customers
    </p>

    {#if escalations.length === 0}
      <div class="mt-8 rounded-lg border p-8 text-center">
        <p class="text-muted-foreground">No pending escalations. All clear!</p>
      </div>
    {:else}
      <div class="mt-6 space-y-4">
        {#each escalations as esc}
          <div class="rounded-lg border p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 space-y-2">
                <p class="text-xs text-muted-foreground">
                  {esc.customerPhone} &middot;
                  Confidence: {esc.confidence != null ? Math.round(esc.confidence * 100) + "%" : "—"}
                </p>

                {#if esc.customerMessage}
                  <div class="rounded bg-muted p-2 text-sm">
                    <span class="text-xs font-medium text-muted-foreground">Customer:</span>
                    <p>{esc.customerMessage}</p>
                  </div>
                {/if}

                {#if editingId === esc.id}
                  <form method="POST" action="?/rewrite" use:enhance={() => {
                    return async ({ update }) => {
                      await update();
                      cancelEdit();
                    };
                  }}>
                    <input type="hidden" name="escalationId" value={esc.id} />
                    <textarea
                      name="newReply"
                      bind:value={editText}
                      rows="3"
                      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    ></textarea>
                    <div class="mt-2 flex gap-2">
                      <button
                        type="submit"
                        class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Send Edited
                      </button>
                      <button
                        type="button"
                        onclick={cancelEdit}
                        class="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                {:else}
                  <div class="rounded border-l-2 border-primary/30 bg-secondary/50 p-2 text-sm">
                    <span class="text-xs font-medium text-muted-foreground">Bot reply:</span>
                    <p>{esc.proposedReply}</p>
                  </div>
                {/if}
              </div>
            </div>

            {#if editingId !== esc.id}
              <div class="mt-3 flex gap-2">
                <form method="POST" action="?/approve" use:enhance>
                  <input type="hidden" name="escalationId" value={esc.id} />
                  <button
                    type="submit"
                    class="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Approve & Send
                  </button>
                </form>
                <button
                  type="button"
                  onclick={() => startEdit(esc.id, esc.proposedReply)}
                  class="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Edit
                </button>
                <form method="POST" action="?/skip" use:enhance>
                  <input type="hidden" name="escalationId" value={esc.id} />
                  <button
                    type="submit"
                    class="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    Skip
                  </button>
                </form>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>
