import QueueList from "@/components/QueueList";

export default function QueuePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Reading queue</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Papers you saved for later.
        </p>
      </div>
      <QueueList />
    </div>
  );
}
