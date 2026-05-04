<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  let submitting = $state(false);
  const form = $derived($page.form);
</script>

<main class="flex min-h-screen items-center justify-center px-4">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold">Admin Console</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Sign in with your administrator credentials
      </p>
    </div>

    {#if form?.error}
      <div class="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "failure") {
            submitting = false;
          }
          await update();
        };
      }}
      class="space-y-4"
    >
      <div class="space-y-2">
        <label for="email" class="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="admin@example.com"
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter password"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>

    <p class="text-center text-xs text-muted-foreground">
      <a href="/" class="underline hover:text-foreground">Back to home</a>
    </p>
  </div>
</main>
