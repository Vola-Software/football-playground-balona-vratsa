import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";

export const metadata = {
  title: "Моите резервации — Балона Враца",
};

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

function formatSlot(startTime: Date): string {
  const sofia = toZonedTime(startTime, TZ);
  const hour = sofia.getHours();
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(startTime) + `, ${hour.toString().padStart(2, "0")}:00 – ${(hour + 1).toString().padStart(2, "0")}:00`;
}

export default async function AccountPage() {
  const user = await requireAuth();

  const allBookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { field: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });

  const now = new Date();
  const upcoming = allBookings.filter(
    (b) => b.startTime >= now && !["REJECTED", "CANCELLED"].includes(b.status)
  );
  const past = allBookings.filter(
    (b) => b.startTime < now || ["REJECTED", "CANCELLED"].includes(b.status)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Моите резервации</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.name ?? user.email}
        </p>
      </div>

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Предстоящи{" "}
          {upcoming.length > 0 && (
            <span className="text-xs font-normal text-gray-400">
              ({upcoming.length})
            </span>
          )}
        </h2>

        {upcoming.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-6 py-8 text-center text-gray-400 text-sm">
            Нямате предстоящи резервации.{" "}
            <Link href="/" className="text-green-600 hover:underline">
              Резервирайте час
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {/* Past / cancelled / rejected */}
      {past.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Минали и неактивни{" "}
            <span className="text-xs font-normal text-gray-400">
              ({past.length})
            </span>
          </h2>
          <div className="space-y-3">
            {past
              .slice()
              .reverse()
              .map((b) => (
                <BookingCard key={b.id} booking={b} dimmed />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Booking card ──────────────────────────────────────────────────────────────

type BookingWithField = Awaited<
  ReturnType<typeof prisma.booking.findMany>
>[number] & { field: { name: string } };

function BookingCard({
  booking: b,
  dimmed = false,
}: {
  booking: BookingWithField;
  dimmed?: boolean;
}) {
  const status = b.status as BookingStatus;

  return (
    <div
      className={`bg-white border rounded-xl px-5 py-4 transition-opacity ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{b.field.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">
            {formatSlot(b.startTime)}
          </p>
          {(b.teamAName || b.teamBName) && (
            <p className="text-xs text-gray-400 mt-1">
              {[b.teamAName, b.teamBName].filter(Boolean).join(" vs ")}
            </p>
          )}
          {b.rejectionReason && (
            <p className="text-xs text-red-500 mt-1">
              Причина: {b.rejectionReason}
            </p>
          )}
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CLASSES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {status === "PENDING" && (
        <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg px-3 py-1.5">
          Резервацията чака одобрение от администратора.
        </p>
      )}
    </div>
  );
}
