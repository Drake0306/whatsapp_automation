<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  const appts = $derived($page.data.appointments ?? []);
  const filter = $derived($page.data.filter ?? "upcoming");

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-yellow-100 text-yellow-800",
  };
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <h1 class="text-xl font-bold">Appointments</h1>
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </a>
    </div>
  </header>

  <main class="mx-auto max-w-5xl px-4 py-8">
    <div class="flex gap-2">
      <a
        href="/dashboard/appointments?filter=upcoming"
        class="rounded-md px-3 py-1.5 text-sm {filter === 'upcoming'
          ? 'bg-primary text-primary-foreground'
          : 'border border-input hover:bg-accent'}"
      >
        Upcoming
      </a>
      <a
        href="/dashboard/appointments?filter=all"
        class="rounded-md px-3 py-1.5 text-sm {filter === 'all'
          ? 'bg-primary text-primary-foreground'
          : 'border border-input hover:bg-accent'}"
      >
        All
      </a>
    </div>

    {#if appts.length === 0}
      <div class="mt-8 rounded-lg border p-8 text-center">
        <p class="text-muted-foreground">No appointments found.</p>
      </div>
    {:else}
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left">
              <th class="pb-2 pr-4 font-medium text-muted-foreground">Customer</th>
              <th class="pb-2 pr-4 font-medium text-muted-foreground">Service</th>
              <th class="pb-2 pr-4 font-medium text-muted-foreground">Date & Time</th>
              <th class="pb-2 pr-4 font-medium text-muted-foreground">Duration</th>
              <th class="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
              <th class="pb-2 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each appts as appt}
              <tr class="border-b">
                <td class="py-3 pr-4">{appt.customerPhone}</td>
                <td class="py-3 pr-4">{appt.service ?? "—"}</td>
                <td class="py-3 pr-4">
                  {new Date(appt.slotAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {new Date(appt.slotAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td class="py-3 pr-4">{appt.durationMin}min</td>
                <td class="py-3 pr-4">
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[appt.status] ?? 'bg-muted'}">
                    {appt.status}
                  </span>
                </td>
                <td class="py-3">
                  {#if appt.status === "confirmed"}
                    <div class="flex gap-1">
                      <form method="POST" action="?/update-status" use:enhance>
                        <input type="hidden" name="appointmentId" value={appt.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button class="rounded px-2 py-1 text-xs hover:bg-accent">Complete</button>
                      </form>
                      <form method="POST" action="?/update-status" use:enhance>
                        <input type="hidden" name="appointmentId" value={appt.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <button class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">No-show</button>
                      </form>
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </main>
</div>
