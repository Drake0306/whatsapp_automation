<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  const convos = $derived($page.data.conversations ?? []);
  const thread = $derived($page.data.thread ?? []);
  const selectedId = $derived($page.data.selectedId);

  function selectConvo(id: string) {
    goto(`/dashboard/conversations?id=${id}`);
  }
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Conversations</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <div class="mx-auto flex max-w-7xl" style="height: calc(100vh - 65px);">
    <!-- Conversation list -->
    <div class="w-80 shrink-0 overflow-y-auto border-r">
      {#if convos.length === 0}
        <p class="p-4 text-sm text-muted-foreground">No conversations yet.</p>
      {:else}
        {#each convos as convo}
          <button
            onclick={() => selectConvo(convo.id)}
            class="flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-accent
              {selectedId === convo.id ? 'bg-accent' : ''}"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {(convo.customerName ?? convo.customerPhone).slice(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {convo.customerName || convo.customerPhone}
              </p>
              <p class="text-xs text-muted-foreground">
                {convo.lastMessageAt
                  ? new Date(convo.lastMessageAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No messages"}
              </p>
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Message thread -->
    <div class="flex flex-1 flex-col">
      {#if !selectedId}
        <div class="flex flex-1 items-center justify-center text-muted-foreground">
          Select a conversation to view messages
        </div>
      {:else if thread.length === 0}
        <div class="flex flex-1 items-center justify-center text-muted-foreground">
          No messages in this conversation
        </div>
      {:else}
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          {#each thread as msg}
            <div class="flex {msg.direction === 'in' ? 'justify-start' : 'justify-end'}">
              <div
                class="max-w-[75%] rounded-lg px-3 py-2 text-sm
                  {msg.direction === 'in'
                    ? 'bg-muted'
                    : msg.needsReview
                      ? 'bg-yellow-100 border border-yellow-300'
                      : 'bg-primary text-primary-foreground'}"
              >
                <p>{msg.text ?? "(no text)"}</p>
                <p class="mt-1 text-[10px] opacity-60">
                  {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {#if msg.skillId}
                    &middot; {msg.skillId}
                  {/if}
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
