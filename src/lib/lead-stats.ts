import { prisma } from "@/lib/prisma";
import { CHANNEL_SOURCES } from "@/lib/constants";

function leadWhere(userId?: string, role?: string) {
  return role === "MANAGER"
    ? { OR: [{ assignedToId: userId }, { assignedToId: null }] }
    : {};
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function carLabel(make: string | null, model: string | null, color: string | null) {
  const parts = [make, model].filter(Boolean).join(" ").trim();
  if (color && parts) return `${color} ${parts}`;
  if (color) return color;
  return parts || "—";
}

const CALL_TO_LEAD: Record<string, string> = {
  call: "CALL",
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
};

export async function leadDashboardStats(userId?: string, role?: string) {
  const where = leadWhere(userId, role);
  const start = todayStart();
  const todayLeadWhere = { ...where, talkedAt: { gte: start } };

  const [
    total,
    todayLeadTalks,
    todayConversations,
    todayCallsTotal,
    todayCallsByChannel,
    todayLeadsBySource,
    todayLeadsByEmployee,
    todayConvByUser,
    callEmployeeToday,
    byEmployee,
    byCountry,
    byOutcome,
    bySource,
    leadCarGroups,
    todayLeadCarGroups,
    callCarGroupsToday,
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: todayLeadWhere }),
    prisma.leadConversation.count({
      where: { talkedAt: { gte: start }, lead: where },
    }),
    prisma.call.count({ where: { callDate: { gte: start } } }),
    prisma.call.groupBy({
      by: ["source"],
      where: { callDate: { gte: start } },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: {
        ...todayLeadWhere,
        source: { in: [...CHANNEL_SOURCES] },
      },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedToId"],
      where: { ...todayLeadWhere, assignedToId: { not: null } },
      _count: { id: true },
    }),
    prisma.leadConversation.groupBy({
      by: ["userId"],
      where: { talkedAt: { gte: start }, lead: where },
      _count: { id: true },
    }),
    prisma.call.groupBy({
      by: ["employeeName"],
      where: { callDate: { gte: start }, employeeName: { not: null } },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedToId"],
      where,
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["country"],
      where: { ...where, country: { not: null } },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["outcome"],
      where: { ...where, outcome: { not: null } },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where,
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["carMake", "carModel", "carColor"],
      where: {
        ...where,
        OR: [{ carModel: { not: null } }, { carColor: { not: null } }],
      },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["carMake", "carModel", "carColor"],
      where: {
        ...todayLeadWhere,
        OR: [{ carModel: { not: null } }, { carColor: { not: null } }],
      },
      _count: { id: true },
    }),
    prisma.call.groupBy({
      by: ["carBrand", "carModel", "carColor"],
      where: {
        callDate: { gte: start },
        OR: [{ carModel: { not: null } }, { carColor: { not: null } }],
      },
      _count: { id: true },
    }),
  ]);

  const employeeIds = [
    ...byEmployee.map((e) => e.assignedToId),
    ...todayLeadsByEmployee.map((e) => e.assignedToId),
    ...todayConvByUser.map((c) => c.userId),
  ].filter((id): id is string => id !== null);

  const employees = employeeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: [...new Set(employeeIds)] } },
        select: { id: true, name: true },
      })
    : [];

  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const todayEmployeeMap = new Map<string, { id: string | null; name: string; count: number }>();

  for (const row of todayLeadsByEmployee) {
    if (!row.assignedToId) continue;
    const name = employeeMap[row.assignedToId] ?? "—";
    todayEmployeeMap.set(row.assignedToId, {
      id: row.assignedToId,
      name,
      count: row._count.id,
    });
  }

  for (const row of todayConvByUser) {
    const name = employeeMap[row.userId] ?? "—";
    const prev = todayEmployeeMap.get(row.userId);
    todayEmployeeMap.set(row.userId, {
      id: row.userId,
      name,
      count: (prev?.count ?? 0) + row._count.id,
    });
  }

  for (const row of callEmployeeToday) {
    const name = row.employeeName ?? "—";
    const user = employees.find((e) =>
      e.name.toLowerCase().includes(name.toLowerCase().split(" ")[0] ?? "")
    );
    const key = user?.id ?? `call:${name}`;
    const prev = todayEmployeeMap.get(key);
    todayEmployeeMap.set(key, {
      id: user?.id ?? null,
      name,
      count: (prev?.count ?? 0) + row._count.id,
    });
  }

  function mergeCarGroups(
    leadRows: typeof leadCarGroups,
    callRows: typeof callCarGroupsToday,
    useBrand = false
  ) {
    const map = new Map<string, { label: string; carColor: string | null; carModel: string | null; count: number }>();
    for (const row of leadRows) {
      const label = carLabel(row.carMake, row.carModel, row.carColor);
      const key = label.toLowerCase();
      const prev = map.get(key);
      map.set(key, {
        label,
        carColor: row.carColor,
        carModel: row.carModel,
        count: (prev?.count ?? 0) + row._count.id,
      });
    }
    if (useBrand) {
      for (const row of callRows) {
        const label = carLabel(row.carBrand, row.carModel, row.carColor);
        const key = label.toLowerCase();
        const prev = map.get(key);
        map.set(key, {
          label,
          carColor: row.carColor,
          carModel: row.carModel,
          count: (prev?.count ?? 0) + row._count.id,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }

  const channelCounts = Object.fromEntries(CHANNEL_SOURCES.map((s) => [s, 0])) as Record<string, number>;
  for (const row of bySource) {
    if (CHANNEL_SOURCES.includes(row.source as (typeof CHANNEL_SOURCES)[number])) {
      channelCounts[row.source] = row._count.id;
    }
  }

  const todayChannelCounts: Record<string, number> = { CALL: 0, WHATSAPP: 0, TELEGRAM: 0 };
  for (const row of todayLeadsBySource) {
    todayChannelCounts[row.source] = (todayChannelCounts[row.source] ?? 0) + row._count.id;
  }
  for (const row of todayCallsByChannel) {
    const key = CALL_TO_LEAD[row.source] ?? row.source.toUpperCase();
    if (key in todayChannelCounts) {
      todayChannelCounts[key] = (todayChannelCounts[key] ?? 0) + row._count.id;
    }
  }

  const todayByChannel = CHANNEL_SOURCES.map((source) => ({
    source,
    count: todayChannelCounts[source] ?? 0,
  }));

  const todayTotal = todayLeadTalks + todayCallsTotal;
  const topTodayChannel = [...todayByChannel].sort((a, b) => b.count - a.count)[0];

  return {
    total,
    todayTalks: todayTotal,
    todayLeadTalks,
    todayCallsTotal,
    unassigned: await prisma.lead.count({ where: { ...where, assignedToId: null } }),
    active: await prisma.lead.count({ where: { ...where, status: { in: ["NEW", "ACTIVE"] } } }),
    byEmployee: byEmployee
      .map((e) => ({
        id: e.assignedToId,
        name: e.assignedToId ? employeeMap[e.assignedToId] ?? "—" : "Tayinlanmagan",
        count: e._count.id,
      }))
      .sort((a, b) => b.count - a.count),
    byCountry: byCountry
      .map((c) => ({ country: c.country ?? "—", count: c._count.id }))
      .sort((a, b) => b.count - a.count),
    byOutcome: byOutcome
      .map((o) => ({ outcome: o.outcome ?? "—", count: o._count.id }))
      .sort((a, b) => b.count - a.count),
    bySource: CHANNEL_SOURCES.map((source) => ({
      source,
      count: channelCounts[source] ?? 0,
    })),
    todayByChannel,
    topTodayChannel,
    todayByEmployee: [...todayEmployeeMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topCarInterests: mergeCarGroups(leadCarGroups, [], false).slice(0, 10),
    todayCarInterests: mergeCarGroups(todayLeadCarGroups, callCarGroupsToday, true).slice(0, 10),
    recentLeads: await prisma.lead.findMany({
      where,
      orderBy: [{ talkedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        fullName: true,
        phone: true,
        country: true,
        source: true,
        talkedAt: true,
        carMake: true,
        carModel: true,
        carYear: true,
        carColor: true,
        outcome: true,
        assignedTo: { select: { name: true } },
      },
    }),
  };
}
