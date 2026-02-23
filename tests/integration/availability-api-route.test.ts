import { afterAll, describe, expect, it } from "vitest";
import { GET as getAvailability } from "@/app/api/availability/route";
import { prisma } from "@/src/lib/prisma";
import { nextWeekdayIsoDate } from "./helpers";

describe("availability API route (DB integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns DB-backed hour-based slots for seeded padel rental service", async () => {
    const date = nextWeekdayIsoDate(3);
    const request = new Request(
      `http://localhost:3000/api/availability?serviceId=padel-rental&date=${date}&durationMin=60`,
    );

    const response = await getAvailability(request);
    const payload = (await response.json()) as {
      meta?: { source?: string; slotGranularityMin?: number };
      service?: { id?: string; requiresCourt?: boolean };
      date?: string;
      slots?: Array<{ startTime: string; endTime: string; availableCourtIds: string[] }>;
      error?: string;
    };

    expect(response.status, payload.error).toBe(200);
    expect(payload.meta?.source).toBe("db-engine");
    expect(payload.meta?.slotGranularityMin).toBe(60);
    expect(payload.service?.id).toBe("padel-rental");
    expect(payload.service?.requiresCourt).toBe(true);
    expect(payload.date).toBe(date);
    expect((payload.slots?.length ?? 0) > 0).toBe(true);

    for (const slot of payload.slots ?? []) {
      expect(slot.startTime).toMatch(/^\d{2}:00$/);
      expect(slot.endTime).toMatch(/^\d{2}:00$/);
      expect(slot.availableCourtIds.length).toBeGreaterThan(0);
    }
  });
});
