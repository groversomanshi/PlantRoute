import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  return <OnboardingClient />;
}
