import { APP_TIMEZONE } from "@/src/lib/time/venue-timezone";
import { runDailyDigest } from "@/src/lib/notifications/daily-digest";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

class DailyDigestScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  start() {
    if (process.env.ENABLE_DAILY_DIGEST === "false") {
      console.info("[daily-digest] Scheduler disabled");
      return;
    }
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext() {
    if (!this.running) return;
    this.timer = setTimeout(() => void this.tick(), getDelayUntilNextDigest());
  }

  private async tick() {
    try {
      await runDailyDigest(new Date());
    } catch (error) {
      console.error("[daily-digest] Failed to run digest", { error });
    } finally {
      this.scheduleNext();
    }
  }
}

function getDigestHour(): number {
  const value = Number(process.env.DAILY_DIGEST_HOUR ?? 21);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : 21;
}

function getVenueHour(now: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(formatted);
}

function getVenueMinute(now: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    minute: "2-digit",
  }).format(now);
  return Number(formatted);
}

export function getDelayUntilNextDigest(now = new Date()): number {
  const digestHour = getDigestHour();
  const venueHour = getVenueHour(now);
  const venueMinute = getVenueMinute(now);
  let minutesUntil = (digestHour - venueHour) * 60 - venueMinute;
  if (minutesUntil <= 0) {
    minutesUntil += 24 * 60;
  }
  return Math.min(Math.max(minutesUntil * MINUTE_MS, MINUTE_MS), DAY_MS);
}

declare global {
  var __padelsquashDailyDigestScheduler: DailyDigestScheduler | undefined;
}

export function startDailyDigestScheduler() {
  globalThis.__padelsquashDailyDigestScheduler ??= new DailyDigestScheduler();
  globalThis.__padelsquashDailyDigestScheduler.start();
}
