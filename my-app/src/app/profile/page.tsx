import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPreferenceByUserId } from "@/lib/preference-db";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // JWT decryption failed (e.g. missing/changed NEXTAUTH_SECRET or stale cookie)
    redirect("/signin");
  }
  if (!session) redirect("/signin");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/signin");

  const pref = await getPreferenceByUserId(userId);
  const completed = pref?.preferences?.travel?.completed === true;
  if (!completed) redirect("/onboarding");

  const user = session.user
    ? { name: session.user.name ?? null, image: session.user.image ?? null }
    : null;

  return <ProfileClient user={user} />;
}
