"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RejectModal from "@/components/admin/reject-modal";
import { Suspense } from "react";

const TZ = "Europe/Sofia";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "В изчакване",
  CONFIRMED: "Потвърдена",
  REJECTED: "Отхвърлена",
  CANCELLED: "Отменена",
};

const STATUS_CLASSES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatSlot(startTimeStr: string) {
  const d = new Date(startTimeStr);
  const h = new Intl.DateTimeFormat("bg-BG", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  }).format(d);
  const date = new Intl.DateTimeFormat("bg-BG", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${date}, ${h}:00`;
}

interface Booking {
  id: string;
  startTime: string;
  status: BookingStatus;
  source: string;
  teamAName: string | null;
  teamBName: string | null;
  notes: string | null;
  guestName: string | null;
  guestPhone: string | null;
  rejectionReason: string | null;
  field: { id: string; name: string };
  user?: { id: string; email: string; phone: string; teamName: string | null } | null;
}

function BookingsTable() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusFilter = searchParams.get("status") ?? "";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/bookings${qs}`);
    const data = await res.json();
    setBookings(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function doAction(id: string, action: "approve" | "cancel") {
    setActionLoading(id + action);
    await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
    setActionLoading(null);
    fetchBookings();
  }

  function setStatus(val: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (val) p.set("status", val);
    else p.delete("status");
    router.replace(`/admin/bookings?${p.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["", "PENDING", "CONFIRMED", "REJECTED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {s === "" ? "Всички" : STATUS_LABELS[s as BookingStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          Зареждане...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-10 text-center text-gray-400 text-sm">
          Няма резервации.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-600 text-xs font-medium uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Дата / Час</th>
                  <th className="text-left px-4 py-3">Игрище</th>
                  <th className="text-left px-4 py-3">Потребител</th>
                  <th className="text-left px-4 py-3">Отбори</th>
                  <th className="text-left px-4 py-3">Статус</th>
                  <th className="text-right px-4 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-gray-700 capitalize whitespace-nowrap">
                      {formatSlot(b.startTime)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {b.field.name}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 truncate max-w-[160px]">
                        {b.user?.email ?? b.guestName ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {b.user?.phone ?? b.guestPhone ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {b.teamAName || b.teamBName
                        ? [b.teamAName, b.teamBName].filter(Boolean).join(" vs ")
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_CLASSES[b.status]
                        }`}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                      {b.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5 max-w-[140px] truncate" title={b.rejectionReason}>
                          {b.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {b.status === "PENDING" && (
                        <span className="inline-flex gap-1.5">
                          <ActionBtn
                            label="Одобри"
                            color="green"
                            loading={actionLoading === b.id + "approve"}
                            onClick={() => doAction(b.id, "approve")}
                          />
                          <ActionBtn
                            label="Откажи"
                            color="red"
                            loading={actionLoading === b.id + "reject"}
                            onClick={() => setRejectTarget(b.id)}
                          />
                        </span>
                      )}
                      {b.status === "CONFIRMED" && (
                        <ActionBtn
                          label="Отмени"
                          color="gray"
                          loading={actionLoading === b.id + "cancel"}
                          onClick={() => doAction(b.id, "cancel")}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          bookingId={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={() => {
            setRejectTarget(null);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}

function ActionBtn({
  label,
  color,
  loading,
  onClick,
}: {
  label: string;
  color: "green" | "red" | "gray";
  loading: boolean;
  onClick: () => void;
}) {
  const colors = {
    green: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
    red: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
    gray: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? "..." : label}
    </button>
  );
}

export default function AdminBookingsPage() {
  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Резервации</h1>
      <Suspense fallback={<div className="text-sm text-gray-400">Зареждане...</div>}>
        <BookingsTable />
      </Suspense>
    </div>
  );
}
