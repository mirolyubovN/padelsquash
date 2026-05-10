export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.ENABLE_TELEGRAM_VERIFY_BOT !== "false") {
    const { startTelegramVerifyBot } = await import("@/src/lib/notifications/telegram-verify-bot");
    startTelegramVerifyBot();
  }

  const { startDailyDigestScheduler } = await import("@/src/lib/notifications/daily-digest-scheduler");
  startDailyDigestScheduler();
}
