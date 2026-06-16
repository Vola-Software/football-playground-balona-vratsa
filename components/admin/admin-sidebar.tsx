"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Табло", icon: "📊", exact: true },
  { href: "/admin/bookings", label: "Резервации", icon: "📅", exact: false },
  { href: "/admin/recurring", label: "Повтарящи", icon: "🔁", exact: false },
  { href: "/admin/users", label: "Потребители", icon: "👥", exact: false },
  { href: "/admin/fields", label: "Игрища", icon: "⚽", exact: false },
  { href: "/admin/settings", label: "Настройки", icon: "⚙️", exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 bg-gray-900 min-h-[calc(100vh-56px)] flex flex-col p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3 mt-1">
        Администрация
      </p>
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-green-700 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
