import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { allIdeas } from "@/lib/content";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AuthForm mode="login" ideas={allIdeas.length.toLocaleString("en-US")} />;
}
