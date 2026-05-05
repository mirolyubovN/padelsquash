import { prisma } from "@/src/lib/prisma";
import { MEDIA_CATEGORIES, type MediaCategory } from "@/src/lib/media/constants";

export interface AdminMediaAsset {
  id: string;
  category: string;
  url: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  altText: string | null;
  caption: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function parseMediaCategory(value: FormDataEntryValue | null): MediaCategory {
  const category = typeof value === "string" ? value.trim() : "";
  if (MEDIA_CATEGORIES.includes(category as MediaCategory)) {
    return category as MediaCategory;
  }
  return "gallery";
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseSortOrder(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return 100;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 100;
}

export async function getAdminMediaAssets(): Promise<AdminMediaAsset[]> {
  return prisma.mediaAsset.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPublicMediaAssets(category: MediaCategory, limit = 12): Promise<AdminMediaAsset[]> {
  return prisma.mediaAsset.findMany({
    where: {
      category,
      active: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getSelectableInstructorPhotoAssets(limit = 80): Promise<AdminMediaAsset[]> {
  return prisma.mediaAsset.findMany({
    where: {
      active: true,
      category: { in: ["instructors", "gallery"] },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function updateMediaAssetFromForm(formData: FormData) {
  const mediaAssetId = String(formData.get("mediaAssetId") ?? "");
  if (!mediaAssetId) {
    throw new Error("mediaAssetId is required");
  }

  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: {
      category: parseMediaCategory(formData.get("category")),
      altText: parseOptionalString(formData.get("altText")),
      caption: parseOptionalString(formData.get("caption")),
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    },
  });
}

export async function setMediaAssetActive(input: { mediaAssetId: string; active: boolean }) {
  if (!input.mediaAssetId) {
    throw new Error("mediaAssetId is required");
  }

  await prisma.mediaAsset.update({
    where: { id: input.mediaAssetId },
    data: { active: input.active },
  });
}
