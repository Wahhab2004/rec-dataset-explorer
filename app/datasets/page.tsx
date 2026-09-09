import { DatasetList } from "@/components/datasets/dataset-list";
import type { DatasetSummary } from "@/components/datasets/dataset-card";
import { mockDatasets } from "@/lib/mock-data/datasets";

const datasets: DatasetSummary[] = mockDatasets.map(
  ({ id, name, imageCount, annotationFormat, updatedAt }) => ({
    id,
    name,
    imageCount,
    annotationFormat,
    updatedAt,
    status: "Ready",
  }),
);

export default function DatasetsPage() {
  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-7xl px-6 py-5">
          <h1 className="text-xl font-semibold tracking-tight">Datasets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and explore available computer vision datasets.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-6 py-5">
        <DatasetList datasets={datasets} />
      </div>
    </div>
  );
}
