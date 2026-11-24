import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { allIdeas } from "@/lib/content";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return <AuthForm mode="signup" ideas={allIdeas.length.toLocaleString("en-US")} />;
}
