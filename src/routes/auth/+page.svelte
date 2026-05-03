<script lang="ts">
  import { signIn } from "@auth/sveltekit/client";

  let email = $state("");
  let submitted = $state(false);

  async function handleEmailSignIn(e: SubmitEvent) {
    e.preventDefault();
    if (!email) return;
    await signIn("nodemailer", { email, callbackUrl: "/dashboard" });
    submitted = true;
  }
</script>

<main class="flex min-h-screen items-center justify-center px-4">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold">Sign in to WhatsAppFlow</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Choose your preferred sign-in method
      </p>
    </div>

    <button
      onclick={() => signIn("google", { callbackUrl: "/dashboard" })}
      class="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
    >
      Continue with Google
    </button>

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <span class="w-full border-t"></span>
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-background px-2 text-muted-foreground">or</span>
      </div>
    </div>

    {#if submitted}
      <div class="rounded-md bg-secondary p-4 text-center text-sm">
        Check your email for a magic link to sign in.
      </div>
    {:else}
      <form onsubmit={handleEmailSignIn} class="space-y-3">
        <input
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          required
          class="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          class="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Send Magic Link
        </button>
      </form>
    {/if}

    <p class="text-center text-xs text-muted-foreground">
      <a href="/" class="underline hover:text-foreground">Back to home</a>
    </p>
  </div>
</main>
