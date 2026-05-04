import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, users, conversations, messages, escalations } from "$lib/server/db/schema.js";
import { eq, sql, gte, and } from "drizzle-orm";

export const load: PageServerLoad = async ({ url }) => {
  const range = url.searchParams.get("range") || "30d";
  const daysMap: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const days = daysMap[range] || 30;

  const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    tenantStats,
    totalMessages,
    totalConversations,
    totalEscalations,
    messagesPerDay,
    messagesPerTenantPerDay,
    tenantList,
  ] = await Promise.all([
    db
      .select({
        status: businesses.status,
        count: sql<number>`count(*)`,
      })
      .from(businesses)
      .groupBy(businesses.status),

    db
      .select({ count: sql<number>`count(*)` })
      .from(messages),

    db
      .select({ count: sql<number>`count(*)` })
      .from(conversations),

    db
      .select({ count: sql<number>`count(*)` })
      .from(escalations)
      .where(gte(escalations.createdAt, sevenDaysAgo)),

    db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(gte(messages.createdAt, rangeStart))
      .groupBy(sql`DATE(${messages.createdAt})`)
      .orderBy(sql`DATE(${messages.createdAt})`),

    db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        businessId: conversations.businessId,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(gte(messages.createdAt, rangeStart))
      .groupBy(sql`DATE(${messages.createdAt})`, conversations.businessId)
      .orderBy(sql`DATE(${messages.createdAt})`),

    db
      .select({
        id: businesses.id,
        name: businesses.name,
        status: businesses.status,
        vertical: businesses.vertical,
        createdAt: businesses.createdAt,
        ownerEmail: users.email,
        ownerName: users.name,
        whatsappConnected: businesses.whatsappPhoneNumberId,
      })
      .from(businesses)
      .innerJoin(users, eq(businesses.ownerUserId, users.id))
      .orderBy(sql`${businesses.createdAt} desc`),
  ]);

  const tenantIds = tenantList.map((t) => t.id);

  let messagesByTenant: { businessId: string; count: number }[] = [];
  let lastActiveByTenant: { businessId: string; lastActive: Date | null }[] = [];

  if (tenantIds.length > 0) {
    [messagesByTenant, lastActiveByTenant] = await Promise.all([
      db
        .select({
          businessId: conversations.businessId,
          count: sql<number>`count(${messages.id})`,
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .groupBy(conversations.businessId),

      db
        .select({
          businessId: conversations.businessId,
          lastActive: sql<Date>`max(${conversations.lastMessageAt})`,
        })
        .from(conversations)
        .groupBy(conversations.businessId),
    ]);
  }

  const msgCountMap = new Map(messagesByTenant.map((m) => [m.businessId, Number(m.count)]));
  const lastActiveMap = new Map(lastActiveByTenant.map((l) => [l.businessId, l.lastActive]));

  const tenantsEnriched = tenantList.map((t) => ({
    ...t,
    messageCount: msgCountMap.get(t.id) ?? 0,
    lastActive: lastActiveMap.get(t.id) ?? null,
    whatsappConnected: !!t.whatsappConnected,
  }));

  const totalTenants = tenantStats.reduce((sum, s) => sum + Number(s.count), 0);
  const activeTenants = Number(tenantStats.find((s) => s.status === "active")?.count ?? 0);

  const tenantNameMap = Object.fromEntries(tenantList.map((t) => [t.id, t.name]));

  const perTenantData = messagesPerTenantPerDay.map((d) => ({
    date: d.date,
    businessId: d.businessId,
    businessName: tenantNameMap[d.businessId] || "Unknown",
    count: Number(d.count),
  }));

  return {
    range,
    stats: {
      totalTenants,
      activeTenants,
      totalMessages: Number(totalMessages[0]?.count ?? 0),
      totalConversations: Number(totalConversations[0]?.count ?? 0),
      escalationsThisWeek: Number(totalEscalations[0]?.count ?? 0),
    },
    messagesPerDay: messagesPerDay.map((d) => ({
      date: d.date,
      count: Number(d.count),
    })),
    messagesPerTenant: perTenantData,
    tenants: tenantsEnriched,
  };
};
