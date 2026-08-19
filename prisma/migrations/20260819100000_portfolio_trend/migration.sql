CREATE TABLE "PortfolioTrend" (
    "id" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "consumed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "recharged" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioTrend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortfolioTrend_week_key" ON "PortfolioTrend"("week");
