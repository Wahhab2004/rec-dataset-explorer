"use client";

import { useCallback, useEffect, useState } from "react";

import { DatasetList } from "@/components/datasets/dataset-list";
import type { DatasetSummary } from "@/components/datasets/dataset-card";
import { ApiError } from "@/lib/api/client";
import { getDatasets } from "@/lib/api/datasets";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDatasets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getDatasets();
      setDatasets(
        response.items.map((dataset) => ({
          ...dataset,
          status: formatStatus(dataset.status),
        })),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to load datasets.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getDatasets()
      .then((response) => {
        if (!active) {
          return;
        }

        setDatasets(
          response.items.map((dataset) => ({
            ...dataset,
            status: formatStatus(dataset.status),
          })),
        );
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : "Unable to load datasets.",
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
        {isLoading ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            Loading datasets...
          </div>
        ) : error ? (
          <div role="alert" className="rounded-lg border bg-card px-6 py-12 text-center">
            <h2 className="text-sm font-semibold">Unable to load datasets</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void loadDatasets()}
              className="mt-4 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
          </div>
        ) : (
          <DatasetList datasets={datasets} />
        )}
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
