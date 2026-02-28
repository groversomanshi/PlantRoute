import Link from "next/link";
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

  return (
    <div className="relative w-full min-h-screen">
      <header className="fixed top-0 left-0 z-50 p-4 flex items-center justify-between w-full pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/">
            <h1 className="text-xl font-display font-semibold" style={{ color: "var(--text-primary)" }}>
              PlantRoute
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              AI-powered sustainable travel
            </p>
          </Link>
        </div>
      </header>

      <HomeClient useMapbox={useMapbox} />
    </div>
  );
}
