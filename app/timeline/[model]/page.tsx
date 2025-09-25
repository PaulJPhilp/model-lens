
import { Timeline } from '../Timeline';

export default function TimelinePage({ params }: { params: { model: string } }) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">{params.model} Timeline</h1>
      <Timeline model={params.model} />
    </div>
  );
}
