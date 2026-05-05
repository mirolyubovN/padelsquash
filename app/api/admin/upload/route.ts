import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, assertSuperAdmin } from "@/src/lib/auth/guards";
import { prisma } from "@/src/lib/prisma";
import { MEDIA_CATEGORIES, type MediaCategory } from "@/src/lib/media/constants";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function getUploadCategory(value: FormDataEntryValue | null): MediaCategory {
  const category = typeof value === "string" ? value.trim() : "";
  if (MEDIA_CATEGORIES.includes(category as MediaCategory)) {
    return category as MediaCategory;
  }
  return "instructors";
}

function getOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getSortOrder(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return 100;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 100;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await assertAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const category = getUploadCategory(formData.get("category"));
  if (category !== "instructors") {
    try {
      await assertSuperAdmin();
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "gif";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", category);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  const url = `/uploads/${category}/${filename}`;
  const asset = await prisma.mediaAsset.create({
    data: {
      category,
      url,
      originalName: file.name || null,
      mimeType: file.type,
      sizeBytes: buffer.byteLength,
      altText: getOptionalString(formData.get("altText")),
      caption: getOptionalString(formData.get("caption")),
      sortOrder: getSortOrder(formData.get("sortOrder")),
      createdByUserId: session.user.id ?? null,
    },
  });

  return NextResponse.json({
    url,
    asset: {
      id: asset.id,
      category: asset.category,
      url: asset.url,
      altText: asset.altText,
      caption: asset.caption,
      sortOrder: asset.sortOrder,
      active: asset.active,
    },
  });
}
