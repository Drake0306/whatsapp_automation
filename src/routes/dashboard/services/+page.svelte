<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const services = $derived($page.data.services ?? []);
  const blocks = $derived($page.data.blocks ?? []);
  const business = $derived($page.data.business);
  const formError = $derived($page.form?.error as string | undefined);

  let saving = $state(false);
  let editingId = $state<string | null>(null);
  let showAddForm = $state(false);
  let showBlockForm = $state(false);

  let newName = $state("");
  let newDuration = $state(60);
  let newCapacity = $state(1);
  let newBookingMode = $state("instant");
  let newPrice = $state("");

  let blockServiceId = $state("");
  let blockStart = $state("");
  let blockEnd = $state("");
  let blockReason = $state("");

  function resetAddForm() {
    showAddForm = false;
    newName = "";
    newDuration = 60;
    newCapacity = 1;
    newBookingMode = "instant";
    newPrice = "";
  }

  function resetBlockForm() {
    showBlockForm = false;
    blockServiceId = "";
    blockStart = "";
    blockEnd = "";
    blockReason = "";
  }

  function formatDateTime(date: string | Date) {
    return new Date(date).toLocaleString("en-IN", {
      timeZone: business?.timezone ?? "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Services</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-5xl px-4 py-8">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Manage your bookable services and availability blocks
      </p>
      <button
        onclick={() => { showAddForm = !showAddForm; }}
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {showAddForm ? "Cancel" : "Add Service"}
      </button>
    </div>

    {#if formError}
      <div class="mt-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
        {formError}
      </div>
    {/if}

    <!-- Add Service Form -->
    {#if showAddForm}
      <form
        method="POST"
        action="?/add-service"
        use:enhance={() => {
          saving = true;
          return async ({ result, update }) => {
            saving = false;
            await update();
            if (result.type === "success") resetAddForm();
          };
        }}
        class="mt-6 rounded-lg border p-4 space-y-4"
      >
        <h3 class="font-semibold">New Service</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="new-name" class="block text-sm font-medium">Name</label>
            <input
              id="new-name"
              name="name"
              type="text"
              bind:value={newName}
              required
              placeholder="e.g. Haircut"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label for="new-duration" class="block text-sm font-medium">Duration (minutes)</label>
            <input
              id="new-duration"
              name="durationMin"
              type="number"
              min="5"
              max="480"
              bind:value={newDuration}
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label for="new-capacity" class="block text-sm font-medium">Capacity</label>
            <input
              id="new-capacity"
              name="capacity"
              type="number"
              min="1"
              max="999"
              bind:value={newCapacity}
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p class="mt-1 text-xs text-muted-foreground">How many concurrent bookings per slot</p>
          </div>
          <div>
            <label for="new-mode" class="block text-sm font-medium">Booking Mode</label>
            <select
              id="new-mode"
              name="bookingMode"
              bind:value={newBookingMode}
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="instant">Instant (auto-confirm)</option>
              <option value="queue">Queue (you confirm)</option>
            </select>
          </div>
          <div>
            <label for="new-price" class="block text-sm font-medium">Price (optional)</label>
            <input
              id="new-price"
              name="price"
              type="number"
              min="0"
              bind:value={newPrice}
              placeholder="e.g. 500"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Service"}
          </button>
        </div>
      </form>
    {/if}

    <!-- Services List -->
    {#if services.length === 0}
      <div class="mt-8 rounded-lg border border-dashed p-8 text-center">
        <p class="text-sm text-muted-foreground">No services yet. Add one to start accepting bookings.</p>
      </div>
    {:else}
      <div class="mt-6 space-y-3">
        {#each services as service (service.id)}
          <div class="rounded-lg border p-4 {service.isActive ? '' : 'opacity-60'}">
            {#if editingId === service.id}
              <form
                method="POST"
                action="?/update-service"
                use:enhance={() => {
                  saving = true;
                  return async ({ result, update }) => {
                    saving = false;
                    await update();
                    if (result.type === "success") editingId = null;
                  };
                }}
                class="space-y-3"
              >
                <input type="hidden" name="serviceId" value={service.id} />
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label for="edit-name-{service.id}" class="block text-xs font-medium">Name</label>
                    <input
                      id="edit-name-{service.id}"
                      name="name"
                      type="text"
                      value={service.name}
                      required
                      class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label for="edit-duration-{service.id}" class="block text-xs font-medium">Duration (min)</label>
                    <input
                      id="edit-duration-{service.id}"
                      name="durationMin"
                      type="number"
                      min="5"
                      max="480"
                      value={service.durationMin}
                      class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label for="edit-capacity-{service.id}" class="block text-xs font-medium">Capacity</label>
                    <input
                      id="edit-capacity-{service.id}"
                      name="capacity"
                      type="number"
                      min="1"
                      max="999"
                      value={service.capacity}
                      class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label for="edit-mode-{service.id}" class="block text-xs font-medium">Booking Mode</label>
                    <select
                      id="edit-mode-{service.id}"
                      name="bookingMode"
                      value={service.bookingMode}
                      class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="instant">Instant</option>
                      <option value="queue">Queue</option>
                    </select>
                  </div>
                  <div>
                    <label for="edit-price-{service.id}" class="block text-xs font-medium">Price</label>
                    <input
                      id="edit-price-{service.id}"
                      name="price"
                      type="number"
                      min="0"
                      value={service.price ?? ""}
                      placeholder="Optional"
                      class="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    type="button"
                    onclick={() => { editingId = null; }}
                    class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            {:else}
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium">{service.name}</h3>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium
                      {service.bookingMode === 'queue'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'}">
                      {service.bookingMode === "queue" ? "Queue" : "Instant"}
                    </span>
                    {#if !service.isActive}
                      <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Inactive
                      </span>
                    {/if}
                  </div>
                  <div class="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>{service.durationMin} min</span>
                    <span>Capacity: {service.capacity}</span>
                    {#if service.price != null}
                      <span>Rs. {service.price}</span>
                    {/if}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <form
                    method="POST"
                    action="?/toggle-service"
                    use:enhance={() => {
                      return async ({ update }) => { await update(); };
                    }}
                  >
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input type="hidden" name="isActive" value={String(!service.isActive)} />
                    <button
                      type="submit"
                      class="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      {service.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <button
                    onclick={() => { editingId = service.id; }}
                    class="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Edit
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Slot Blocks Section -->
    <div class="mt-10 border-t pt-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">Availability Blocks</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Block off time when you're unavailable for bookings
          </p>
        </div>
        <button
          onclick={() => { showBlockForm = !showBlockForm; }}
          class="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
        >
          {showBlockForm ? "Cancel" : "Add Block"}
        </button>
      </div>

      {#if showBlockForm}
        <form
          method="POST"
          action="?/add-block"
          use:enhance={() => {
            saving = true;
            return async ({ result, update }) => {
              saving = false;
              await update();
              if (result.type === "success") resetBlockForm();
            };
          }}
          class="mt-4 rounded-lg border p-4 space-y-4"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="block-service" class="block text-sm font-medium">Service (optional)</label>
              <select
                id="block-service"
                name="serviceId"
                bind:value={blockServiceId}
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All services</option>
                {#each services as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="block-reason" class="block text-sm font-medium">Reason (optional)</label>
              <input
                id="block-reason"
                name="reason"
                type="text"
                bind:value={blockReason}
                placeholder="e.g. Holiday, Lunch break"
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label for="block-start" class="block text-sm font-medium">Start</label>
              <input
                id="block-start"
                name="startAt"
                type="datetime-local"
                bind:value={blockStart}
                required
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label for="block-end" class="block text-sm font-medium">End</label>
              <input
                id="block-end"
                name="endAt"
                type="datetime-local"
                bind:value={blockEnd}
                required
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Block"}
            </button>
          </div>
        </form>
      {/if}

      {#if blocks.length === 0}
        <div class="mt-4 rounded-lg border border-dashed p-6 text-center">
          <p class="text-sm text-muted-foreground">No active blocks. Your full schedule is open for bookings.</p>
        </div>
      {:else}
        <div class="mt-4 space-y-2">
          {#each blocks as block (block.id)}
            <div class="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-medium">
                    {formatDateTime(block.startAt)} — {formatDateTime(block.endAt)}
                  </span>
                  {#if block.serviceId}
                    {@const svc = services.find((s: { id: string }) => s.id === block.serviceId)}
                    <span class="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {svc?.name ?? "Unknown service"}
                    </span>
                  {:else}
                    <span class="rounded-full bg-muted px-2 py-0.5 text-xs">All services</span>
                  {/if}
                </div>
                {#if block.reason}
                  <p class="mt-0.5 text-xs text-muted-foreground">{block.reason}</p>
                {/if}
              </div>
              <form
                method="POST"
                action="?/remove-block"
                use:enhance={() => {
                  return async ({ update }) => { await update(); };
                }}
              >
                <input type="hidden" name="blockId" value={block.id} />
                <button
                  type="submit"
                  class="rounded-md border border-input px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  Remove
                </button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </main>
</div>
