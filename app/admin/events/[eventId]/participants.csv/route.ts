import { assertAdmin } from "@/src/lib/auth/guards";
import { getEventParticipants } from "@/src/lib/events/service";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | Date | null): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  await assertAdmin();
  const { eventId } = await context.params;
  const participants = await getEventParticipants(eventId);

  const header = [
    "registrationId",
    "customerId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "status",
    "pricePaidKzt",
    "createdAt",
    "cancelledAt",
  ];
  const rows = participants.map((participant) => [
    participant.registrationId,
    participant.customerId,
    participant.customerName,
    participant.customerEmail,
    participant.customerPhone,
    participant.status,
    participant.pricePaidKzt,
    participant.createdAt,
    participant.cancelledAt,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(`\uFEFF${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${eventId}-participants.csv"`,
    },
  });
}
