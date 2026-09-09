"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { ExportProgress } from "@/components/export/export-progress";
import { ExportSuccess } from "@/components/export/export-success";
import { Button } from "@/components/ui/button";
import {
  getActiveFilterChips,
  type DatasetFilters,
} from "@/lib/dataset-filtering";

export type ExportMode =
  | "images-and-annotations"
  | "annotation-files"
  | "complete-package";

type ExportStage = "configure" | "progress" | "success";

type ExportOption = {
  value: ExportMode;
  title: string;
  description: string;
};

const exportOptions: readonly ExportOption[] = [
  {
    value: "images-and-annotations",
    title: "Images + YOLO Annotations",
    description:
      "Export selected images together with regenerated YOLO TXT annotation files based on the active annotation filters.",
  },
  {
    value: "annotation-files",
    title: "Annotation Files Only",
    description: "Export only the regenerated YOLO TXT annotation files.",
  },
  {
    value: "complete-package",
    title: "Complete Dataset Package",
    description:
      "Export selected images, regenerated annotations, and related metadata/configuration as a complete dataset package.",
  },
];

function getFilename(datasetName: string) {
  const slug = datasetName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "dataset"}_filtered.zip`;
}

function FilterSummary({ filters }: { filters: DatasetFilters }) {
  const summary = useMemo(() => {
    const chips = getActiveFilterChips(filters);

    return {
      image: chips
        .filter((chip) => chip.id.startsWith("image:"))
        .map((chip) => chip.label),
      annotation: chips
        .filter((chip) => chip.id.startsWith("annotation:"))
        .map((chip) => chip.label),
    };
  }, [filters]);

  const hasFilters = summary.image.length > 0 || summary.annotation.length > 0;

  return (
    <section aria-labelledby="active-filter-summary-title" className="space-y-3">
      <h3 id="active-filter-summary-title" className="text-sm font-semibold">
        Active Filters
      </h3>
      {!hasFilters ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          No filters applied.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterGroup title="Image-Level Filters" values={summary.image} />
          <FilterGroup title="Annotation-Level Filters" values={summary.annotation} />
        </div>
      )}
    </section>
  );
}

function FilterGroup({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <h4 className="text-xs font-semibold">{title}</h4>
      {values.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>- {value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No filters applied.</p>
      )}
    </div>
  );
}

export function ExportDatasetModal({
  selectedCount,
  datasetName,
  appliedFilters,
  onClose,
}: {
  selectedCount: number;
  datasetName: string;
  appliedFilters: DatasetFilters;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<ExportStage>("configure");
  const [exportMode, setExportMode] = useState<ExportMode>(
    "images-and-annotations",
  );
  const generatedFilename = getFilename(datasetName);

  function handleCreateAnother() {
    setStage("configure");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dataset-title"
        className="flex max-h-[min(42rem,calc(100svh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="export-dataset-title" className="text-base font-semibold">
              Export Dataset
            </h2>
            {stage !== "progress" ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCount.toLocaleString()} {selectedCount === 1 ? "image" : "images"} selected
              </p>
            ) : null}
          </div>
          {stage !== "progress" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close export dialog"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {stage === "configure" ? (
            <div className="space-y-5">
              <fieldset>
                <legend className="text-sm font-semibold">Export Type</legend>
                <div className="mt-3 space-y-2">
                  {exportOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-checked:border-primary has-checked:bg-primary/5"
                    >
                      <input
                        type="radio"
                        name="export-mode"
                        value={option.value}
                        checked={exportMode === option.value}
                        onChange={() => setExportMode(option.value)}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{option.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <FilterSummary filters={appliedFilters} />

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => setStage("progress")}>
                  Generate Dataset
                </Button>
              </div>
            </div>
          ) : null}

          {stage === "progress" ? (
            <ExportProgress onComplete={() => setStage("success")} />
          ) : null}

          {stage === "success" ? (
            <ExportSuccess
              selectedCount={selectedCount}
              generatedFilename={generatedFilename}
              exportMode={exportMode}
              onClose={onClose}
              onCreateAnother={handleCreateAnother}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
