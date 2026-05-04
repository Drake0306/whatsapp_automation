<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const skills = $derived($page.data.skills ?? []);
  const availableModels = $derived($page.data.availableModels ?? []);
  const formError = $derived($page.form?.error as string | undefined);
  const formSuccess = $derived($page.form?.success as boolean | undefined);
  const formWarning = $derived($page.form?.warning as string | undefined);

  let saving = $state(false);

  const providerColors: Record<string, string> = {
    gemini: "bg-blue-100 text-blue-800",
    groq: "bg-orange-100 text-orange-800",
    anthropic: "bg-violet-100 text-violet-800",
    sarvam: "bg-emerald-100 text-emerald-800",
  };

  function modelLabel(modelId: string) {
    const m = availableModels.find((m: { id: string }) => m.id === modelId);
    if (!m) return modelId;
    return `${m.apiModelId} (${m.provider})`;
  }

  function costLabel(modelId: string) {
    const m = availableModels.find((m: { id: string }) => m.id === modelId);
    if (!m) return "";
    if (m.costPer1kInput === 0 && m.costPer1kOutput === 0) return "Free";
    return `$${m.costPer1kInput}/1k in, $${m.costPer1kOutput}/1k out`;
  }
</script>

<main class="mx-auto max-w-4xl px-4 py-8">
  <div>
    <h2 class="text-2xl font-bold">Model Routing</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Configure which LLM model handles each skill. Changes apply immediately to all tenants.
    </p>
  </div>

  {#if formError}
    <div class="mt-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      {formError}
    </div>
  {/if}

  {#if formSuccess && !formWarning}
    <div class="mt-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
      Routing updated successfully.
    </div>
  {/if}

  {#if formWarning}
    <div class="mt-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
      {formWarning}
    </div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => {
        saving = false;
        await update();
      };
    }}
    class="mt-6"
  >
    <!-- Available Models Overview -->
    <div class="mb-8">
      <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Available Models</h3>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each availableModels as model (model.id)}
          <div class="rounded-lg border px-3 py-2.5">
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium {providerColors[model.provider] ?? 'bg-muted'}">
                {model.provider}
              </span>
              <span class="text-sm font-medium">{model.apiModelId}</span>
            </div>
            {#if model.description}
              <p class="mt-1 text-xs text-muted-foreground">{model.description}</p>
            {/if}
            <div class="mt-1 flex gap-3 text-xs text-muted-foreground">
              <span>{model.contextWindow >= 1_000_000 ? `${(model.contextWindow / 1_000_000).toFixed(0)}M ctx` : `${(model.contextWindow / 1000).toFixed(0)}K ctx`}</span>
              <span>{model.costPer1kInput === 0 && model.costPer1kOutput === 0 ? "Free" : `$${model.costPer1kInput}/$${model.costPer1kOutput} per 1K`}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Skill Routing -->
    <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skill Routing</h3>
    <div class="mt-3 space-y-4">
      {#each skills as skill (skill.id)}
        <div class="rounded-lg border p-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-medium">{skill.label}</h4>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Default: {modelLabel(skill.defaultModel)}
                {#if skill.isOverridden}
                  <span class="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">overridden</span>
                {/if}
              </p>
            </div>
            <div class="text-right text-xs text-muted-foreground">
              {costLabel(skill.currentModel)}
            </div>
          </div>
          <select
            name={skill.id}
            value={skill.currentModel}
            class="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {#each availableModels as model (model.id)}
              <option value={model.id}>
                {model.apiModelId} ({model.provider})
                {model.costPer1kInput === 0 ? " — Free" : ""}
              </option>
            {/each}
          </select>
        </div>
      {/each}
    </div>

    <div class="mt-6 flex items-center justify-between">
      <p class="text-xs text-muted-foreground">
        Selecting the default model for a skill removes the override.
      </p>
      <button
        type="submit"
        disabled={saving}
        class="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  </form>
</main>
