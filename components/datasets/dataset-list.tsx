"use client";

import Link from "next/link";
import { Search, Upload } from "lucide-react";
import { useState } from "react";

import {
  DatasetCard,
  type DatasetSummary,
} from "@/components/datasets/dataset-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DatasetList({ datasets }: { datasets: DatasetSummary[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredDatasets = datasets.filter((dataset) =>
    dataset.name.toLowerCase().includes(normalizedQuery),
  );

  return (
    <section aria-label="Datasets" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search datasets..."
            aria-label="Search datasets"
            className="bg-card pl-8"
          />
        </div>

        <Link
          href="/upload"
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          <Upload aria-hidden="true" data-icon="inline-start" />
          Upload Dataset
        </Link>
      </div>

      {filteredDatasets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDatasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-lg border border-dashed bg-card px-6 py-12 text-center"
        >
          <h2 className="text-sm font-semibold">
            {datasets.length === 0 ? "No datasets available" : "No datasets found"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {datasets.length === 0
              ? "Upload a dataset to begin exploring."
              : "Try a different search keyword."}
          </p>
        </div>
      )}
    </section>
  );
}
