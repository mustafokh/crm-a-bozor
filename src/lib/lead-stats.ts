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

export async function leadDashboardStats(userId?: string, role?: string) {
  const where = leadWhere(userId, role);
  const start = todayStart();

  const [
    total,
    todayTalks,
    byEmployee,
    byCountry,
    byOutcome,
    bySource,
    todayCallsByChannel,
    todayCallsTotal,
    todayConvByUser,
    leadCarGroups,
    callCarGroupsToday,
    callEmployeeToday,
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.leadConversation.count({
      where: { talkedAt: { gte: start }, lead: where },
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
    prisma.call.groupBy({
      by: ["source"],
      where: { callDate: { gte: start } },
      _count: { id: true },
    }),
    prisma.call.count({ where: { callDate: { gte: start } } }),
    prisma.leadConversation.groupBy({
      by: ["userId"],
      where: { talkedAt: { gte: start }, lead: where },
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
    prisma.call.groupBy({
      by: ["carBrand", "carModel", "carColor"],
      where: {
        callDate: { gte: start },
        OR: [{ carModel: { not: null } }, { carColor: { not: null } }],
      },
      _count: { id: true },
    }),
    prisma.call.groupBy({
      by: ["employeeName"],
      where: { callDate: { gte: start }, employeeName: { not: null } },
      _count: { id: true },
    }),
  ]);

  const employeeIds = byEmployee
    .map((e) => e.assignedToId)
    .filter((id): id is string => id !== null);
  const convUserIds = todayConvByUser.map((c) => c.userId);
  const allUserIds = [...new Set([...employeeIds, ...convUserIds])];

  const employees = allUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, name: true },
      })
    : [];

  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const todayEmployeeMap = new Map<string, { name: string; count: number }>();

  for (const row of todayConvByUser) {
    const name = employeeMap[row.userId] ?? "—";
    const prev = todayEmployeeMap.get(row.userId);
    todayEmployeeMap.set(row.userId, {
      name,
      count: (prev?.count ?? 0) + row._count.id,
    });
  }

  for (const row of callEmployeeToday) {
    const name = row.employeeName ?? "—";
    const key = `call:${name}`;
    const prev = todayEmployeeMap.get(key);
    todayEmployeeMap.set(key, {
      name,
      count: (prev?.count ?? 0) + row._count.id,
    });
  }

  const carInterestMap = new Map<string, { label: string; carColor: string | null; carModel: string | null; count: number }>();

  for (const row of leadCarGroups) {
    const label = carLabel(row.carMake, row.carModel, row.carColor);
    const key = label.toLowerCase();
    const prev = carInterestMap.get(key);
    carInterestMap.set(key, {
      label,
      carColor: row.carColor,
      carModel: row.carModel,
      count: (prev?.count ?? 0) + row._count.id,
    });
  }

  for (const row of callCarGroupsToday) {
    const label = carLabel(row.carBrand, row.carModel, row.carColor);
    const key = label.toLowerCase();
    const prev = carInterestMap.get(key);
    carInterestMap.set(key, {
      label,
      carColor: row.carColor,
      carModel: row.carModel,
      count: (prev?.count ?? 0) + row._count.id,
    });
  }

  const channelCounts = Object.fromEntries(
    CHANNEL_SOURCES.map((s) => [s, 0])
  ) as Record<string, number>;

  for (const row of bySource) {
    channelCounts[row.source] = (channelCounts[row.source] ?? 0) + row._count.id;
  }

  const todayChannelFromCalls = Object.fromEntries(
    todayCallsByChannel.map((c) => [c.source, c._count.id])
  );

  return {
    total,
    todayTalks,
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
    todayByChannel: [
      { source: "call", count: todayChannelFromCalls.call ?? 0 },
      { source: "whatsapp", count: todayChannelFromCalls.whatsapp ?? 0 },
      { source: "telegram", count: todayChannelFromCalls.telegram ?? 0 },
    ],
    todayByEmployee: [...todayEmployeeMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topCarInterests: [...carInterestMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
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
