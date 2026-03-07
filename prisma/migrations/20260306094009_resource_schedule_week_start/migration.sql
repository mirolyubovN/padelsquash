-- DropIndex
DROP INDEX "Location_active_sortOrder_idx";

-- RenameIndex
ALTER INDEX "ComponentPrice_locationId_sportId_componentType_period_currency" RENAME TO "ComponentPrice_locationId_sportId_componentType_period_curr_key";
