import { AppShell } from "@/components/layout/AppShell";
import { requireOnboardedUser } from "@/lib/session";
import { getStats } from "@/lib/state";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const stats = await getStats(user);

  return (
    <AppShell user={user} stats={stats}>
      {children}
    </AppShell>
  );
}
