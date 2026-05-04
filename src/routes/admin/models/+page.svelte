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

  const providerLabels: Record<string, string> = {
    gemini: "Google Gemini",
    groq: "Groq",
    anthropic: "Anthropic",
    sarvam: "Sarvam AI",
  };

  const PROVIDER_ORDER = ["gemini", "groq", "anthropic", "sarvam"];

  const modelsByProvider = $derived.by(() => {
    const grouped: Record<string, typeof availableModels> = {};
    for (const m of availableModels) {
      if (!grouped[m.provider]) grouped[m.provider] = [];
      grouped[m.provider].push(m);
    }
    return grouped;
  });

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

  function formatCtx(ctx: number) {
    return ctx >= 1_000_000 ? `${(ctx / 1_000_000).toFixed(0)}M` : `${(ctx / 1000).toFixed(0)}K`;
  }
</script>

<main class="mx-auto max-w-7xl px-4 py-8">
  <div>
    <h2 class="text-2xl font-bold">Model Routing</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Configure which LLM handles each skill. Changes apply immediately to all tenants.
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

  <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
    <!-- Left: Skill Routing -->
    <form
      method="POST"
      use:enhance={() => {
        saving = true;
        return async ({ update }) => {
          saving = false;
          await update();
        };
      }}
    >
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
              {#each PROVIDER_ORDER as provider}
                {#if modelsByProvider[provider]?.length}
                  <optgroup label={providerLabels[provider] ?? provider}>
                    {#each modelsByProvider[provider] as model (model.id)}
                      <option value={model.id}>
                        {model.apiModelId}{model.costPer1kInput === 0 ? " — Free" : ""} ({formatCtx(model.contextWindow)} ctx)
                      </option>
                    {/each}
                  </optgroup>
                {/if}
              {/each}
            </select>
          </div>
        {/each}
      </div>

      <div class="mt-6 flex items-center justify-between">
        <p class="text-xs text-muted-foreground">
          Selecting the default model removes the override.
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

    <!-- Right: Model Catalog -->
    <aside class="space-y-5">
      <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Available Models</h3>

      {#each PROVIDER_ORDER as provider}
        {#if modelsByProvider[provider]?.length}
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium {providerColors[provider] ?? 'bg-muted'}">
                {providerLabels[provider] ?? provider}
              </span>
              <span class="text-xs text-muted-foreground">
                {modelsByProvider[provider].length} model{modelsByProvider[provider].length > 1 ? "s" : ""}
              </span>
            </div>
            <div class="space-y-1.5">
              {#each modelsByProvider[provider] as model (model.id)}
                <div class="rounded-md border px-3 py-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">{model.apiModelId}</span>
                    <span class="text-xs text-muted-foreground">
                      {model.costPer1kInput === 0 && model.costPer1kOutput === 0
                        ? "Free"
                        : `$${model.costPer1kInput}/$${model.costPer1kOutput}`}
                    </span>
                  </div>
                  {#if model.description}
                    <p class="mt-0.5 text-xs text-muted-foreground leading-tight">{model.description}</p>
                  {/if}
                  <p class="mt-0.5 text-xs text-muted-foreground">{formatCtx(model.contextWindow)} context</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </aside>
  </div>
</main>
