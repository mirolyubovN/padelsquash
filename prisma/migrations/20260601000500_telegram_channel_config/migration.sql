CREATE TABLE "TelegramChannelConfig" (
  "key" TEXT NOT NULL DEFAULT 'default',
  "commonChatId" TEXT,
  "commonChatTitle" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedByUserId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramChannelConfig_pkey" PRIMARY KEY ("key")
);
