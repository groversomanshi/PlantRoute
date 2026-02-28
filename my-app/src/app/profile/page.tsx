import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

  return <ProfileClient />;
}
