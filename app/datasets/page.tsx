import { DatasetList } from "@/components/datasets/dataset-list";
import type { DatasetSummary } from "@/components/datasets/dataset-card";

const datasets: DatasetSummary[] = [
  {
    id: "bdd100k-demo",
    name: "BDD100K Demo",
    imageCount: 70_000,
    annotationFormat: "YOLO",
    status: "Ready",
    updatedAt: "2026-09-08",
  },
  {
    id: "rec-front-camera-dataset",
    name: "REC Front Camera Dataset",
    imageCount: 15_320,
    annotationFormat: "YOLO",
    status: "Ready",
    updatedAt: "2026-09-07",
  },
  {
    id: "cityscapes-subset",
    name: "Cityscapes Subset",
    imageCount: 5_200,
    annotationFormat: "YOLO",
    status: "Ready",
    updatedAt: "2026-09-05",
  },
];

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
