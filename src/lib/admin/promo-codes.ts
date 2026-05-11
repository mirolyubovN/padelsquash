import { Prisma, type PromoCode } from "@prisma/client";
import { assertAdmin } from "@/src/lib/auth/guards";
import { prisma } from "@/src/lib/prisma";
import {
  archivePromoCodeSchema,
  createPromoCodeSchema,
  updatePromoCodeSchema,
  type CreatePromoCodeInput,
  type UpdatePromoCodeInput,
} from "@/src/lib/admin/promo-codes-schema";

export class PromoCodeActionError extends Error {
  constructor(
    message: string,
    public readonly code = "promo_action_failed",
  ) {
    super(message);
    this.name = "PromoCodeActionError";
  }
}

export interface PromoCodeRow {
  id: string;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed_kzt";
  discountValue: number;
  maxDiscountKzt: number | null;
  minOrderKzt: number | null;
  validFrom: string | null;
  validUntil: string | null;
  totalRedemptionLimit: number | null;
  perCustomerLimit: number | null;
  appliesToServiceCodes: string[];
  appliesToSportIds: string[];
  firstBookingOnly: boolean;
  status: "active" | "paused" | "archived";
  redemptionCount: number;
  createdAtIso: string;
}

export interface PromoCodeRedemptionRow {
  id: string;
  customerId: string;
  customerName: string;
  bookingId: string | null;
  amountKzt: number;
  createdAtIso: string;
}

export interface PromoCodeDetailData {
  promo: PromoCodeRow;
  redemptions: PromoCodeRedemptionRow[];
  totalDiscountKzt: number;
}

export interface PromoCodeListData {
  promoCodes: PromoCodeRow[];
}

function mapRow(promo: PromoCode & { _count: { redemptions: number } }): PromoCodeRow {
  return {
    id: promo.id,
    code: promo.code,
    description: promo.description,
    discountType: promo.discountType,
    discountValue: Number(promo.discountValue),
    maxDiscountKzt: promo.maxDiscountKzt !== null ? Number(promo.maxDiscountKzt) : null,
    minOrderKzt: promo.minOrderKzt !== null ? Number(promo.minOrderKzt) : null,
    validFrom: promo.validFrom ? promo.validFrom.toISOString().slice(0, 10) : null,
    validUntil: promo.validUntil ? promo.validUntil.toISOString().slice(0, 10) : null,
    totalRedemptionLimit: promo.totalRedemptionLimit,
    perCustomerLimit: promo.perCustomerLimit,
    appliesToServiceCodes: promo.appliesToServiceCodes,
    appliesToSportIds: promo.appliesToSportIds,
    firstBookingOnly: promo.firstBookingOnly,
    status: promo.status,
    redemptionCount: promo._count.redemptions,
    createdAtIso: promo.createdAt.toISOString(),
  };
}

function normalizeError(error: unknown): never {
  if (error instanceof PromoCodeActionError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new PromoCodeActionError("Промокод с таким кодом уже существует.", "promo_code_duplicate");
  }
  throw new PromoCodeActionError("Не удалось выполнить действие.", "promo_action_failed");
}

export async function listPromoCodes(filters?: {
  status?: "active" | "paused" | "archived" | "all";
  q?: string;
}): Promise<PromoCodeListData> {
  await assertAdmin();

  const where: Prisma.PromoCodeWhereInput = {};
  if (filters?.status && filters.status !== "all") {
    where.status = filters.status;
  }
  if (filters?.q) {
    where.code = { contains: filters.q.toUpperCase() };
  }

  const promoCodes = await prisma.promoCode.findMany({
    where,
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return { promoCodes: promoCodes.map(mapRow) };
}

export async function getPromoCodeById(id: string): Promise<PromoCodeDetailData | null> {
  await assertAdmin();

  const promo = await prisma.promoCode.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!promo) return null;

  const redemptions = await prisma.promoCodeRedemption.findMany({
    where: { promoCodeId: id },
    include: { promoCode: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const customerIds = [...new Set(redemptions.map((r) => r.customerId))];
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true },
  });
  const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));

  const totalDiscountKzt = redemptions.reduce((sum, r) => sum + Number(r.amountKzt), 0);

  const redemptionRows: PromoCodeRedemptionRow[] = redemptions.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: customerNameMap.get(r.customerId) ?? "—",
    bookingId: r.bookingId,
    amountKzt: Number(r.amountKzt),
    createdAtIso: r.createdAt.toISOString(),
  }));

  return { promo: mapRow(promo), redemptions: redemptionRows, totalDiscountKzt };
}

export async function createPromoCode(input: CreatePromoCodeInput): Promise<{ id: string }> {
  const actor = await assertAdmin();
  const parsed = createPromoCodeSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const promo = await tx.promoCode.create({
        data: {
          code: parsed.code,
          description: parsed.description ?? null,
          discountType: parsed.discountType,
          discountValue: parsed.discountValue,
          maxDiscountKzt: parsed.maxDiscountKzt ?? null,
          minOrderKzt: parsed.minOrderKzt ?? null,
          validFrom: parsed.validFrom ? new Date(`${parsed.validFrom}T00:00:00Z`) : null,
          validUntil: parsed.validUntil ? new Date(`${parsed.validUntil}T23:59:59Z`) : null,
          totalRedemptionLimit: parsed.totalRedemptionLimit ?? null,
          perCustomerLimit: parsed.perCustomerLimit ?? 1,
          appliesToServiceCodes: parsed.appliesToServiceCodes,
          appliesToSportIds: parsed.appliesToSportIds,
          firstBookingOnly: parsed.firstBookingOnly,
          status: parsed.status,
          createdByUserId: actor.user.id,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.user.id,
          action: "promo.create",
          entityType: "promo_code",
          entityId: promo.id,
          detail: { code: parsed.code, discountType: parsed.discountType, discountValue: parsed.discountValue },
        },
      });

      return promo;
    });
  } catch (error) {
    normalizeError(error);
  }
}

export async function updatePromoCode(input: UpdatePromoCodeInput): Promise<void> {
  const actor = await assertAdmin();
  const parsed = updatePromoCodeSchema.parse(input);

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.promoCode.findUnique({
        where: { id: parsed.id },
        select: { code: true, status: true },
      });
      if (!current) throw new PromoCodeActionError("Промокод не найден.", "promo_not_found");
      if (current.status === "archived") {
        throw new PromoCodeActionError("Архивированный промокод нельзя редактировать.", "promo_archived");
      }

      await tx.promoCode.update({
        where: { id: parsed.id },
        data: {
          code: parsed.code,
          description: parsed.description ?? null,
          discountType: parsed.discountType,
          discountValue: parsed.discountValue,
          maxDiscountKzt: parsed.maxDiscountKzt ?? null,
          minOrderKzt: parsed.minOrderKzt ?? null,
          validFrom: parsed.validFrom ? new Date(`${parsed.validFrom}T00:00:00Z`) : null,
          validUntil: parsed.validUntil ? new Date(`${parsed.validUntil}T23:59:59Z`) : null,
          totalRedemptionLimit: parsed.totalRedemptionLimit ?? null,
          perCustomerLimit: parsed.perCustomerLimit ?? 1,
          appliesToServiceCodes: parsed.appliesToServiceCodes,
          appliesToSportIds: parsed.appliesToSportIds,
          firstBookingOnly: parsed.firstBookingOnly,
          status: parsed.status,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.user.id,
          action: "promo.update",
          entityType: "promo_code",
          entityId: parsed.id,
          detail: { code: parsed.code },
        },
      });
    });
  } catch (error) {
    normalizeError(error);
  }
}

export async function archivePromoCode(id: string): Promise<void> {
  const actor = await assertAdmin();
  archivePromoCodeSchema.parse({ id });

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.promoCode.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw new PromoCodeActionError("Промокод не найден.", "promo_not_found");
      if (current.status === "archived") {
        throw new PromoCodeActionError("Промокод уже архивирован.", "promo_already_archived");
      }

      await tx.promoCode.update({ where: { id }, data: { status: "archived" } });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.user.id,
          action: "promo.archive",
          entityType: "promo_code",
          entityId: id,
          detail: {},
        },
      });
    });
  } catch (error) {
    normalizeError(error);
  }
}
