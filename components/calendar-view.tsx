"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { AvailabilityData, SlotInfo } from "@/lib/availability";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayInSofia(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateBg(dateStr: string): string {
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateStr}T12:00:00`));
}

function addDay(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE");
}

// ─── Slot cell ────────────────────────────────────────────────────────────────

interface SlotCellProps {
  slot: SlotInfo;
  isPast: boolean;
  isBeyondHorizon: boolean;
  isLoggedIn: boolean;
  onBook: (hour: number) => void;
}

function SlotCell({ slot, isPast, isBeyondHorizon, isLoggedIn, onBook }: SlotCellProps) {
  const canBook = slot.status === "FREE" && !isPast && !isBeyondHorizon;

  let bg = "";
  let text = "";
  let label = "";
  let cursor = "cursor-default";

  if (slot.status === "CONFIRMED") {
    bg = "bg-red-100 border-red-200";
    text = "text-red-700";
    label = "Заето";
  } else if (slot.status === "PENDING") {
    bg = "bg-amber-100 border-amber-200";
    text = "text-amber-700";
    label = "В изчакване";
  } else if (isPast) {
    bg = "bg-gray-100 border-gray-200";
    text = "text-gray-400";
    label = "—";
  } else if (isBeyondHorizon) {
    bg = "bg-gray-50 border-gray-200";
    text = "text-gray-400";
    label = "Недостъпен";
  } else if (slot.isOutsideDefaultWindow) {
    bg = canBook
      ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
      : "bg-gray-50 border-gray-200";
    text = "text-gray-500";
    label = "Свободен";
    cursor = canBook ? "cursor-pointer" : "cursor-default";
  } else {
    bg = canBook
      ? "bg-green-50 border-green-200 hover:bg-green-100"
      : "bg-green-50 border-green-200";
    text = "text-green-700";
    label = "Свободен";
    cursor = canBook ? "cursor-pointer" : "cursor-default";
  }

  if (canBook && isLoggedIn) {
    return (
      <button
        onClick={() => onBook(slot.hour)}
        className={`w-full rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${bg} ${text} ${cursor}`}
        title={`Резервирай ${slot.hour.toString().padStart(2, "0")}:00`}
      >
        {label}
      </button>
    );
  }

  if (canBook && !isLoggedIn) {
    return (
      <Link
        href="/login"
        className={`block w-full rounded-lg border px-2 py-2 text-xs font-medium text-center transition-colors ${bg} ${text} cursor-pointer`}
        title="Влезте за да резервирате"
      >
        {label}
      </Link>
    );
  }

  return (
    <div
      className={`w-full rounded-lg border px-2 py-2 text-xs font-medium text-center ${bg} ${text}`}
    >
      {label}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid gap-3 items-center" style={{ gridTemplateColumns: "56px 1fr 1fr" }}>
          <div className="h-4 bg-gray-200 rounded ml-auto w-10" />
          <div className="h-9 bg-gray-200 rounded-lg" />
          <div className="h-9 bg-gray-200 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CalendarViewProps {
  /** Called when a free slot is clicked */
  onBookSlot?: (fieldId: string, fieldName: string, hour: number, date: string) => void;
  /** Increment to force a calendar refresh after a booking */
  refreshKey?: number;
}

export default function CalendarView({ onBookSlot, refreshKey = 0 }: CalendarViewProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [selectedDate, setSelectedDate] = useState(todayInSofia);
  const [showAllHours, setShowAllHours] = useState(false);
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayInSofia();

  const fetchAvailability = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/availability?date=${date}`);
      if (!res.ok) throw new Error("Грешка от сървъра");
      const json: AvailabilityData = await res.json();
      setData(json);
    } catch {
      setError("Неуспешно зареждане на наличността. Моля, опитайте отново.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability, refreshKey]);

  function navigate(days: number) {
    const next = addDay(selectedDate, days);
    if (data && days > 0 && next > data.horizonDate) return;
    if (days < 0 && next < today) return;
    setSelectedDate(next);
  }

  const canGoPrev = selectedDate > today;
  const canGoNext = !data || addDay(selectedDate, 1) <= data.horizonDate;

  const hoursToShow = data
    ? showAllHours
      ? Array.from({ length: 24 }, (_, i) => i)
      : Array.from(
          { length: data.displayEndHour - data.displayStartHour + 1 },
          (_, i) => i + data.displayStartHour
        )
    : [];

  const hasOutsideWindow = data
    ? data.fields.some((f) =>
        f.slots.some(
          (s) => s.isOutsideDefaultWindow && (s.status !== "FREE" || (!data.isPast && !data.isBeyondHorizon))
        )
      )
    : false;

  return (
    <div className="space-y-4">
      {/* ── Date navigation ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoPrev}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Предишен ден"
        >
          ←
        </button>

        <button
          onClick={() => setSelectedDate(today)}
          disabled={selectedDate === today}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Днес
        </button>

        <button
          onClick={() => navigate(1)}
          disabled={!canGoNext}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Следващ ден"
        >
          →
        </button>

        <input
          type="date"
          value={selectedDate}
          min={today}
          max={data?.horizonDate}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <span className="text-sm font-medium text-gray-700 capitalize">
          {formatDateBg(selectedDate)}
        </span>

        {data?.isBeyondHorizon && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            Извън хоризонта за резервации
          </span>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <CalendarSkeleton />
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => fetchAvailability(selectedDate)}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Опитай отново
          </button>
        </div>
      ) : data && data.fields.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Няма активни игрища.
        </div>
      ) : data ? (
        <div className="overflow-x-auto">
          <div
            className="min-w-[300px]"
            style={{
              display: "grid",
              gridTemplateColumns: `56px repeat(${data.fields.length}, 1fr)`,
              gap: "8px",
            }}
          >
            {/* Header row */}
            <div /> {/* time label spacer */}
            {data.fields.map((field) => (
              <div
                key={field.id}
                className="text-center text-sm font-semibold text-gray-700 pb-1 border-b border-gray-200"
              >
                {field.name}
              </div>
            ))}

            {/* Slot rows */}
            {hoursToShow.map((hour) => (
              <>
                {/* Time label */}
                <div
                  key={`t-${hour}`}
                  className="text-right text-xs text-gray-400 pr-1 pt-2.5"
                >
                  {hour.toString().padStart(2, "0")}:00
                </div>

                {/* Slot cells for each field */}
                {data.fields.map((field) => (
                  <SlotCell
                    key={`${field.id}-${hour}`}
                    slot={field.slots[hour]}
                    isPast={data.isPast}
                    isBeyondHorizon={data.isBeyondHorizon}
                    isLoggedIn={isLoggedIn}
                    onBook={(h) => onBookSlot?.(field.id, field.name, h, selectedDate)}
                  />
                ))}
              </>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Show all hours toggle ── */}
      {data && !loading && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={() => setShowAllHours((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-700 underline hover:no-underline transition-colors"
          >
            {showAllHours
              ? "Покажи само стандартните часове"
              : "Покажи всички часове (0–23)"}
          </button>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-200" />
              Свободен
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-200" />
              В изчакване
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200" />
              Заето
            </span>
          </div>
        </div>
      )}

      {/* ── Auth nudge for guests ── */}
      {!isLoggedIn && data && !data.isPast && !data.isBeyondHorizon && (
        <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Влезте
          </Link>{" "}
          или{" "}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            регистрирайте се
          </Link>
          , за да резервирате час.
        </p>
      )}
    </div>
  );
}
