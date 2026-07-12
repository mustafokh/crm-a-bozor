import { prisma } from "@/lib/prisma";

export async function leadDashboardStats(userId?: string, role?: string) {
  const where =
    role === "MANAGER"
      ? { OR: [{ assignedToId: userId }, { assignedToId: null }] }
      : {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, todayTalks, byEmployee, byCountry, byOutcome] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.leadConversation.count({
      where: {
        talkedAt: { gte: todayStart },
        lead: where,
      },
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
  ]);

  const employeeIds = byEmployee
    .map((e) => e.assignedToId)
    .filter((id): id is string => id !== null);
  const employees = employeeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true },
      })
    : [];

  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  return {
    total,
    todayTalks,
    unassigned: await prisma.lead.count({ where: { ...where, assignedToId: null } }),
    active: await prisma.lead.count({ where: { ...where, status: { in: ["NEW", "ACTIVE"] } } }),
    byEmployee: byEmployee
      .map((e) => ({
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
    recentLeads: await prisma.lead.findMany({
      where,
      orderBy: [{ talkedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        fullName: true,
        phone: true,
        country: true,
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
