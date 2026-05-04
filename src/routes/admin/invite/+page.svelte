<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  let submitting = $state(false);

  const form = $derived($page.form);

  const verticals = [
    "restaurant",
    "salon",
    "clinic",
    "gym",
    "retail",
    "education",
    "real_estate",
    "services",
    "other",
  ];
</script>

<div class="mx-auto max-w-xl px-4 py-8">
  <h2 class="mb-2 text-2xl font-bold">Invite Tenant</h2>
  <p class="mb-6 text-sm text-muted-foreground">
    Pre-configure a new tenant account. They'll receive an email to sign in and complete onboarding.
  </p>

  {#if form?.success}
    <div class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <p class="font-medium text-green-800 dark:text-green-300">Tenant invited successfully.</p>
      {#if form?.warning}
        <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-400">{form.warning}</p>
      {/if}
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <p class="text-sm text-red-800 dark:text-red-300">{form.error}</p>
    </div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        submitting = false;
        await update();
      };
    }}
    class="space-y-4"
  >
    <div>
      <label for="email" class="mb-1 block text-sm font-medium">Email Address</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="tenant@example.com"
      />
    </div>

    <div>
      <label for="businessName" class="mb-1 block text-sm font-medium">Business Name</label>
      <input
        id="businessName"
        name="businessName"
        type="text"
        required
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Priya's Salon"
      />
    </div>

    <div>
      <label for="vertical" class="mb-1 block text-sm font-medium">Vertical</label>
      <select
        id="vertical"
        name="vertical"
        required
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="" disabled selected>Select vertical...</option>
        {#each verticals as v}
          <option value={v}>{v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="phoneNumberId" class="mb-1 block text-sm font-medium">
        WhatsApp Phone Number ID
        <span class="text-muted-foreground">(optional)</span>
      </label>
      <input
        id="phoneNumberId"
        name="phoneNumberId"
        type="text"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="1119593011236469"
      />
      <p class="mt-1 text-xs text-muted-foreground">
        The numeric Phone Number ID from Meta Business. Leave blank if not yet configured.
      </p>
    </div>

    <button
      type="submit"
      disabled={submitting}
      class="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {submitting ? "Sending Invite..." : "Create Tenant & Send Invite"}
    </button>
  </form>
</div>
