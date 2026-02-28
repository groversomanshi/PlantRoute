import Link from "next/link";
import { HomeClient } from "./HomeClient";

export default function HomePage() {
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
