import type { PrismaClient } from "@prisma/client";

interface ResourceLockKey {
  resourceType: "court" | "instructor";
  resourceId: string;
}

interface CreateBookingWithLockArgs {
  prisma: PrismaClient;
  resourceLocks: ResourceLockKey[];
  run: (tx: unknown) => Promise<unknown>;
}

function stableHashToInt32(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return hash;
}

export async function withBookingConcurrencyGuard(args: CreateBookingWithLockArgs) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await args.prisma.$transaction(
        async (tx: unknown) => {
          // Advisory locks are scoped to the current transaction and released automatically.
          // We lock every resource participating in the booking (court/instructor) in sorted order
          // to prevent deadlocks and to serialize overlap checks for the same resources.
          const sortedKeys = [...args.resourceLocks].sort((a, b) =>
            `${a.resourceType}:${a.resourceId}`.localeCompare(`${b.resourceType}:${b.resourceId}`),
          );

          const txWithRaw = tx as { $executeRaw: PrismaClient["$executeRaw"] };
          for (const lockKey of sortedKeys) {
            const lockValue = stableHashToInt32(`${lockKey.resourceType}:${lockKey.resourceId}`);
            await txWithRaw.$executeRaw`SELECT pg_advisory_xact_lock(${lockValue})`;
          }

          return args.run(tx);
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < maxAttempts && isRetryableSerializationConflict(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Не удалось выполнить бронирование после повторных попыток");
}

function isRetryableSerializationConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("write conflict or a deadlock") ||
    message.includes("Transaction failed due to a write conflict") ||
    message.includes("could not serialize access")
  );
}
