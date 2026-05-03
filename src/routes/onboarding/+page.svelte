<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  let step = $state(1);
  let saving = $state(false);

  const business = $derived($page.data.business);

  let name = $state($page.data.business?.name ?? "");
  let vertical = $state($page.data.business?.vertical ?? "salon");
  let language = $state($page.data.business?.language ?? "en");
  let timezone = $state($page.data.business?.timezone ?? "Asia/Kolkata");

  let phoneNumberId = $state($page.data.business?.whatsappPhoneNumberId ?? "");
  let apiToken = $state("");

  let greetingStyle = $state("");
  let formalityLevel = $state("friendly");
  let customInstructions = $state("");

  let uploadedFiles: string[] = $state([]);

  function nextStep() {
    step = Math.min(step + 1, 5);
  }

  function prevStep() {
    step = Math.max(step - 1, 1);
  }

  const STEPS = [
    { num: 1, label: "Business Info" },
    { num: 2, label: "WhatsApp" },
    { num: 3, label: "Knowledge Base" },
    { num: 4, label: "Tone & Style" },
    { num: 5, label: "Confirm" },
  ];

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

  const TIMEZONES = [
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
  ];

  let fileInput = $state<HTMLInputElement>(null!);
  let uploading = $state(false);

  async function handleFileUpload() {
    if (!fileInput?.files?.length) return;
    uploading = true;

    const formData = new FormData();
    for (const file of fileInput.files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.uploaded) {
        uploadedFiles = [...uploadedFiles, ...data.uploaded];
      }
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = "";
    }
  }
</script>

<main class="min-h-screen bg-background">
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-bold">Set up your WhatsAppFlow</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Get your AI assistant live in 5 steps
    </p>

    <!-- Step indicator -->
    <div class="mt-6 flex gap-1">
      {#each STEPS as s}
        <button
          onclick={() => { if (s.num <= step) step = s.num; }}
          class="flex-1 rounded-full py-1 text-center text-xs font-medium transition-colors
            {s.num === step
              ? 'bg-primary text-primary-foreground'
              : s.num < step
                ? 'bg-primary/20 text-foreground'
                : 'bg-muted text-muted-foreground'}"
        >
          {s.label}
        </button>
      {/each}
    </div>

    <div class="mt-8">
      <!-- Step 1: Business Info -->
      {#if step === 1}
        <form
          method="POST"
          action="?/save-business-info"
          use:enhance={() => {
            saving = true;
            return async ({ update }) => {
              await update();
              saving = false;
              nextStep();
            };
          }}
        >
          <div class="space-y-4">
            <h2 class="text-lg font-semibold">Business Information</h2>

            <div>
              <label for="name" class="block text-sm font-medium">Business Name</label>
              <input
                id="name"
                name="name"
                type="text"
                bind:value={name}
                required
                placeholder="e.g. Priya's Beauty Salon"
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label for="vertical" class="block text-sm font-medium">Business Type</label>
              <select
                id="vertical"
                name="vertical"
                bind:value={vertical}
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="salon">Salon</option>
                <option value="clinic">Clinic</option>
                <option value="coaching">Coaching Centre</option>
                <option value="retail">Retail / Kirana</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label for="language" class="block text-sm font-medium">Primary Reply Language</label>
              <select
                id="language"
                name="language"
                bind:value={language}
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {#each LANGUAGES as lang}
                  <option value={lang.value}>{lang.label}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="timezone" class="block text-sm font-medium">Timezone</label>
              <select
                id="timezone"
                name="timezone"
                bind:value={timezone}
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {#each TIMEZONES as tz}
                  <option value={tz.value}>{tz.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              class="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Next"}
            </button>
          </div>
        </form>
      {/if}

      <!-- Step 2: WhatsApp Connection -->
      {#if step === 2}
        <form
          method="POST"
          action="?/save-whatsapp"
          use:enhance={() => {
            saving = true;
            return async ({ update }) => {
              await update();
              saving = false;
              nextStep();
            };
          }}
        >
          <div class="space-y-4">
            <h2 class="text-lg font-semibold">Connect WhatsApp</h2>
            <p class="text-sm text-muted-foreground">
              Enter your WhatsApp Business API credentials from your BSP
              (AiSensy, Gupshup, or Meta directly).
            </p>

            <div>
              <label for="phoneNumberId" class="block text-sm font-medium">
                Phone Number ID
              </label>
              <input
                id="phoneNumberId"
                name="phoneNumberId"
                type="text"
                bind:value={phoneNumberId}
                required
                placeholder="e.g. 1234567890"
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p class="mt-1 text-xs text-muted-foreground">
                Found in your Meta Business Suite or BSP dashboard
              </p>
            </div>

            <div>
              <label for="apiToken" class="block text-sm font-medium">
                API Token
              </label>
              <input
                id="apiToken"
                name="apiToken"
                type="password"
                bind:value={apiToken}
                placeholder="Stored securely — paste from BSP"
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p class="mt-1 text-xs text-muted-foreground">
                Optional for now. Can be set later in Settings.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-between">
            <button
              type="button"
              onclick={prevStep}
              class="rounded-md border border-input px-6 py-2.5 text-sm hover:bg-accent"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              class="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Next"}
            </button>
          </div>
        </form>
      {/if}

      <!-- Step 3: Knowledge Base Upload -->
      {#if step === 3}
        <div class="space-y-4">
          <h2 class="text-lg font-semibold">Upload Your Knowledge Base</h2>
          <p class="text-sm text-muted-foreground">
            Upload your price list, service menu, or FAQ document. The AI will
            use this to answer customer questions.
          </p>

          <div class="rounded-lg border-2 border-dashed border-input p-6 text-center">
            <input
              bind:this={fileInput}
              type="file"
              accept=".pdf,.txt,.csv"
              multiple
              onchange={handleFileUpload}
              class="hidden"
              id="file-upload"
            />
            <label
              for="file-upload"
              class="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
            >
              {#if uploading}
                Uploading...
              {:else}
                Click to upload PDF, TXT, or CSV files
              {/if}
            </label>
          </div>

          {#if uploadedFiles.length > 0}
            <div class="space-y-2">
              <p class="text-sm font-medium">Uploaded files:</p>
              {#each uploadedFiles as file}
                <div class="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                  <span class="flex-1">{file}</span>
                </div>
              {/each}
            </div>
          {/if}

          <p class="text-xs text-muted-foreground">
            You can also add or update documents later from the dashboard.
          </p>
        </div>

        <div class="mt-6 flex justify-between">
          <button
            type="button"
            onclick={prevStep}
            class="rounded-md border border-input px-6 py-2.5 text-sm hover:bg-accent"
          >
            Back
          </button>
          <button
            type="button"
            onclick={nextStep}
            class="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {uploadedFiles.length > 0 ? "Next" : "Skip for now"}
          </button>
        </div>
      {/if}

      <!-- Step 4: Tone Preferences -->
      {#if step === 4}
        <form
          method="POST"
          action="?/save-tone"
          use:enhance={() => {
            saving = true;
            return async ({ update }) => {
              await update();
              saving = false;
              nextStep();
            };
          }}
        >
          <div class="space-y-4">
            <h2 class="text-lg font-semibold">Tone & Style</h2>
            <p class="text-sm text-muted-foreground">
              Tell the AI how to talk to your customers.
            </p>

            <div>
              <label for="greetingStyle" class="block text-sm font-medium">
                Greeting Style
              </label>
              <input
                id="greetingStyle"
                name="greetingStyle"
                type="text"
                bind:value={greetingStyle}
                placeholder="e.g. Namaste! Welcome to Priya Salon"
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label for="formalityLevel" class="block text-sm font-medium">
                Formality
              </label>
              <select
                id="formalityLevel"
                name="formalityLevel"
                bind:value={formalityLevel}
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="casual">Casual (like a friend)</option>
                <option value="friendly">Friendly (warm but professional)</option>
                <option value="formal">Formal (respectful, sir/madam)</option>
              </select>
            </div>

            <div>
              <label for="customInstructions" class="block text-sm font-medium">
                Custom Instructions
              </label>
              <textarea
                id="customInstructions"
                name="customInstructions"
                bind:value={customInstructions}
                rows="3"
                placeholder="e.g. Always mention our 10% discount for first-time customers. Don't discuss competitor prices."
                class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              ></textarea>
            </div>
          </div>

          <div class="mt-6 flex justify-between">
            <button
              type="button"
              onclick={prevStep}
              class="rounded-md border border-input px-6 py-2.5 text-sm hover:bg-accent"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              class="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Next"}
            </button>
          </div>
        </form>
      {/if}

      <!-- Step 5: Confirm -->
      {#if step === 5}
        <div class="space-y-4">
          <h2 class="text-lg font-semibold">Review & Go Live</h2>

          <div class="space-y-3 rounded-lg border p-4">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Business</span>
              <span class="font-medium">{name || "—"}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Type</span>
              <span class="font-medium capitalize">{vertical}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Language</span>
              <span class="font-medium">
                {LANGUAGES.find((l) => l.value === language)?.label ?? language}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">WhatsApp</span>
              <span class="font-medium">
                {phoneNumberId ? "Connected" : "Not connected yet"}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Knowledge Base</span>
              <span class="font-medium">
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} file(s)`
                  : "None yet"}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Tone</span>
              <span class="font-medium capitalize">{formalityLevel}</span>
            </div>
          </div>

          <p class="text-sm text-muted-foreground">
            You can always change these settings from your dashboard later.
          </p>
        </div>

        <div class="mt-6 flex justify-between">
          <button
            type="button"
            onclick={prevStep}
            class="rounded-md border border-input px-6 py-2.5 text-sm hover:bg-accent"
          >
            Back
          </button>
          <form method="POST" action="?/activate" use:enhance={() => {
            saving = true;
            return async ({ update }) => {
              await update();
              saving = false;
            };
          }}>
            <button
              type="submit"
              disabled={saving}
              class="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Activating..." : "Go Live"}
            </button>
          </form>
        </div>
      {/if}
    </div>
  </div>
</main>
