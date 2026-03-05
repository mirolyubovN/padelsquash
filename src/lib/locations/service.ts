import { prisma } from "@/src/lib/prisma";

export interface LocationRecord {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  mapUrl?: string;
  active: boolean;
  sortOrder: number;
}

function mapLocation(row: {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  mapUrl: string | null;
  active: boolean;
  sortOrder: number;
}): LocationRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    timezone: row.timezone,
    mapUrl: row.mapUrl ?? undefined,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

export async function getLocations(options?: {
  includeInactive?: boolean;
}): Promise<LocationRecord[]> {
  const rows = await prisma.location.findMany({
    where: options?.includeInactive ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      mapUrl: true,
      active: true,
      sortOrder: true,
    },
  });

  return rows.map(mapLocation);
}

export async function getDefaultLocation(): Promise<LocationRecord> {
  const location = await prisma.location.findFirst({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      mapUrl: true,
      active: true,
      sortOrder: true,
    },
  });

  if (location) {
    return mapLocation(location);
  }

  const fallback = await prisma.location.findFirst({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      mapUrl: true,
      active: true,
      sortOrder: true,
    },
  });

  if (!fallback) {
    throw new Error("Не найдено ни одной локации");
  }

  return mapLocation(fallback);
}

export async function resolveLocationBySlug(slug?: string | null): Promise<{
  selected: LocationRecord;
  activeLocations: LocationRecord[];
}> {
  const activeLocations = await getLocations();
  if (activeLocations.length === 0) {
    throw new Error("Не найдено активных локаций");
  }

  const selectedBySlug = slug
    ? activeLocations.find((location) => location.slug === slug)
    : null;

  return {
    selected: selectedBySlug ?? activeLocations[0],
    activeLocations,
  };
}
