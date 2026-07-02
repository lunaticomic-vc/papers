import TodayCard from "@/components/TodayCard";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s paper</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Picked for you from your topics. Read it, skip it, or come back later.
        </p>
      </div>
      <TodayCard />
    </div>
  );
}
