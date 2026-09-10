"use client";

import { AnnotationLevelFilters } from "@/components/explorer/annotation-level-filters";
import { ImageLevelFilters } from "@/components/explorer/image-level-filters";
import { Button } from "@/components/ui/button";
import {
  areDatasetFiltersValid,
  type AnnotationLevelFilterState,
  type DatasetFilters,
  type ImageLevelFilterState,
} from "@/lib/dataset-filtering";

type FilterPanelProps = {
  filters: DatasetFilters;
  categorySearch: string;
  onCategorySearchChange: (value: string) => void;
  onFiltersChange: (filters: DatasetFilters) => void;
  onApply: () => void;
  onReset: () => void;
  timeOfDayOptions?: readonly string[];
  weatherOptions?: readonly string[];
  installationLocationOptions?: readonly string[];
  categoryOptions?: readonly AnnotationLevelFilterState["selectedAnnotationCategories"][number][];
};

export function FilterPanel({
  filters,
  categorySearch,
  onCategorySearchChange,
  onFiltersChange,
  onApply,
  onReset,
  timeOfDayOptions,
  weatherOptions,
  installationLocationOptions,
  categoryOptions,
}: FilterPanelProps) {
  const filtersAreValid = areDatasetFiltersValid(filters);

  function updateImageLevelFilters(nextFilters: ImageLevelFilterState) {
    onFiltersChange({ ...filters, ...nextFilters });
  }

  function updateAnnotationLevelFilters(
    nextFilters: AnnotationLevelFilterState,
  ) {
    onFiltersChange({ ...filters, ...nextFilters });
  }

  return (
    <aside
      aria-labelledby="filter-panel-title"
      className="w-full rounded-lg border bg-card text-card-foreground"
    >
      <header className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
        <div>
          <h2 id="filter-panel-title" className="text-sm font-semibold">
            Filters
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Refine the current dataset.
          </p>
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={onReset}>
          Reset Filters
        </Button>
      </header>

      <div className="divide-y">
        <section aria-labelledby="image-level-filter-title" className="p-3">
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
            >
              1
            </span>
            <h3 id="image-level-filter-title" className="text-xs font-semibold">
              Image-Level Filters
            </h3>
          </div>
          <ImageLevelFilters
            filters={filters}
            onChange={updateImageLevelFilters}
            timeOfDayOptions={timeOfDayOptions}
            weatherOptions={weatherOptions}
            installationLocationOptions={installationLocationOptions}
          />
        </section>

        <section aria-labelledby="annotation-level-filter-title" className="p-3">
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
            >
              2
            </span>
            <h3
              id="annotation-level-filter-title"
              className="text-xs font-semibold"
            >
              Annotation-Level Filters
            </h3>
          </div>
          <AnnotationLevelFilters
            filters={filters}
            categorySearch={categorySearch}
            onCategorySearchChange={onCategorySearchChange}
            onChange={updateAnnotationLevelFilters}
            categoryOptions={categoryOptions}
          />
        </section>
      </div>

      <footer className="border-t p-3">
        {!filtersAreValid ? (
          <p
            id="filter-validation-message"
            role="alert"
            className="mb-2 text-[11px] text-destructive"
          >
            Use whole counts of 0 or more and box values from 0 to 1.
          </p>
        ) : null}
        <Button
          type="button"
          onClick={onApply}
          disabled={!filtersAreValid}
          aria-describedby={
            filtersAreValid ? undefined : "filter-validation-message"
          }
          className="w-full"
        >
          Apply Filters
        </Button>
      </footer>
    </aside>
  );
}
