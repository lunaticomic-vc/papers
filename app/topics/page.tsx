import TopicsManager from "@/components/TopicsManager";

export default function TopicsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Papers are picked from these. Add, deactivate, or delete any of them.
        </p>
      </div>
      <TopicsManager />
    </div>
  );
}
