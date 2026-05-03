<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";

  const docs = $derived($page.data.docs ?? []);

  let fileInput = $state<HTMLInputElement>(null!);
  let uploading = $state(false);
  let deletingSource = $state<string | null>(null);

  async function handleUpload() {
    if (!fileInput?.files?.length) return;
    uploading = true;

    const formData = new FormData();
    for (const file of fileInput.files) {
      formData.append("files", file);
    }

    try {
      await fetch("/api/upload", { method: "POST", body: formData });
      await invalidateAll();
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = "";
    }
  }
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Knowledge Base</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-3xl px-4 py-8">
    <p class="text-sm text-muted-foreground">
      Upload your price list, service menu, or FAQ documents. The AI uses these to answer customer questions.
    </p>

    <!-- Upload -->
    <div class="mt-6 rounded-lg border-2 border-dashed border-input p-6 text-center">
      <input
        bind:this={fileInput}
        type="file"
        accept=".pdf,.txt,.csv"
        multiple
        onchange={handleUpload}
        class="hidden"
        id="kb-upload"
      />
      <label for="kb-upload" class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
        {uploading ? "Uploading..." : "Click to upload PDF, TXT, or CSV files"}
      </label>
    </div>

    <!-- Document list -->
    {#if docs.length === 0}
      <div class="mt-6 rounded-lg border p-8 text-center">
        <p class="text-muted-foreground">No documents uploaded yet.</p>
      </div>
    {:else}
      <div class="mt-6 space-y-3">
        {#each docs as doc}
          <div class="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p class="text-sm font-medium">{doc.source}</p>
              <p class="text-xs text-muted-foreground">
                {doc.chunkCount} chunks &middot;
                {doc.createdAt
                  ? new Date(doc.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : ""}
              </p>
            </div>
            <form method="POST" action="?/delete" use:enhance={() => {
              deletingSource = doc.source;
              return async ({ update }) => {
                await update();
                deletingSource = null;
              };
            }}>
              <input type="hidden" name="source" value={doc.source} />
              <button
                type="submit"
                disabled={deletingSource === doc.source}
                class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingSource === doc.source ? "Deleting..." : "Delete"}
              </button>
            </form>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>
