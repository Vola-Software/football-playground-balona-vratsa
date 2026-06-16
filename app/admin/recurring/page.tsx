"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field { id: string; name: string; }

interface UserResult {
  id: string;
  email: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  teamName: string | null;
}

interface Occurrence {
  id: string;
  date: string;
  startTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REJECTED";
  teamAName: string | null;
  teamBName: string | null;
  isRecurrenceOverride: boolean;
}

interface RecurringSeries {
  id: string;
  fieldId: string;
  field: { id: string; name: string };
  dayOfWeek: number;
  startHour: number;
  startDate: string;
  endDate: string | null;
  teamAName: string | null;
  teamBName: string | null;
  isActive: boolean;
  guestName: string | null;
  guestPhone: string | null;
  user: { id: string; email: string; phone: string; firstName: string | null; lastName: string | null } | null;
  generatedBookings: Occurrence[];
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOW_LABELS = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

function todayStr() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Sofia" }).format(new Date());
}

function formatDate(isoDate: string) {
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatSlot(startTimeStr: string) {
  const d = new Date(startTimeStr);
  const h = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    hour: "2-digit",
    hour12: false,
  }).format(d);
  const date = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${date}, ${h}:00`;
}

function bookerLabel(s: RecurringSeries) {
  if (s.user) {
    const name = [s.user.firstName, s.user.lastName].filter(Boolean).join(" ");
    return name || s.user.email;
  }
  if (s.guestName) return `${s.guestName} (гост)`;
  return "—";
}

// ─── New series form ──────────────────────────────────────────────────────────

function NewSeriesForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [allUsers, setAllUsers] = useState<UserResult[]>([]);

  const [fieldId, setFieldId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startHour, setStartHour] = useState(19);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [bookerType, setBookerType] = useState<"user" | "guest">("user");
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/fields").then((r) => r.json()).then((data: Field[]) => {
      setFields(data);
      if (data.length > 0) setFieldId(data[0].id);
    });
    fetch("/api/admin/users").then((r) => r.json()).then(setAllUsers);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const userSuggestions = allUsers
    .filter((u) => {
      const q = userSearch.toLowerCase();
      if (q.length < 2) return false;
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        fullName.includes(q) ||
        (u.username?.toLowerCase().includes(q) ?? false) ||
        (u.teamName?.toLowerCase().includes(q) ?? false)
      );
    })
    .slice(0, 6);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldId) { setError("Изберете игрище."); return; }
    if (bookerType === "guest" && (!guestName.trim() || !guestPhone.trim())) {
      setError("Въведете имена и телефон на госта.");
      return;
    }
    if (bookerType === "user" && !selectedUser) {
      setError("Изберете потребител или превключете на 'Гост'.");
      return;
    }

    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      fieldId,
      dayOfWeek,
      startHour,
      startDate,
      endDate: endDate || undefined,
      teamAName: teamAName.trim() || undefined,
      teamBName: teamBName.trim() || undefined,
    };

    if (bookerType === "guest") {
      body.guestName = guestName.trim();
      body.guestPhone = guestPhone.trim();
    } else {
      body.targetUserId = selectedUser!.id;
    }

    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      onCreated();
    } else {
      const data = await res.json();
      setError(data.error ?? "Грешка при създаване на серията.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-green-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Нова повтаряща се резервация
      </h2>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Field + Day + Hour */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Игрище</label>
          <select
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ден от седмицата</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {DOW_LABELS.map((label, i) => (
              <option key={i} value={i}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Начален час</label>
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Start + End date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Начална дата <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            min={todayStr()}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Крайна дата{" "}
            <span className="text-gray-400 font-normal">(незадължително)</span>
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Booker */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Резервиращ</label>
        <div className="flex gap-2 mb-3">
          {(["user", "guest"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setBookerType(t);
                setSelectedUser(null);
                setUserSearch("");
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                bookerType === t
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              {t === "user" ? "👤 Регистриран потребител" : "📞 Гост (телефон)"}
            </button>
          ))}
        </div>

        {bookerType === "user" ? (
          <div ref={userSearchRef} className="relative">
            {selectedUser ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email}
                  </p>
                  <p className="text-xs text-gray-500">{selectedUser.email} · {selectedUser.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedUser(null); setUserSearch(""); }}
                  className="text-xs text-gray-400 hover:text-gray-700 ml-4"
                >
                  Смени
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Търсете по имейл, телефон или отбор..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {showUserDropdown && userSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {userSuggestions.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearch("");
                          setShowUserDropdown(false);
                          if (!teamAName && u.teamName) setTeamAName(u.teamName);
                        }}
                      >
                        <p className="text-sm font-medium text-gray-800">
                          {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                        </p>
                        <p className="text-xs text-gray-400">{u.email} · {u.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showUserDropdown && userSearch.length >= 2 && userSuggestions.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
                    Няма намерени потребители.
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Имена"
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+359 888 123 456"
                maxLength={20}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Отбор А (незадължително)</label>
          <input
            type="text"
            value={teamAName}
            onChange={(e) => setTeamAName(e.target.value)}
            maxLength={100}
            placeholder="напр. ФК Балона"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Отбор Б (незадължително)</label>
          <input
            type="text"
            value={teamBName}
            onChange={(e) => setTeamBName(e.target.value)}
            maxLength={100}
            placeholder="напр. ФК Враца"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Отказ
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Запазване..." : "Създай серията"}
        </button>
      </div>
    </form>
  );
}

// ─── Occurrence row ───────────────────────────────────────────────────────────

function OccurrenceRow({
  occurrence,
  seriesId,
  onUpdate,
}: {
  occurrence: Occurrence;
  seriesId: string;
  onUpdate: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const isActive = ["PENDING", "CONFIRMED"].includes(occurrence.status);

  async function cancelOccurrence() {
    if (!confirm("Отмени само тази среща от серията?")) return;
    setCancelling(true);
    await fetch(`/api/recurring/${seriesId}/occurrences/${occurrence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setCancelling(false);
    onUpdate();
  }

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-800 border-green-200",
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
    REJECTED: "bg-red-100 text-red-600 border-red-200",
  };
  const statusLabels: Record<string, string> = {
    CONFIRMED: "Потвърдена",
    PENDING: "В изчакване",
    CANCELLED: "Отменена",
    REJECTED: "Отхвърлена",
  };

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">
        {formatSlot(occurrence.startTime)}
        {occurrence.isRecurrenceOverride && (
          <span className="ml-1.5 text-[10px] text-indigo-500 font-medium">редактирана</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            statusColors[occurrence.status] ?? ""
          }`}
        >
          {statusLabels[occurrence.status] ?? occurrence.status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500">
        {occurrence.teamAName || occurrence.teamBName
          ? [occurrence.teamAName, occurrence.teamBName].filter(Boolean).join(" vs ")
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right">
        {isActive && (
          <button
            onClick={cancelOccurrence}
            disabled={cancelling}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium border bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border-gray-200 transition-colors disabled:opacity-50"
          >
            {cancelling ? "..." : "Отмени"}
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Series card ──────────────────────────────────────────────────────────────

function SeriesCard({
  series,
  onUpdate,
}: {
  series: RecurringSeries;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  async function deactivate() {
    if (!confirm("Деактивираш цялата серия. Вече генерираните резервации остават. Продължаваш?")) return;
    setDeactivating(true);
    await fetch(`/api/recurring/${series.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    setDeactivating(false);
    onUpdate();
  }

  const upcoming = series.generatedBookings.filter((b) =>
    ["PENDING", "CONFIRMED"].includes(b.status)
  );

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all ${
        series.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Status indicator */}
        <span
          className={`shrink-0 w-2 h-2 rounded-full ${
            series.isActive ? "bg-green-500" : "bg-gray-300"
          }`}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Игрище</p>
            <p className="text-gray-800 font-medium truncate">{series.field.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Разписание</p>
            <p className="text-gray-700">
              {DOW_LABELS[series.dayOfWeek]},{" "}
              {series.startHour.toString().padStart(2, "0")}:00
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Резервиращ</p>
            <p className="text-gray-700 truncate">{bookerLabel(series)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Период</p>
            <p className="text-gray-600 text-xs">
              {formatDate(series.startDate)}
              {series.endDate ? ` → ${formatDate(series.endDate)}` : " (без край)"}
            </p>
          </div>
        </div>

        {/* Badges + actions */}
        <div className="shrink-0 flex items-center gap-2">
          {series.isActive && upcoming.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {upcoming.length} предстоящи
            </span>
          )}
          {!series.isActive && (
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              Неактивна
            </span>
          )}

          {series.generatedBookings.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {expanded ? "Скрий" : "Срещи"}
            </button>
          )}

          {series.isActive && (
            <button
              onClick={deactivate}
              disabled={deactivating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {deactivating ? "..." : "Деактивирай"}
            </button>
          )}
        </div>
      </div>

      {/* Team names */}
      {(series.teamAName || series.teamBName) && (
        <div className="px-5 pb-3 -mt-1 text-xs text-gray-500">
          Отбори:{" "}
          <span className="font-medium text-gray-700">
            {[series.teamAName, series.teamBName].filter(Boolean).join(" vs ")}
          </span>
        </div>
      )}

      {/* Occurrences table */}
      {expanded && series.generatedBookings.length > 0 && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wide">
                <th className="text-left px-4 py-2">Дата / Час</th>
                <th className="text-left px-4 py-2">Статус</th>
                <th className="text-left px-4 py-2">Отбори</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {series.generatedBookings.map((occ) => (
                <OccurrenceRow
                  key={occ.id}
                  occurrence={occ}
                  seriesId={series.id}
                  onUpdate={onUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminRecurringPage() {
  const [seriesList, setSeriesList] = useState<RecurringSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/recurring");
    const data = await res.json();
    setSeriesList(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const visible = seriesList.filter((s) => showInactive || s.isActive);

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Повтарящи се резервации</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Серии, генериращи седмични резервации автоматично
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Покажи неактивни
          </label>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              + Нова серия
            </button>
          )}
        </div>
      </div>

      {/* New series form */}
      {showForm && (
        <NewSeriesForm
          onCreated={() => {
            setShowForm(false);
            fetchSeries();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Series list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Зареждане...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          {showInactive ? "Няма серии." : "Няма активни серии. Създайте първата с бутона по-горе."}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <SeriesCard key={s.id} series={s} onUpdate={fetchSeries} />
          ))}
        </div>
      )}
    </div>
  );
}
