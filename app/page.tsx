import { ModelTable } from '../components/ModelTable';

export default function Home() {
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
          🚀 ModelLens - AI Model Explorer v0.1.0
        </h1>
        <p className="text-blue-700 dark:text-blue-300">
          Explore, filter, and compare AI models with our powerful interface.
        </p>
      </div>
      <ModelTable />
    </div>
  );
}
