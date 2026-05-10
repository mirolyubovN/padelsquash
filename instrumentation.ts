export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.ENABLE_TELEGRAM_VERIFY_BOT === "false") {
    return;
  }

  const { startTelegramVerifyBot } = await import("@/src/lib/notifications/telegram-verify-bot");
  startTelegramVerifyBot();
}

