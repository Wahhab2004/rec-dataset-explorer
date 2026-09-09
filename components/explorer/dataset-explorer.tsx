"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Grid2X2, List } from "lucide-react";

import { ActiveFilterChips } from "@/components/explorer/active-filter-chips";
import { ImageDetailDrawer } from "@/components/explorer/image-detail-drawer";
import { FilterPanel } from "@/components/explorer/filter-panel";
import { ImageGrid } from "@/components/explorer/image-grid";
import { SelectionToolbar } from "@/components/explorer/selection-toolbar";
import { Button } from "@/components/ui/button";
import {
  areDatasetFiltersValid,
  createEmptyDatasetFilters,
  filterDatasetImages,
  getActiveFilterChips,
  normalizeDatasetFilters,
  removeActiveFilter,
  type DatasetFilters,
  type DatasetImage,
} from "@/lib/dataset-filtering";

type DatasetExplorerProps = {
  images: readonly DatasetImage[];
};

export function DatasetExplorer({ images }: DatasetExplorerProps) {
  const [draftFilters, setDraftFilters] = useState<DatasetFilters>(() =>
    createEmptyDatasetFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<DatasetFilters>(() =>
    createEmptyDatasetFilters(),
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openImage, setOpenImage] = useState<DatasetImage | null>(null);

  const filteredImages = useMemo(
    () => filterDatasetImages(images, appliedFilters),
    [appliedFilters, images],
  );
  const activeFilters = useMemo(
    () => getActiveFilterChips(appliedFilters),
    [appliedFilters],
  );

  function keepSelectionInFilteredResults(nextFilters: DatasetFilters) {
    const visibleImageIds = new Set(
      filterDatasetImages(images, nextFilters).map((image) => image.id),
    );
    setSelectedImageIds((currentSelection) => {
      const nextSelection = new Set(
        Array.from(currentSelection).filter((id) => visibleImageIds.has(id)),
      );

      return nextSelection.size === currentSelection.size
        ? currentSelection
        : nextSelection;
    });
  }

  function handleApplyFilters() {
    if (!areDatasetFiltersValid(draftFilters)) {
      return;
    }

    const normalizedFilters = normalizeDatasetFilters(draftFilters);
    keepSelectionInFilteredResults(normalizedFilters);
    setDraftFilters(normalizedFilters);
    setAppliedFilters(normalizedFilters);
  }

  function handleResetFilters() {
    setSelectedImageIds(new Set());
    setDraftFilters(createEmptyDatasetFilters());
    setAppliedFilters(createEmptyDatasetFilters());
    setCategorySearch("");
  }

  function handleRemoveFilter(filterId: string) {
    const nextFilters = removeActiveFilter(appliedFilters, filterId);
    keepSelectionInFilteredResults(nextFilters);
    setAppliedFilters(nextFilters);
    setDraftFilters(removeActiveFilter(draftFilters, filterId));
  }

  function handleSelectionChange(imageId: string, selected: boolean) {
    setSelectedImageIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (selected) {
        nextSelection.add(imageId);
      } else {
        nextSelection.delete(imageId);
      }

      return nextSelection;
    });
  }

  function handleSelectAllVisible() {
    setSelectedImageIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      filteredImages.forEach((image) => nextSelection.add(image.id));
      return nextSelection;
    });
  }

  function handleClearSelection() {
    setSelectedImageIds(new Set());
  }

  const allVisibleImagesSelected =
    filteredImages.length > 0 &&
    filteredImages.every((image) => selectedImageIds.has(image.id));

  const imageLabel = filteredImages.length === 1 ? "image" : "images";

  return (
    <div className="grid min-h-[calc(100svh-7.25rem)] grid-cols-[17rem_minmax(0,1fr)] items-stretch xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="border-r bg-muted/20 p-3">
        <FilterPanel
          filters={draftFilters}
          categorySearch={categorySearch}
          onCategorySearchChange={setCategorySearch}
          onFiltersChange={setDraftFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </div>

      <section
        aria-labelledby="results-heading"
        className="min-w-0 px-4 py-4 xl:px-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="results-heading"
            aria-live="polite"
            className="text-sm font-semibold"
          >
            {filteredImages.length.toLocaleString()} {imageLabel} found
          </h2>

          <div className="flex items-center gap-2">
            <label
              htmlFor="image-sort"
              className="text-xs text-muted-foreground"
            >
              Sort by
            </label>
            <div className="relative">
              <select
                id="image-sort"
                defaultValue="filename"
                className="h-8 appearance-none rounded-lg border border-input bg-card py-1 pr-8 pl-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="filename">File name</option>
                <option value="updated">Last updated</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
            </div>

            <div
              role="group"
              aria-label="View options"
              className="flex items-center rounded-lg border bg-card p-0.5"
            >
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed="true"
                className="grid size-7 place-items-center rounded-md bg-secondary text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Grid2X2 aria-hidden="true" className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed="false"
                className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <List aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <ActiveFilterChips
            filters={activeFilters}
            onRemove={handleRemoveFilter}
          />
        </div>

        <div className="mt-4">
          {selectedImageIds.size > 0 ? (
            <SelectionToolbar
              count={selectedImageIds.size}
              onClear={handleClearSelection}
            />
          ) : null}

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {selectedImageIds.size > 0
                ? `${selectedImageIds.size.toLocaleString()} selected across visible results`
                : "Select images to prepare a dataset"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllVisible}
              disabled={allVisibleImagesSelected || filteredImages.length === 0}
            >
              <Check data-icon="inline-start" />
              Select All Visible
            </Button>
          </div>

          <ImageGrid
            images={filteredImages}
            selectedImageIds={selectedImageIds}
            onSelectionChange={handleSelectionChange}
            onOpenImage={setOpenImage}
          />
        </div>
      </section>

      <ImageDetailDrawer
        image={openImage}
        onClose={() => setOpenImage(null)}
      />
    </div>
  );
}
