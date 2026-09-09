import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DatasetExplorer } from "@/components/explorer/dataset-explorer";
import {
  getMockDatasetById,
  mockDatasets,
} from "@/lib/mock-data/datasets";

const imageCountFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function generateStaticParams() {
  return mockDatasets.map((dataset) => ({ datasetId: dataset.id }));
}

export default async function DatasetExplorerPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const dataset = getMockDatasetById(datasetId);

  if (!dataset) {
    return (
      <div className="grid min-h-svh place-items-center px-6 py-12">
        <h1 className="text-xl font-semibold tracking-tight">
          Dataset not found
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card px-5 py-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-xs text-muted-foreground">
            <li>
              <Link
                href="/datasets"
                className="rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Datasets
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li aria-current="page" className="text-foreground">
              {dataset.name}
            </li>
          </ol>
        </nav>

        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {dataset.name}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{imageCountFormatter.format(dataset.imageCount)} images</span>
          <span aria-hidden="true">{"\u00b7"}</span>
          <span>{dataset.annotationFormat}</span>
          <span aria-hidden="true">{"\u00b7"}</span>
          <span>Updated {formatUpdatedAt(dataset.updatedAt)}</span>
        </p>
      </header>

      <DatasetExplorer key={dataset.id} images={dataset.images} />
    </div>
  );
}
