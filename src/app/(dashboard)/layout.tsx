import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
