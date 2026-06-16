export const metadata = { title: "Настройки — Администрация" };

export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Настройки</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        Настройките (хоризонт за резервации, стандартни часове, проверка на
        конфликти) се добавят в стъпка 10.
      </div>
    </div>
  );
}
