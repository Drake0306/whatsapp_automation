import { db } from "$lib/server/db/index.js";
import { appointments, businessHours, businessServices, slotBlocks } from "$lib/server/db/schema.js";
import { eq, and, gte, lte, or, sql, inArray } from "drizzle-orm";

export interface TimeSlot {
  startAt: Date;
  endAt: Date;
}

export interface ServiceInfo {
  id: string;
  name: string;
  durationMin: number;
  capacity: number;
  bookingMode: "instant" | "queue";
  price: number | null;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  status?: "confirmed" | "pending";
  reason?: string;
}

const SLOT_INTERVAL_MIN = 15;

function toLocalDate(utcDate: Date, timezone: string): { year: number; month: number; day: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(utcDate);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dayOfWeek: dayMap[get("weekday")] ?? 0,
  };
}

export function localTimeToUtc(date: { year: number; month: number; day: number }, time: string, timezone: string): Date {
  const [h, m] = time.split(":").map(Number);
  const iso = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

  const utcGuess = new Date(iso + "Z");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const localOfGuess = formatter.format(utcGuess);
  const [lh, lm] = localOfGuess.split(":").map(Number);
  const diffMs = ((lh - h) * 60 + (lm - m)) * 60 * 1000;
  return new Date(utcGuess.getTime() - diffMs);
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60 * 1000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function getActiveServices(businessId: string): Promise<ServiceInfo[]> {
  const rows = await db
    .select()
    .from(businessServices)
    .where(and(eq(businessServices.businessId, businessId), eq(businessServices.isActive, true)))
    .orderBy(businessServices.sortOrder);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    durationMin: r.durationMin,
    capacity: r.capacity,
    bookingMode: r.bookingMode as "instant" | "queue",
    price: r.price,
  }));
}

export async function getAvailableSlots(params: {
  businessId: string;
  serviceId: string;
  date: Date;
  timezone: string;
}): Promise<TimeSlot[]> {
  const { businessId, serviceId, date, timezone } = params;

  const [service] = await db
    .select()
    .from(businessServices)
    .where(eq(businessServices.id, serviceId))
    .limit(1);

  if (!service) return [];

  const localDate = toLocalDate(date, timezone);

  const [hours] = await db
    .select()
    .from(businessHours)
    .where(and(eq(businessHours.businessId, businessId), eq(businessHours.dayOfWeek, localDate.dayOfWeek)))
    .limit(1);

  if (!hours || hours.isClosed) return [];

  const dayOpen = localTimeToUtc(localDate, hours.openTime, timezone);
  const dayClose = localTimeToUtc(localDate, hours.closeTime, timezone);

  const existingAppts = await db
    .select({ slotAt: appointments.slotAt, durationMin: appointments.durationMin })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, businessId),
        gte(appointments.slotAt, addMinutes(dayOpen, -service.durationMin)),
        lte(appointments.slotAt, dayClose),
        inArray(appointments.status, ["confirmed", "pending"]),
        or(eq(appointments.serviceId, serviceId), sql`${appointments.serviceId} IS NULL`),
      ),
    );

  const blocks = await db
    .select()
    .from(slotBlocks)
    .where(
      and(
        eq(slotBlocks.businessId, businessId),
        lte(slotBlocks.startAt, dayClose),
        gte(slotBlocks.endAt, dayOpen),
        or(eq(slotBlocks.serviceId, serviceId), sql`${slotBlocks.serviceId} IS NULL`),
      ),
    );

  const now = new Date();
  const slots: TimeSlot[] = [];
  let cursor = new Date(dayOpen);

  while (cursor < dayClose) {
    const slotEnd = addMinutes(cursor, service.durationMin);
    if (slotEnd > dayClose) break;
    if (cursor <= now) {
      cursor = addMinutes(cursor, SLOT_INTERVAL_MIN);
      continue;
    }

    const conflictCount = existingAppts.filter((a) =>
      overlaps(cursor, slotEnd, a.slotAt, addMinutes(a.slotAt, a.durationMin)),
    ).length;

    const isBlocked = blocks.some((b) => overlaps(cursor, slotEnd, b.startAt, b.endAt));

    if (conflictCount < service.capacity && !isBlocked) {
      slots.push({ startAt: new Date(cursor), endAt: new Date(slotEnd) });
    }

    cursor = addMinutes(cursor, SLOT_INTERVAL_MIN);
  }

  return slots;
}

export async function checkSlotAvailable(params: {
  businessId: string;
  serviceId: string;
  slotAt: Date;
  timezone: string;
}): Promise<{ available: boolean; conflictCount: number; capacity: number }> {
  const { businessId, serviceId, slotAt, timezone } = params;

  const [service] = await db
    .select()
    .from(businessServices)
    .where(eq(businessServices.id, serviceId))
    .limit(1);

  if (!service) return { available: false, conflictCount: 0, capacity: 0 };

  const localDate = toLocalDate(slotAt, timezone);
  const [hours] = await db
    .select()
    .from(businessHours)
    .where(and(eq(businessHours.businessId, businessId), eq(businessHours.dayOfWeek, localDate.dayOfWeek)))
    .limit(1);

  if (!hours || hours.isClosed) return { available: false, conflictCount: 0, capacity: service.capacity };

  const slotEnd = addMinutes(slotAt, service.durationMin);

  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, businessId),
        inArray(appointments.status, ["confirmed", "pending"]),
        or(eq(appointments.serviceId, serviceId), sql`${appointments.serviceId} IS NULL`),
        sql`${appointments.slotAt} < ${slotEnd}`,
        sql`DATE_ADD(${appointments.slotAt}, INTERVAL ${appointments.durationMin} MINUTE) > ${slotAt}`,
      ),
    );

  const blocks = await db
    .select({ id: slotBlocks.id })
    .from(slotBlocks)
    .where(
      and(
        eq(slotBlocks.businessId, businessId),
        lte(slotBlocks.startAt, slotEnd),
        gte(slotBlocks.endAt, slotAt),
        or(eq(slotBlocks.serviceId, serviceId), sql`${slotBlocks.serviceId} IS NULL`),
      ),
    );

  if (blocks.length > 0) return { available: false, conflictCount: conflicts.length, capacity: service.capacity };

  return {
    available: conflicts.length < service.capacity,
    conflictCount: conflicts.length,
    capacity: service.capacity,
  };
}

export async function bookSlot(params: {
  businessId: string;
  serviceId: string;
  slotAt: Date;
  customerPhone: string;
  conversationId: string;
  notes?: string;
  timezone: string;
}): Promise<BookingResult> {
  const { businessId, serviceId, slotAt, customerPhone, conversationId, notes, timezone } = params;

  const check = await checkSlotAvailable({ businessId, serviceId, slotAt, timezone });
  if (!check.available) {
    return { success: false, reason: "slot_full" };
  }

  const [service] = await db
    .select()
    .from(businessServices)
    .where(eq(businessServices.id, serviceId))
    .limit(1);

  if (!service) return { success: false, reason: "service_not_found" };

  const status = service.bookingMode === "queue" ? "pending" : "confirmed";

  await db.insert(appointments).values({
    businessId,
    serviceId,
    conversationId,
    customerPhone,
    service: service.name,
    slotAt,
    durationMin: service.durationMin,
    status,
    notes: notes ?? null,
  });

  const [inserted] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, businessId),
        eq(appointments.customerPhone, customerPhone),
        eq(appointments.slotAt, slotAt),
      ),
    )
    .orderBy(sql`${appointments.createdAt} desc`)
    .limit(1);

  const recheck = await checkSlotAvailable({ businessId, serviceId, slotAt, timezone });
  if (!recheck.available && inserted) {
    await db
      .update(appointments)
      .set({ status: "cancelled" })
      .where(eq(appointments.id, inserted.id));
    return { success: false, reason: "slot_full" };
  }

  return {
    success: true,
    appointmentId: inserted?.id,
    status,
  };
}

export async function suggestAlternatives(params: {
  businessId: string;
  serviceId: string;
  preferredDate: Date;
  timezone: string;
  count?: number;
}): Promise<TimeSlot[]> {
  const { businessId, serviceId, preferredDate, timezone, count = 3 } = params;
  const alternatives: TimeSlot[] = [];

  for (let dayOffset = 0; dayOffset <= 7 && alternatives.length < count; dayOffset++) {
    const checkDate = new Date(preferredDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const slots = await getAvailableSlots({ businessId, serviceId, date: checkDate, timezone });

    if (dayOffset === 0) {
      const nearestIdx = slots.findIndex((s) => s.startAt >= preferredDate);
      const start = Math.max(0, nearestIdx === -1 ? slots.length - count : nearestIdx - 1);
      for (const s of slots.slice(start, start + count)) {
        if (alternatives.length < count) alternatives.push(s);
      }
    } else {
      const spread = pickSpread(slots, count - alternatives.length);
      alternatives.push(...spread);
    }
  }

  return alternatives;
}

function pickSpread(slots: TimeSlot[], count: number): TimeSlot[] {
  if (slots.length <= count) return slots;
  const step = Math.floor(slots.length / count);
  const result: TimeSlot[] = [];
  for (let i = 0; i < count; i++) {
    result.push(slots[Math.min(i * step, slots.length - 1)]);
  }
  return result;
}
