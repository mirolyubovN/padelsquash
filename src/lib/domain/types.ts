export type UserRole = "customer" | "trainer" | "admin" | "super_admin";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type BookingResourceType = "court" | "instructor";

export type ScheduleResourceType = "venue" | "court" | "instructor";

export type ScheduleExceptionType = "closed" | "maintenance";
export type PricingTier = "morning" | "day" | "evening_weekend";
export type PriceComponentType = "court" | "instructor";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ServiceRecord {
  id: string;
  name: string;
  sport: string;
  requiresCourt: boolean;
  requiresInstructor: boolean;
  active: boolean;
}

export interface OpeningHourRecord {
  dayOfWeek: Weekday;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export interface ResourceScheduleRecord {
  resourceType: Exclude<ScheduleResourceType, "venue">;
  resourceId: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface ScheduleExceptionRecord {
  resourceType: ScheduleResourceType;
  resourceId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  type: ScheduleExceptionType;
  note?: string;
}

export interface ExistingBookingRecord {
  id: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  resourceLinks: Array<{
    resourceType: BookingResourceType;
    resourceId: string;
  }>;
}

export interface ComponentPriceRecord {
  id: string;
  sport: string;
  componentType: PriceComponentType;
  tier: PricingTier;
  currency: string;
  amount: number;
}
