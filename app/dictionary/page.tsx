import DictionaryList from "@/components/DictionaryList";

export default function DictionaryPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dictionary</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Terms you saved while reading, with beginner-friendly definitions.
        </p>
      </div>
      <DictionaryList />
    </div>
  );
}
