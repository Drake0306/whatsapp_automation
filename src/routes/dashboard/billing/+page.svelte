<script lang="ts">
  import { page } from "$app/stores";

  const subscription = $derived($page.data.subscription);
  const plans = $derived($page.data.plans ?? []);

  function formatAmount(paise: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-green-100 text-green-800" },
    created: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
  };
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Billing</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-3xl px-4 py-8">
    <!-- Current subscription -->
    {#if subscription}
      <div class="rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Current Plan</h2>
            <p class="mt-1 text-sm capitalize text-muted-foreground">
              {subscription.planId} plan
            </p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-medium {statusLabels[subscription.status]?.color ?? 'bg-muted'}">
            {statusLabels[subscription.status]?.label ?? subscription.status}
          </span>
        </div>
        {#if subscription.currentPeriodEnd}
          <p class="mt-3 text-sm text-muted-foreground">
            Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        {/if}
      </div>
    {/if}

    <!-- Plans -->
    <h2 class="mt-8 text-lg font-semibold">
      {subscription ? "Change Plan" : "Choose a Plan"}
    </h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-3">
      {#each plans as plan}
        <div class="rounded-lg border p-6 {subscription?.planId === plan.id ? 'ring-2 ring-primary' : ''}">
          <h3 class="font-semibold">{plan.name}</h3>
          <p class="mt-1 text-2xl font-bold">{formatAmount(plan.amount)}<span class="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p class="mt-2 text-sm text-muted-foreground">{plan.description}</p>
          {#if subscription?.planId === plan.id}
            <p class="mt-4 text-center text-xs font-medium text-primary">Current plan</p>
          {:else}
            <button class="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {subscription ? "Switch" : "Subscribe"}
            </button>
          {/if}
        </div>
      {/each}
    </div>

    <p class="mt-6 text-xs text-muted-foreground">
      Payments powered by Razorpay. UPI, debit card, and net banking accepted.
      WhatsApp BSP message charges billed separately.
    </p>
  </main>
</div>
