import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const existing = globalThis.__prisma__;
  if (existing) {
    return existing;
  }

  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : process.env.NODE_ENV === "test"
          ? []
          : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma__ = client;
  }

  return client;
}

let prismaLazyInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  prismaLazyInstance ??= createPrismaClient();
  return prismaLazyInstance;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      return Reflect.get(getPrismaClient() as object, prop, receiver);
    },
  },
) as PrismaClient;
