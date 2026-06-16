import { prisma } from "@/lib/prisma";
import ToggleSwitch from "@/components/admin/toggle-switch";
import { format } from "date-fns";

export const metadata = { title: "Потребители — Администрация" };

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      username: true,
      teamName: true,
      role: true,
      canBookDirectly: true,
      isActive: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Потребители{" "}
          <span className="text-base font-normal text-gray-400">
            ({users.length})
          </span>
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-600 text-xs font-medium uppercase tracking-wide">
                <th className="text-left px-4 py-3">Потребител</th>
                <th className="text-left px-4 py-3">Телефон</th>
                <th className="text-left px-4 py-3">Отбор</th>
                <th className="text-left px-4 py-3">Роля</th>
                <th className="text-center px-4 py-3">Директна резервация</th>
                <th className="text-center px-4 py-3">Активен</th>
                <th className="text-right px-4 py-3">Резервации</th>
                <th className="text-right px-4 py-3">Регистриран</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className={`${!u.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    {(u.firstName || u.lastName) && (
                      <p className="font-medium text-gray-800">
                        {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                        {u.username && (
                          <span className="ml-1.5 text-xs text-gray-400 font-normal">
                            @{u.username}
                          </span>
                        )}
                      </p>
                    )}
                    <p className={`text-gray-${u.firstName ? "400" : "800"} ${u.firstName ? "text-xs" : "font-medium"}`}>
                      {u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {u.phone}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.teamName ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.role === "ADMIN" ? "Администратор" : "Потребител"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      userId={u.id}
                      field="canBookDirectly"
                      initialValue={u.canBookDirectly}
                      label="Директна резервация"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      userId={u.id}
                      field="isActive"
                      initialValue={u.isActive}
                      label="Активен акаунт"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {u._count.bookings}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {format(u.createdAt, "dd.MM.yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        <strong>Директна резервация</strong> — ако е включена, потребителят
        получава потвърждение веднага без одобрение от администратора.
      </p>
    </div>
  );
}
