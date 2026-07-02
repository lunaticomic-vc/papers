import TodayCard from "@/components/TodayCard";
import NewsColumn from "@/components/NewsColumn";

export default function HomePage() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s paper</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Picked for you from your topics. Read it, skip it, or come back later.
          </p>
        </div>
        <TodayCard />
      </div>
      <NewsColumn />
    </div>
  );
}
