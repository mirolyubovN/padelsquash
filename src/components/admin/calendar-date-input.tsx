"use client";

import { useRouter } from "next/navigation";

interface Props {
  date: string;
  locationSlug?: string;
}

export function CalendarDateInput({ date, locationSlug }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    const q = new URLSearchParams({ date: newDate });
    if (locationSlug) q.set("location", locationSlug);
    router.push(`/admin/calendar?${q.toString()}`);
  }

  return (
    <input
      type="date"
      lang="ru-RU"
      defaultValue={date}
      className="admin-form__field admin-calendar__date-input"
      onChange={handleChange}
    />
  );
}
