import Reader from "@/components/Reader";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paperId = Number(id);
  return <Reader paperId={paperId} />;
}
