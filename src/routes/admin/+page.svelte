<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Select from "$lib/components/ui/select/index.js";

  const data = $derived($page.data);
  const stats = $derived(data.stats);
  const tenants = $derived(data.tenants);
  const messagesPerDay = $derived(data.messagesPerDay);
  const messagesPerTenant = $derived(data.messagesPerTenant);
  const currentRange = $derived(data.range);

  const RANGE_OPTIONS = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ];

  const COLORS = [
    "bg-primary",
    "bg-blue-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];

  const maxMessages = $derived(
    Math.max(...messagesPerDay.map((d: { count: number }) => d.count), 1)
  );

  type TenantDay = { date: string; businessId: string; businessName: string; count: number };

  const tenantIds = $derived<string[]>([...new Set((messagesPerTenant as TenantDay[]).map((d) => d.businessId))]);
  const tenantColorMap = $derived<Record<string, string>>(
    Object.fromEntries(tenantIds.map((id, i) => [id, COLORS[i % COLORS.length]]))
  );
  const tenantNameMap = $derived<Record<string, string>>(
    Object.fromEntries((messagesPerTenant as TenantDay[]).map((d) => [d.businessId, d.businessName]))
  );

  const stackedDays = $derived.by(() => {
    const byDate = new Map<string, Map<string, number>>();
    for (const d of messagesPerTenant as TenantDay[]) {
      if (!byDate.has(d.date)) byDate.set(d.date, new Map());
      byDate.get(d.date)!.set(d.businessId, d.count);
    }
    return messagesPerDay.map((day: { date: string; count: number }) => {
      const tenantMap = byDate.get(day.date) || new Map();
      const segments = tenantIds.map((id: string) => ({
        businessId: id,
        count: tenantMap.get(id) || 0,
      }));
      return { date: day.date, total: day.count, segments };
    });
  });

  let chartMode = $state<"total" | "per-tenant">("total");
  let hoveredBar = $state<{ date: string; x: number; y: number; segments?: { name: string; count: number; color: string }[] } | null>(null);

  function onRangeChange(value: string | undefined) {
    if (value) goto(`/admin?range=${value}`, { keepFocus: true });
  }

  function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
    if (status === "active") return "default";
    if (status === "onboarding") return "secondary";
    if (status === "suspended") return "destructive";
    return "outline";
  }
</script>

<div class="mx-auto max-w-7xl px-4 py-8">
  <h2 class="mb-6 text-2xl font-bold">Platform Overview</h2>

  <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
    <div class="rounded-lg border bg-card p-4">
      <p class="text-sm text-muted-foreground">Total Tenants</p>
      <p class="mt-1 text-3xl font-bold">{stats.totalTenants}</p>
    </div>
    <div class="rounded-lg border bg-card p-4">
      <p class="text-sm text-muted-foreground">Active Tenants</p>
      <p class="mt-1 text-3xl font-bold">{stats.activeTenants}</p>
    </div>
    <div class="rounded-lg border bg-card p-4">
      <p class="text-sm text-muted-foreground">Total Messages</p>
      <p class="mt-1 text-3xl font-bold">{stats.totalMessages.toLocaleString()}</p>
    </div>
    <div class="rounded-lg border bg-card p-4">
      <p class="text-sm text-muted-foreground">Conversations</p>
      <p class="mt-1 text-3xl font-bold">{stats.totalConversations.toLocaleString()}</p>
    </div>
    <div class="col-span-2 rounded-lg border bg-card p-4 lg:col-span-1">
      <p class="text-sm text-muted-foreground">Escalations (7d)</p>
      <p class="mt-1 text-3xl font-bold">{stats.escalationsThisWeek}</p>
    </div>
  </div>

  <div class="mb-8 rounded-lg border bg-card">
    <div class="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 class="text-base font-semibold">Message Volume</h3>
      <div class="flex items-center gap-3">
        <div class="flex rounded-md border">
          <button
            class="px-3 py-1.5 text-xs font-medium transition-colors {chartMode === 'total' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (chartMode = "total")}
          >
            Total
          </button>
          <button
            class="border-l px-3 py-1.5 text-xs font-medium transition-colors {chartMode === 'per-tenant' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (chartMode = "per-tenant")}
          >
            Per Tenant
          </button>
        </div>
        <Select.Root type="single" value={currentRange} onValueChange={onRangeChange}>
          <Select.Trigger class="w-[140px]">
            {RANGE_OPTIONS.find((o) => o.value === currentRange)?.label ?? "Select range"}
          </Select.Trigger>
          <Select.Content>
            {#each RANGE_OPTIONS as opt}
              <Select.Item value={opt.value}>{opt.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <div class="p-4">
      {#if messagesPerDay.length === 0}
        <p class="py-8 text-center text-sm text-muted-foreground">No message data for this period.</p>
      {:else}
        <div
          class="relative flex h-48 items-end gap-[2px]"
          role="img"
          aria-label="Message volume chart"
          onmouseleave={() => (hoveredBar = null)}
        >
          {#each chartMode === "total" ? messagesPerDay : stackedDays as day, i}
            <div
              class="group relative flex flex-1 flex-col justify-end"
              style="height: 100%"
              role="presentation"
              onmouseenter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (chartMode === "per-tenant" && "segments" in day) {
                  hoveredBar = {
                    date: day.date,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    segments: day.segments
                      .filter((s: { count: number }) => s.count > 0)
                      .map((s: { businessId: string; count: number }) => ({
                        name: tenantNameMap[s.businessId] || "Unknown",
                        count: s.count,
                        color: tenantColorMap[s.businessId] || "bg-primary",
                      })),
                  };
                } else {
                  hoveredBar = { date: day.date, x: rect.left + rect.width / 2, y: rect.top };
                }
              }}
            >
              {#if chartMode === "total"}
                {@const total = "count" in day ? day.count : 0}
                <div
                  class="w-full min-w-[3px] rounded-t bg-primary transition-all hover:bg-primary/80"
                  style="height: {(total / maxMessages) * 100}%"
                ></div>
              {:else if "segments" in day}
                {#each day.segments as seg}
                  {#if seg.count > 0}
                    <div
                      class="w-full min-w-[3px] first:rounded-t {tenantColorMap[seg.businessId]} opacity-90 hover:opacity-100 transition-opacity"
                      style="height: {(seg.count / maxMessages) * 100}%"
                    ></div>
                  {/if}
                {/each}
              {/if}
            </div>
          {/each}
        </div>

        {#if hoveredBar}
          <div
            class="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style="left: {hoveredBar.x}px; top: {hoveredBar.y - 8}px; transform: translate(-50%, -100%);"
          >
            <p class="font-medium">{hoveredBar.date}</p>
            {#if hoveredBar.segments}
              {#each hoveredBar.segments as seg}
                <div class="mt-1 flex items-center gap-2">
                  <span class="inline-block h-2 w-2 rounded-full {seg.color}"></span>
                  <span>{seg.name}: {seg.count}</span>
                </div>
              {/each}
            {/if}
          </div>
        {/if}

        <div class="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{messagesPerDay[0]?.date}</span>
          <span>{messagesPerDay[messagesPerDay.length - 1]?.date}</span>
        </div>

        {#if chartMode === "per-tenant" && tenantIds.length > 0}
          <div class="mt-3 flex flex-wrap gap-3 border-t pt-3">
            {#each tenantIds as id}
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span class="inline-block h-2.5 w-2.5 rounded-sm {tenantColorMap[id]}"></span>
                {tenantNameMap[id]}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <div>
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">Tenants</h3>
      <a
        href="/admin/invite"
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Invite Tenant
      </a>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50">
          <tr>
            <th class="px-4 py-3 text-left font-medium">Business</th>
            <th class="px-4 py-3 text-left font-medium">Owner</th>
            <th class="px-4 py-3 text-left font-medium">Vertical</th>
            <th class="px-4 py-3 text-left font-medium">Status</th>
            <th class="px-4 py-3 text-right font-medium">Messages</th>
            <th class="px-4 py-3 text-left font-medium">Last Active</th>
            <th class="px-4 py-3 text-center font-medium">WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {#each tenants as tenant}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-3 font-medium">{tenant.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{tenant.ownerEmail}</td>
              <td class="px-4 py-3 capitalize">{tenant.vertical}</td>
              <td class="px-4 py-3">
                <Badge variant={statusVariant(tenant.status)}>
                  {tenant.status}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{tenant.messageCount.toLocaleString()}</td>
              <td class="px-4 py-3 text-muted-foreground">
                {#if tenant.lastActive}
                  {new Date(tenant.lastActive).toLocaleDateString()}
                {:else}
                  --
                {/if}
              </td>
              <td class="px-4 py-3 text-center">
                {#if tenant.whatsappConnected}
                  <Badge variant="default" class="text-[10px]">Connected</Badge>
                {:else}
                  <Badge variant="outline" class="text-[10px]">Not set</Badge>
                {/if}
              </td>
            </tr>
          {/each}
          {#if tenants.length === 0}
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-muted-foreground">
                No tenants yet. Invite your first tenant to get started.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
