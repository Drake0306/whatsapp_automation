<script lang="ts">
  import { page } from "$app/stores";
  import { signIn } from "@auth/sveltekit/client";

  const session = $derived($page.data.session);
</script>

<main class="flex min-h-screen flex-col items-center justify-center px-4">
  <div class="mx-auto max-w-2xl text-center">
    <h1 class="text-4xl font-bold tracking-tight sm:text-6xl">
      WhatsAppFlow
    </h1>
    <p class="mt-4 text-lg text-muted-foreground">
      AI-powered WhatsApp agent for Indian small businesses. Answer FAQs,
      book appointments, send reminders — 24/7, in any language.
    </p>

    <div class="mt-8">
      {#if session?.user}
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </p>
          <a
            href="/dashboard"
            class="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Dashboard
          </a>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onclick={() => signIn("google")}
            class="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in with Google
          </button>
          <a
            href="/auth"
            class="inline-flex items-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent"
          >
            Sign in with Email
          </a>
        </div>
      {/if}
    </div>
  </div>
</main>
