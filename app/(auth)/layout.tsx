import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(75%_100%_at_50%_0%,rgba(216,255,95,0.09),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-violet-500/[0.05] blur-3xl" />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
