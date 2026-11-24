import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getUser } from "./auth";
import type { User } from "./types";

/** Per-request dedupe so a layout and page do not hit the session table twice. */
export const getCurrentUser = cache(getUser);

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOnboardedUser(): Promise<User> {
  const user = await requireCurrentUser();
  if (!user.onboarded) redirect("/onboarding");
  return user;
}

export function homeFor(user: User): string {
  return user.onboarded ? "/feed" : "/onboarding";
}
