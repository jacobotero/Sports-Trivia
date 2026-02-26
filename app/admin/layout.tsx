import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen">
      {/* Admin top bar */}
      <div className="border-b border-border bg-card/60 px-4 py-2 flex items-center gap-4 text-sm">
        <span className="font-semibold text-primary">Admin Hub</span>
        <nav className="flex items-center gap-3 text-muted-foreground">
          <Link href="/admin/questions" className="hover:text-foreground transition-colors">
            Questions
          </Link>
          <Link href="/admin/schedule" className="hover:text-foreground transition-colors">
            Schedule
          </Link>
        </nav>
        <div className="ml-auto">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Back to App
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
