import { prisma } from "@/lib/prisma";

export const metadata = { title: "Игрища — Администрация" };

export default async function AdminFieldsPage() {
  const fields = await prisma.field.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Игрища</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Ред</th>
              <th className="text-left px-4 py-3">Активно</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fields.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{f.name}</td>
                <td className="px-4 py-3 text-gray-500">{f.sortOrder}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {f.isActive ? "Активно" : "Неактивно"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Пълното управление на игрищата се добавя в стъпка 10.
      </p>
    </div>
  );
}
