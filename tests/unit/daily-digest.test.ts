import { describe, expect, it } from "vitest";
import { __dailyDigestForTests } from "@/src/lib/notifications/daily-digest";

describe("daily digest formatting", () => {
  it("builds common and trainer digest messages", () => {
    const booking = {
      id: "b1",
      startAt: new Date("2026-05-11T04:00:00.000Z"),
      endAt: new Date("2026-05-11T05:00:00.000Z"),
      activityLabel: "Клиент Тест",
      customerName: "Клиент Тест",
      sportName: "Падел",
      courtNames: ["Падел 1"],
      instructorIds: ["i1"],
      instructorNames: ["Тренер Тест"],
    };

    const common = __dailyDigestForTests.buildCommonDigest("2026-05-11", [booking]);
    const trainer = __dailyDigestForTests.buildTrainerDigest("2026-05-11", [booking]);

    expect(common).toContain("Расписание на завтра");
    expect(common).toContain("Тренер Тест - 1 тренировок");
    expect(common).toContain("Клиент Тест");
    expect(trainer).toContain("у вас 1 тренировок");
    expect(trainer).toContain("Падел 1");
  });

  it("includes trainer-associated events in common and trainer digests", () => {
    const event = {
      id: "e1",
      startAt: new Date("2026-05-11T06:00:00.000Z"),
      endAt: new Date("2026-05-11T07:30:00.000Z"),
      activityLabel: "Групповая тренировка (6 участников)",
      customerName: "Групповая тренировка",
      sportName: "Сквош",
      courtNames: ["Сквош 1"],
      instructorIds: ["i2"],
      instructorNames: ["Тренер Событий"],
    };

    const common = __dailyDigestForTests.buildCommonDigest("2026-05-11", [event]);
    const trainer = __dailyDigestForTests.buildTrainerDigest("2026-05-11", [event]);

    expect(common).toContain("Тренер Событий - 1 тренировок");
    expect(common).toContain("Групповая тренировка (6 участников)");
    expect(trainer).toContain("Групповая тренировка (6 участников)");
    expect(trainer).toContain("Сквош 1");
  });

  it("renders empty trainer digest explicitly", () => {
    expect(__dailyDigestForTests.buildTrainerDigest("2026-05-11", [])).toBe("Завтра тренировок нет.");
  });
});
