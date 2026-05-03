<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";

  const business = $derived($page.data.business);
  const contactList = $derived($page.data.contacts ?? []);
  const selectedId = $derived($page.data.selectedId);

  let showAdd = $state(false);
  let tagInput = $state("");
  let search = $state("");

  const filtered = $derived(
    search
      ? contactList.filter(
          (c: Record<string, unknown>) =>
            (c.name as string)?.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone as string)?.includes(search),
        )
      : contactList,
  );

  const selected = $derived(
    selectedId ? contactList.find((c: Record<string, unknown>) => c.id === selectedId) : null,
  );
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Contacts</h1>
      <div class="flex items-center gap-3">
        <button
          onclick={() => (showAdd = !showAdd)}
          class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Add Contact
        </button>
        <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
          Back to Dashboard
        </a>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-7xl px-4 py-6">
    {#if showAdd}
      <div class="mb-6 rounded-lg border p-4">
        <h3 class="text-sm font-semibold">Add New Contact</h3>
        <form
          method="POST"
          action="?/add-contact"
          class="mt-3 flex flex-wrap gap-3"
          use:enhance={() => {
            return async ({ update }) => {
              await update();
              showAdd = false;
            };
          }}
        >
          <input
            name="phone"
            type="text"
            placeholder="Phone (e.g. 919876543210)"
            required
            class="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="name"
            type="text"
            placeholder="Name (optional)"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="email"
            type="email"
            placeholder="Email (optional)"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Save
          </button>
          <button
            type="button"
            onclick={() => (showAdd = false)}
            class="rounded-md border border-input px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </form>
      </div>
    {/if}

    <div class="flex gap-6">
      <!-- Contact list -->
      <div class="w-80 shrink-0">
        <input
          type="text"
          placeholder="Search contacts..."
          bind:value={search}
          class="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div class="divide-y rounded-lg border">
          {#each filtered as contact}
            <a
              href="/dashboard/contacts?id={contact.id}"
              class="block px-4 py-3 hover:bg-accent {contact.id === selectedId
                ? 'bg-accent'
                : ''}"
            >
              <p class="text-sm font-medium">{contact.name || contact.phone}</p>
              {#if contact.name}
                <p class="text-xs text-muted-foreground">{contact.phone}</p>
              {/if}
              <div class="mt-1 flex gap-1">
                {#each contact.tags as tag}
                  <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800">
                    {tag}
                  </span>
                {/each}
              </div>
            </a>
          {:else}
            <p class="px-4 py-6 text-center text-sm text-muted-foreground">
              No contacts yet. Add contacts manually or they'll be auto-created from WhatsApp conversations.
            </p>
          {/each}
        </div>
      </div>

      <!-- Contact detail -->
      <div class="flex-1">
        {#if selected}
          <div class="rounded-lg border p-6">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-lg font-semibold">{selected.name || selected.phone}</h2>
                <p class="text-sm text-muted-foreground">{selected.phone}</p>
                {#if selected.email}
                  <p class="text-sm text-muted-foreground">{selected.email}</p>
                {/if}
              </div>
              <span class="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {selected.source}
              </span>
            </div>

            <!-- Stats -->
            <div class="mt-4 grid grid-cols-2 gap-4">
              <div class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Appointments</p>
                <p class="text-xl font-bold">{selected.appointmentCount}</p>
              </div>
              <div class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Last Interaction</p>
                <p class="text-sm font-medium">
                  {selected.lastInteraction
                    ? new Date(selected.lastInteraction).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Never"}
                </p>
              </div>
            </div>

            <!-- Tags -->
            <div class="mt-4">
              <h3 class="text-sm font-medium">Tags</h3>
              <div class="mt-2 flex flex-wrap gap-2">
                {#each selected.tags as tag}
                  <form method="POST" action="?/remove-tag" use:enhance>
                    <input type="hidden" name="contactId" value={selected.id} />
                    <input type="hidden" name="tag" value={tag} />
                    <button
                      type="submit"
                      class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800 hover:bg-blue-200"
                    >
                      {tag} &times;
                    </button>
                  </form>
                {/each}
                <form
                  method="POST"
                  action="?/add-tag"
                  class="inline-flex gap-1"
                  use:enhance={() => {
                    return async ({ update }) => {
                      await update();
                      tagInput = "";
                    };
                  }}
                >
                  <input type="hidden" name="contactId" value={selected.id} />
                  <input
                    name="tag"
                    type="text"
                    bind:value={tagInput}
                    placeholder="Add tag..."
                    class="w-24 rounded-md border border-input bg-background px-2 py-0.5 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    class="rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                  >
                    +
                  </button>
                </form>
              </div>
            </div>

            <!-- Notes -->
            <div class="mt-4">
              <h3 class="text-sm font-medium">Notes</h3>
              <form
                method="POST"
                action="?/update-notes"
                use:enhance
                class="mt-2"
              >
                <input type="hidden" name="contactId" value={selected.id} />
                <textarea
                  name="notes"
                  rows="3"
                  value={selected.notes ?? ""}
                  placeholder="Add notes about this customer..."
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                ></textarea>
                <button
                  type="submit"
                  class="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save Notes
                </button>
              </form>
            </div>
          </div>
        {:else}
          <div class="flex h-64 items-center justify-center rounded-lg border">
            <p class="text-sm text-muted-foreground">
              Select a contact to view details
            </p>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>
