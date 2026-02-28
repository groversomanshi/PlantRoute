import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPreferenceByUserId } from "@/lib/preference-db";
import { HomeClient } from "./HomeClient";

export default async function HomePage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) {
    const pref = await getPreferenceByUserId(userId);
    const completed = pref?.preferences?.travel?.completed === true;
    if (!completed) redirect("/onboarding");
  }

  const useMapbox = !!(process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "").trim();

  return <HomeClient useMapbox={useMapbox} />;
}
