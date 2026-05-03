<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const business = $derived($page.data.business);
  const tone = $derived($page.data.tone);
  const skills = $derived($page.data.skills ?? []);
  const hours = $derived($page.data.hours ?? []);

  let saved = $state<string | null>(null);

  const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "hi", label: "Hindi" },
    { value: "hinglish", label: "Hinglish" },
    { value: "ta", label: "Tamil" },
    { value: "bn", label: "Bengali" },
    { value: "mr", label: "Marathi" },
    { value: "te", label: "Telugu" },
    { value: "kn", label: "Kannada" },
  ];

  const SKILL_LABELS: Record<string, string> = {
    faq: "FAQ / Knowledge Base",
    booking: "Appointment Booking",
    reschedule: "Reschedule",
    cancel: "Cancel Appointments",
    reminder: "Appointment Reminders",
    rebook_nudge: "Rebook Nudges (30-day)",
    cold_lead_nudge: "Cold Lead Follow-ups",
    fallback: "Fallback Chat",
    escalate: "Escalation to Owner",
  };
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Settings</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-2xl space-y-8 px-4 py-8">
    <!-- Business Info -->
    <section>
      <h2 class="text-lg font-semibold">Business Information</h2>
      <form
        method="POST"
        action="?/update-business"
        class="mt-4 space-y-4"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            saved = "business";
            setTimeout(() => (saved = null), 2000);
          };
        }}
      >
        <div>
          <label for="name" class="block text-sm font-medium">Business Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={business?.name ?? ""}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label for="language" class="block text-sm font-medium">Primary Language</label>
          <select
            id="language"
            name="language"
            value={business?.language ?? "en"}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {#each LANGUAGES as lang}
              <option value={lang.value}>{lang.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="whatsappPhoneNumberId" class="block text-sm font-medium">WhatsApp Phone Number ID</label>
          <input
            id="whatsappPhoneNumberId"
            name="whatsappPhoneNumberId"
            type="text"
            value={business?.whatsappPhoneNumberId ?? ""}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Save
          </button>
          {#if saved === "business"}
            <span class="text-sm text-green-600">Saved!</span>
          {/if}
        </div>
      </form>
    </section>

    <hr />

    <!-- Tone -->
    <section>
      <h2 class="text-lg font-semibold">Tone & Style</h2>
      <form
        method="POST"
        action="?/update-tone"
        class="mt-4 space-y-4"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            saved = "tone";
            setTimeout(() => (saved = null), 2000);
          };
        }}
      >
        <div>
          <label for="greetingStyle" class="block text-sm font-medium">Greeting Style</label>
          <input
            id="greetingStyle"
            name="greetingStyle"
            type="text"
            value={tone?.greetingStyle ?? ""}
            placeholder="e.g. Namaste! Welcome to our salon"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label for="formalityLevel" class="block text-sm font-medium">Formality</label>
          <select
            id="formalityLevel"
            name="formalityLevel"
            value={tone?.formalityLevel ?? "friendly"}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
          </select>
        </div>

        <div>
          <label for="customInstructions" class="block text-sm font-medium">Custom Instructions</label>
          <textarea
            id="customInstructions"
            name="customInstructions"
            rows="3"
            value={tone?.customInstructions ?? ""}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          ></textarea>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Save
          </button>
          {#if saved === "tone"}
            <span class="text-sm text-green-600">Saved!</span>
          {/if}
        </div>
      </form>
    </section>

    <hr />

    <!-- Business Hours -->
    <section>
      <h2 class="text-lg font-semibold">Business Hours</h2>
      <p class="mt-1 text-sm text-muted-foreground">Configure when your business is open for appointments.</p>
      <form
        method="POST"
        action="?/update-hours"
        class="mt-4 space-y-3"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            saved = "hours";
            setTimeout(() => (saved = null), 2000);
          };
        }}
      >
        {#each ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as dayName, i}
          {@const h = hours.find((hr: Record<string, unknown>) => hr.dayOfWeek === i)}
          <div class="flex items-center gap-3 rounded-lg border px-4 py-2">
            <span class="w-24 text-sm font-medium">{dayName}</span>
            <label class="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="closed_{i}"
                value="true"
                checked={h?.isClosed ?? false}
                class="rounded"
              />
              Closed
            </label>
            <input
              name="open_{i}"
              type="time"
              value={h?.openTime ?? "09:00"}
              class="rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <span class="text-sm text-muted-foreground">to</span>
            <input
              name="close_{i}"
              type="time"
              value={h?.closeTime ?? "20:00"}
              class="rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
          </div>
        {/each}
        <div class="flex items-center gap-3">
          <button type="submit" class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Save Hours
          </button>
          {#if saved === "hours"}
            <span class="text-sm text-green-600">Saved!</span>
          {/if}
        </div>
      </form>
    </section>

    <hr />

    <!-- Skills -->
    <section>
      <h2 class="text-lg font-semibold">Skills</h2>
      <p class="mt-1 text-sm text-muted-foreground">Enable or disable individual bot capabilities.</p>

      <div class="mt-4 space-y-2">
        {#each skills as skill}
          <div class="flex items-center justify-between rounded-lg border px-4 py-3">
            <span class="text-sm">{SKILL_LABELS[skill.skillId] ?? skill.skillId}</span>
            <form method="POST" action="?/toggle-skill" use:enhance>
              <input type="hidden" name="skillId" value={skill.skillId} />
              <input type="hidden" name="enabled" value={String(!skill.enabled)} />
              <button
                type="submit"
                class="rounded-full px-3 py-1 text-xs font-medium
                  {skill.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-muted text-muted-foreground'}"
              >
                {skill.enabled ? "Enabled" : "Disabled"}
              </button>
            </form>
          </div>
        {/each}
      </div>
    </section>
  </main>
</div>
