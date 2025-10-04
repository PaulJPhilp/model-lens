
import { Timeline } from '../Timeline';

export default async function TimelinePage({ params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">{model} Timeline</h1>
      <Timeline model={model} />
    </div>
  );
}
