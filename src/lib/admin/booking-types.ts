// Client-safe: no server-only imports. Imported by both server code and client components.

export type AdminBookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show";
export type AdminPaymentStatus = "none" | "unpaid" | "paid" | "failed" | "refunded";
export type AdminBookingSort = "date_asc" | "date_desc";

export const ADMIN_BOOKING_STATUS_LABELS: Record<AdminBookingStatus, string> = {
  pending_payment: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
  no_show: "Неявка",
};

export const ADMIN_PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  none: "—",
  unpaid: "Не оплачено",
  paid: "Оплачено",
  failed: "Ошибка оплаты",
  refunded: "Возврат",
};

export interface AdminBookingFilters {
  page: number;
  pageSize: number;
  bookingId?: string;
  customerEmail?: string;
  q?: string;
  status?: AdminBookingStatus;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: AdminBookingSort;
}

export interface AdminBookingHistoryItem {
  id: string;
  action: string;
  actionLabel: string;
  occurredAtLabel: string;
  actorLabel: string;
  detailSummary: string | null;
}

export interface AdminBookingRow {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  serviceSport: string;
  serviceSportName: string;
  requiresCourt: boolean;
  locationId: string;
  locationSlug: string;
  courtIds: string[];
  date: string;
  dateIso: string;
  time: string;
  startAtIso: string;
  endAtIso: string;
  status: AdminBookingStatus;
  statusLabel: string;
  paymentStatus: AdminPaymentStatus;
  paymentStatusLabel: string;
  paymentProvider: string;
  amountKzt: string;
  amountRaw: number;
  currency: string;
  courtLabels: string[];
  instructorLabels: string[];
  pricingBreakdownLines: string[];
  historyItems: AdminBookingHistoryItem[];
}

export interface AdminBookingListResult {
  rows: AdminBookingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
