"use client";

import { useState, useEffect, useRef } from "react";

interface BookingModalProps {
  fieldId: string;
  fieldName: string;
  date: string; // YYYY-MM-DD
  hour: number;
  onClose: () => void;
  onSuccess: () => void;
}

function formatSlotBg(date: string, hour: number): string {
  const dateLabel = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));

  const h = hour.toString().padStart(2, "0");
  const hNext = (hour + 1).toString().padStart(2, "0");

  return `${dateLabel}, ${h}:00 – ${hNext}:00`;
}

export default function BookingModal({
  fieldId,
  fieldName,
  date,
  hour,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId,
          date,
          hour,
          teamAName: teamAName.trim() || undefined,
          teamBName: teamBName.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Грешка при резервацията.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch {
      setError("Грешка при свързване. Моля, опитайте отново.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Резервирай час</h2>
            <p className="text-sm text-gray-500 mt-0.5">{fieldName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Затвори"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Slot summary */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-sm font-medium text-green-800 capitalize">
              {formatSlotBg(date, hour)}
            </p>
          </div>

          {success ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-base font-semibold text-gray-800">
                Резервацията е регистрирана!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Ще получите потвърждение скоро.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Отбор А{" "}
                    <span className="text-gray-400 font-normal">(по желание)</span>
                  </label>
                  <input
                    type="text"
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                    maxLength={100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                    placeholder="напр. ФК Балона"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Отбор Б{" "}
                    <span className="text-gray-400 font-normal">(по желание)</span>
                  </label>
                  <input
                    type="text"
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                    maxLength={100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                    placeholder="напр. ФК Враца"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Бележка{" "}
                  <span className="text-gray-400 font-normal">(по желание)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none"
                  placeholder="Допълнителна информация..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Изпращане..." : "Резервирай"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
