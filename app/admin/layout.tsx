import { requireAdmin } from "@/lib/auth-helpers";
import AdminSidebar from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Администрация — Балона Враца",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard (proxy.ts already blocks, this is a belt-and-suspenders check)
  await requireAdmin();

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
    </div>
  );
}
