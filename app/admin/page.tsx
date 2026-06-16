import { prisma } from "@/lib/prisma";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import Link from "next/link";

const TZ = "Europe/Sofia";

function formatTime(d: Date) {
  const h = toZonedTime(d, TZ).getHours();
  return `${h.toString().padStart(2, "0")}:00`;
}

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "В изчакване",
  CONFIRMED: "Потвърдена",
  REJECTED: "Отхвърлена",
  CANCELLED: "Отменена",
};

const STATUS_CLASSES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default async function AdminDashboard() {
  const now = new Date();
  const todayStr = format(toZonedTime(now, TZ), "yyyy-MM-dd");
  const dayStartUtc = fromZonedTime(`${todayStr}T00:00:00`, TZ);
  const dayEndUtc = fromZonedTime(`${todayStr}T23:59:59`, TZ);

  const [pendingCount, todayBookings, totalUsers] = await Promise.all([
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.findMany({
      where: {
        startTime: { gte: dayStartUtc, lte: dayEndUtc },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        field: { select: { name: true } },
        user: { select: { email: true, teamName: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900">Табло</h1>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Чакащи одобрение"
          value={pendingCount}
          color="amber"
          href="/admin/bookings?status=PENDING"
        />
        <StatCard
          label="Резервации днес"
          value={todayBookings.length}
          color="green"
          href="/admin/bookings"
        />
        <StatCard
          label="Активни потребители"
          value={totalUsers}
          color="blue"
          href="/admin/users"
        />
      </div>

      {/* ── Today's schedule ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Програма за днес —{" "}
          <span className="capitalize font-normal text-gray-500">
            {new Intl.DateTimeFormat("bg-BG", {
              timeZone: TZ,
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
          </span>
        </h2>

        {todayBookings.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-8 text-center text-gray-400 text-sm">
            Няма резервации за днес.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                    Час
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                    Игрище
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                    Потребител / Отбори
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayBookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {formatTime(b.startTime)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.field.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{b.user?.teamName ?? b.user?.email ?? b.guestName ?? "—"}</div>
                      {(b.teamAName || b.teamBName) && (
                        <div className="text-xs text-gray-400">
                          {[b.teamAName, b.teamBName].filter(Boolean).join(" vs ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_CLASSES[b.status as BookingStatus]
                        }`}
                      >
                        {STATUS_LABELS[b.status as BookingStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">
            {pendingCount} резервация{pendingCount > 1 ? "и" : ""} чака{pendingCount === 1 ? "" : "т"} вашето одобрение.
          </p>
          <Link
            href="/admin/bookings?status=PENDING"
            className="text-sm font-semibold text-amber-900 hover:underline"
          >
            Прегледай →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: "amber" | "green" | "blue";
  href: string;
}) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <Link
      href={href}
      className={`border rounded-xl px-5 py-4 hover:shadow-sm transition-shadow ${colors[color]}`}
    >
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </Link>
  );
}
