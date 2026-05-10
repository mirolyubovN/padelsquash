export type TrainerDmEvent = "created" | "cancelled";

const CANCEL_PAST_GRACE_HOURS = 24;

function readHorizonHours(event: TrainerDmEvent): number {
  const raw =
    event === "created"
      ? process.env.TRAINER_DM_CREATE_HORIZON_HOURS
      : process.env.TRAINER_DM_CANCEL_HORIZON_HOURS;
  const fallback = event === "created" ? 48 : 168;
  const value = Number(raw ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export function shouldDmTrainersForEvent(args: {
  event: TrainerDmEvent;
  bookingStartAt: Date;
  now: Date;
}): boolean {
  const hoursUntilStart = (args.bookingStartAt.getTime() - args.now.getTime()) / 3_600_000;
  const horizon = readHorizonHours(args.event);
  if (horizon <= 0) return false;

  if (args.event === "created") {
    if (hoursUntilStart < 0) return false;
    return hoursUntilStart <= horizon;
  }

  if (hoursUntilStart < -CANCEL_PAST_GRACE_HOURS) return false;
  return hoursUntilStart <= horizon;
}
