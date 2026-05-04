<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";

  const docs = $derived($page.data.docs ?? []);
  const business = $derived($page.data.business);

  let fileInput = $state<HTMLInputElement>(null!);
  let uploading = $state(false);
  let deletingSource = $state<string | null>(null);
  let saving = $state(false);

  let showEditor = $state(false);
  let editorTitle = $state("");
  let editorContent = $state("");

  async function handleUpload() {
    if (!fileInput?.files?.length) return;
    uploading = true;

    const formData = new FormData();
    for (const file of fileInput.files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.errors?.length) {
        alert("Some files failed: " + data.errors.join(", "));
      }
      await invalidateAll();
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = "";
    }
  }

  function downloadTemplate() {
    const name = business?.name || "Your Business";
    const vertical = business?.vertical || "business";

    const template = `${name.toUpperCase()} — SERVICE MENU & FAQ
Location: [Your address]
Hours: [e.g. Mon–Sat 9:00 AM – 8:00 PM]
Phone: [Your phone number]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICES & PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Service 1]                    ₹[Price]      [Duration]
[Service 2]                    ₹[Price]      [Duration]
[Service 3]                    ₹[Price]      [Duration]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGES / COMBOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Package 1]: [What's included]     ₹[Price]
[Package 2]: [What's included]     ₹[Price]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFERS & DISCOUNTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [e.g. First-time customers get 10% off]
- [e.g. Refer a friend and both get ₹200 off]
- [e.g. Festival/seasonal offers]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FREQUENTLY ASKED QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: [Common question 1]
A: [Your answer]

Q: [Common question 2]
A: [Your answer]

Q: [Common question 3]
A: [Your answer]

Q: Do I need an appointment?
A: [Your answer]

Q: What payment methods do you accept?
A: [Your answer]

Q: What are your cancellation policies?
A: [Your answer]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Any other info your customers commonly ask about — parking, special instructions, etc.]
`;

    const blob = new Blob([template], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-knowledge-base-template.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
      Add your services, pricing, and FAQs. The AI uses this to answer customer questions on WhatsApp.
    </p>

    <!-- Action buttons -->
    <div class="mt-6 grid gap-3 sm:grid-cols-3">
      <!-- Upload file -->
      <div class="rounded-lg border p-4 text-center">
        <input
          bind:this={fileInput}
          type="file"
          accept=".pdf,.txt,.csv"
          multiple
          onchange={handleUpload}
          class="hidden"
          id="kb-upload"
        />
        <label for="kb-upload" class="block cursor-pointer">
          <span class="text-2xl">📄</span>
          <p class="mt-2 text-sm font-medium">
            {uploading ? "Uploading..." : "Upload File"}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">PDF, TXT, or CSV</p>
        </label>
      </div>

      <!-- Write directly -->
      <button
        onclick={() => { showEditor = true; }}
        class="rounded-lg border p-4 text-center hover:bg-accent transition-colors"
      >
        <span class="text-2xl">✏️</span>
        <p class="mt-2 text-sm font-medium">Write Directly</p>
        <p class="mt-1 text-xs text-muted-foreground">Type or paste content</p>
      </button>

      <!-- Download template -->
      <button
        onclick={downloadTemplate}
        class="rounded-lg border p-4 text-center hover:bg-accent transition-colors"
      >
        <span class="text-2xl">📋</span>
        <p class="mt-2 text-sm font-medium">Download Template</p>
        <p class="mt-1 text-xs text-muted-foreground">Fill in and upload</p>
      </button>
    </div>

    <!-- Inline text editor -->
    {#if showEditor}
      <form
        method="POST"
        action="?/save-text"
        class="mt-6 rounded-lg border p-4"
        use:enhance={() => {
          saving = true;
          return async ({ result, update }) => {
            await update();
            saving = false;
            if (result.type === "success") {
              showEditor = false;
              editorTitle = "";
              editorContent = "";
            }
          };
        }}
      >
        <h3 class="text-sm font-medium">Add Knowledge Base Content</h3>
        <input
          name="title"
          type="text"
          bind:value={editorTitle}
          placeholder="Title (e.g. Service Menu, FAQ, Pricing)"
          class="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          name="content"
          bind:value={editorContent}
          rows="12"
          required
          placeholder="Paste or type your business information here...

Example:
- Haircut: ₹500 (30 min)
- Hair Spa: ₹1200 (60 min)
- We accept UPI, cash, and cards
- Open Mon-Sat, 9am-8pm
- Walk-ins welcome, appointments preferred on weekends"
          class="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
        ></textarea>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !editorContent.trim()}
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save to Knowledge Base"}
          </button>
          <button
            type="button"
            onclick={() => { showEditor = false; }}
            class="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    {/if}

    <!-- Document list -->
    {#if docs.length === 0}
      <div class="mt-6 rounded-lg border p-8 text-center">
        <p class="text-muted-foreground">No documents uploaded yet.</p>
        <p class="mt-2 text-xs text-muted-foreground">
          Upload a file, write content directly, or download the template to get started.
        </p>
      </div>
    {:else}
      <div class="mt-6">
        <h2 class="text-sm font-medium text-muted-foreground">Uploaded Documents</h2>
        <div class="mt-3 space-y-3">
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
      </div>
    {/if}
  </main>
</div>
