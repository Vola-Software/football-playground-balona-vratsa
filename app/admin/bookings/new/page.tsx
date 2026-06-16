"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

interface SlotInfo {
  hour: number;
  status: "FREE" | "PENDING" | "CONFIRMED";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Sofia" }).format(new Date());
}

function hourLabel(h: number) {
  return `${h.toString().padStart(2, "0")}:00 – ${(h + 1).toString().padStart(2, "0")}:00`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminNewBookingPage() {
  const router = useRouter();

  // Form fields
  const [fieldId, setFieldId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [hour, setHour] = useState<number | "">("");
  const [bookerType, setBookerType] = useState<"user" | "guest">("user");
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [notes, setNotes] = useState("");

  // Data
  const [fields, setFields] = useState<Field[]>([]);
  const [allUsers, setAllUsers] = useState<UserResult[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [horizonDate, setHorizonDate] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);

  // ── Load fields and users on mount ──
  useEffect(() => {
    fetch("/api/fields")
      .then((r) => r.json())
      .then((data: Field[]) => {
        setFields(data);
        if (data.length > 0) setFieldId(data[0].id);
      });

    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setAllUsers);
  }, []);

  // ── Load slot availability when field or date changes ──
  useEffect(() => {
    if (!fieldId || !date) return;
    setSlotsLoading(true);
    setHour("");
    fetch(`/api/availability?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        const fieldData = data.fields?.find((f: { id: string }) => f.id === fieldId);
        setSlots(fieldData?.slots ?? []);
        setHorizonDate(data.horizonDate ?? "");
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [fieldId, date]);

  // ── Close user dropdown on outside click ──
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filtered user suggestions ──
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

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hour === "") { setError("Изберете час."); return; }
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
      date,
      hour,
      teamAName: teamAName.trim() || undefined,
      teamBName: teamBName.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (bookerType === "guest") {
      body.guestName = guestName.trim();
      body.guestPhone = guestPhone.trim();
    } else {
      body.targetUserId = selectedUser!.id;
    }

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin/bookings");
    } else {
      const data = await res.json();
      setError(data.error ?? "Грешка при резервацията.");
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/bookings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Резервации
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Нова резервация</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* ── Field + Date ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Игрище и дата
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Игрище
              </label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Дата
              </label>
              <input
                type="date"
                value={date}
                min={todayStr()}
                max={horizonDate || undefined}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Hour grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Час{" "}
              <span className="text-gray-400 font-normal">(изберете свободен)</span>
            </label>

            {slotsLoading ? (
              <div className="text-xs text-gray-400 py-2">Зареждане на наличността...</div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {slots.map((slot) => {
                  const isFree = slot.status === "FREE";
                  const isPending = slot.status === "PENDING";
                  const isSelected = hour === slot.hour;

                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      disabled={!isFree}
                      onClick={() => setHour(slot.hour)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? "bg-green-600 text-white border-green-600"
                          : isFree
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : isPending
                          ? "bg-yellow-50 text-yellow-600 border-yellow-200 cursor-not-allowed opacity-70"
                          : "bg-red-50 text-red-400 border-red-100 cursor-not-allowed opacity-60"
                      }`}
                    >
                      {slot.hour.toString().padStart(2, "0")}:00
                      {isPending && <span className="block text-[10px] leading-none mt-0.5">В изчакване</span>}
                      {!isFree && !isPending && <span className="block text-[10px] leading-none mt-0.5">Заето</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {hour !== "" && (
              <p className="text-sm text-green-700 mt-2 font-medium">
                Избран: {hourLabel(hour as number)}
              </p>
            )}
          </div>
        </section>

        {/* ── Booker ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Резервиращ
          </h2>

          {/* Type toggle */}
          <div className="flex gap-2">
            {(["user", "guest"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setBookerType(t);
                  setSelectedUser(null);
                  setUserSearch("");
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
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
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedUser.firstName || selectedUser.lastName
                        ? [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ")
                        : selectedUser.email}
                      {selectedUser.username && (
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">
                          @{selectedUser.username}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedUser.email} · {selectedUser.phone}
                      {selectedUser.teamName && ` · ${selectedUser.teamName}`}
                    </p>
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
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Търсете по имейл, телефон или отбор..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {showUserDropdown && userSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {userSuggestions.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSearch("");
                            setShowUserDropdown(false);
                            if (!teamAName && u.teamName) setTeamAName(u.teamName);
                          }}
                        >
                          <p className="text-sm font-medium text-gray-800">
                            {u.firstName || u.lastName
                              ? [u.firstName, u.lastName].filter(Boolean).join(" ")
                              : u.email}
                            {u.username && (
                              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                @{u.username}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {u.email} · {u.phone}
                            {u.teamName && ` · ${u.teamName}`}
                          </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Имена <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required={bookerType === "guest"}
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required={bookerType === "guest"}
                  maxLength={20}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+359 888 123 456"
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Optional details ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Допълнителни данни{" "}
            <span className="text-gray-400 text-xs font-normal normal-case">
              (незадължително)
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Отбор А
              </label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="напр. ФК Балона"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Отбор Б
              </label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="напр. ФК Враца"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Бележки за администратора
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Вътрешна бележка (не се вижда от потребителя)..."
            />
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Link
            href="/admin/bookings"
            className="flex-1 text-center border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Отказ
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Запазване..." : "Запази резервацията"}
          </button>
        </div>
      </form>
    </div>
  );
}
