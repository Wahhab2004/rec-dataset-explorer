"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Grid2X2, List, X } from "lucide-react";

import { ExportDatasetModal } from "@/components/export/export-dataset-modal";
import { ActiveFilterChips } from "@/components/explorer/active-filter-chips";
import { ImageDetailDrawer } from "@/components/explorer/image-detail-drawer";
import { FilterPanel } from "@/components/explorer/filter-panel";
import {
  ImageGrid,
  type DatasetImageCardData,
} from "@/components/explorer/image-grid";
import { SelectionToolbar } from "@/components/explorer/selection-toolbar";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getDataset,
  getImageDetail,
  searchDataset,
  toBackendSearchRequest,
  type DatasetDetail,
  type DatasetSearchItem,
  type ImageDetail,
} from "@/lib/api/datasets";
import {
  areDatasetFiltersValid,
  createEmptyDatasetFilters,
  getActiveFilterChips,
  normalizeDatasetFilters,
  removeActiveFilter,
  type AnnotationCategory,
  type DatasetFilters,
} from "@/lib/dataset-filtering";

type DatasetExplorerProps = {
  datasetId: string;
};

function displayOption(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toCardImage(image: DatasetSearchItem): DatasetImageCardData {
  return {
    id: image.id,
    filename: image.fileName,
    imageUrl: image.imageUrl,
    timeOfDay: image.metadata.timeOfDay,
    weather: image.metadata.weather,
    installationLocation: image.metadata.installationLocation,
    tags: image.metadata.tags,
    annotationSummary: image.annotationSummary,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function DatasetExplorer({ datasetId }: DatasetExplorerProps) {
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [draftFilters, setDraftFilters] = useState<DatasetFilters>(() =>
    createEmptyDatasetFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<DatasetFilters>(() =>
    createEmptyDatasetFilters(),
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [images, setImages] = useState<DatasetImageCardData[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isDatasetLoading, setIsDatasetLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [imageDetail, setImageDetail] = useState<ImageDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportAllFiltered, setExportAllFiltered] = useState(false);

  const loadSearchResults = useCallback(
    async (filters: DatasetFilters) => {
      setIsSearchLoading(true);
      setSearchError(null);

      try {
        const response = await searchDataset(
          datasetId,
          toBackendSearchRequest(filters),
        );
        const nextImages = response.items.map(toCardImage);
        setImages(nextImages);
        setTotalResults(response.total);
        setSelectedImageIds((currentSelection) => {
          const visibleIds = new Set(nextImages.map((image) => image.id));
          return new Set(
            Array.from(currentSelection).filter((id) => visibleIds.has(id)),
          );
        });
      } catch (error) {
        setSearchError(getErrorMessage(error, "Unable to load search results."));
      } finally {
        setIsSearchLoading(false);
      }
    },
    [datasetId],
  );

  useEffect(() => {
    let active = true;

    void Promise.all([getDataset(datasetId), searchDataset(datasetId, toBackendSearchRequest(createEmptyDatasetFilters()))])
      .then(([datasetResponse, searchResponse]) => {
        if (!active) {
          return;
        }

        setDataset(datasetResponse);
        setImages(searchResponse.items.map(toCardImage));
        setTotalResults(searchResponse.total);
      })
      .catch((error) => {
        if (active) {
          setDatasetError(getErrorMessage(error, "Unable to load dataset."));
        }
      })
      .finally(() => {
        if (active) {
          setIsDatasetLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [datasetId]);

  const activeFilters = useMemo(
    () => getActiveFilterChips(appliedFilters),
    [appliedFilters],
  );

  const filterOptions = useMemo(() => {
    if (!dataset) {
      return undefined;
    }

    return {
      timeOfDay: dataset.availableFilters.timeOfDay.map(displayOption),
      weather: dataset.availableFilters.weather.map(displayOption),
      installationLocation: dataset.availableFilters.installationLocations.map(
        displayOption,
      ),
      categories: dataset.availableFilters.categories.map(
        displayOption,
      ) as AnnotationCategory[],
    };
  }, [dataset]);

  function handleApplyFilters() {
    if (!areDatasetFiltersValid(draftFilters)) {
      return;
    }

    const normalizedFilters = normalizeDatasetFilters(draftFilters);
    setAppliedFilters(normalizedFilters);
    void loadSearchResults(normalizedFilters);
  }

  function handleResetFilters() {
    const emptyFilters = createEmptyDatasetFilters();
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCategorySearch("");
    setSelectedImageIds(new Set());
    void loadSearchResults(emptyFilters);
  }

  function handleRemoveFilter(filterId: string) {
    const nextFilters = removeActiveFilter(appliedFilters, filterId);
    setAppliedFilters(nextFilters);
    setDraftFilters(removeActiveFilter(draftFilters, filterId));
    void loadSearchResults(nextFilters);
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
      images.forEach((image) => nextSelection.add(image.id));
      return nextSelection;
    });
  }

  function handleExportAllFiltered() {
    setExportAllFiltered(true);
    setIsExportOpen(true);
  }

  function handleOpenImage(imageId: string) {
    setImageDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);

    void getImageDetail(datasetId, imageId)
      .then(setImageDetail)
      .catch((error) => setDetailError(getErrorMessage(error, "Unable to load image details.")))
      .finally(() => setIsDetailLoading(false));
  }

  if (isDatasetLoading || dataset?.id !== datasetId) {
    return (
      <div className="grid min-h-[calc(100svh-7.25rem)] place-items-center px-6 py-12 text-sm text-muted-foreground">
        Loading dataset...
      </div>
    );
  }

  if (datasetError || !dataset) {
    return (
      <div className="grid min-h-[calc(100svh-7.25rem)] place-items-center px-6 py-12 text-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Unable to load dataset</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {datasetError ?? "Dataset not found."}
          </p>
          <Link
            href="/datasets"
            className="mt-4 inline-flex rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to Datasets
          </Link>
        </div>
      </div>
    );
  }

  const allVisibleImagesSelected =
    images.length > 0 && images.every((image) => selectedImageIds.has(image.id));
  const imageLabel = totalResults === 1 ? "image" : "images";

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
            <li aria-hidden="true"><ChevronDown className="size-3.5 -rotate-90" /></li>
            <li aria-current="page" className="text-foreground">{dataset.name}</li>
          </ol>
        </nav>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{dataset.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{dataset.imageCount.toLocaleString()} images</span>
          <span aria-hidden="true">{"\u00b7"}</span>
          <span>{dataset.annotationFormat}</span>
          <span aria-hidden="true">{"\u00b7"}</span>
          <span>Updated {new Date(dataset.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span>
        </p>
      </header>

      <div className="grid min-h-[calc(100svh-7.25rem)] grid-cols-[17rem_minmax(0,1fr)] items-stretch xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="border-r bg-muted/20 p-3">
          <FilterPanel
            filters={draftFilters}
            categorySearch={categorySearch}
            onCategorySearchChange={setCategorySearch}
            onFiltersChange={setDraftFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            timeOfDayOptions={filterOptions?.timeOfDay}
            weatherOptions={filterOptions?.weather}
            installationLocationOptions={filterOptions?.installationLocation}
            categoryOptions={filterOptions?.categories}
          />
        </div>

        <section aria-labelledby="results-heading" className="min-w-0 px-4 py-4 xl:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" aria-live="polite" className="text-sm font-semibold">
              {totalResults.toLocaleString()} {imageLabel} found
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="image-sort" className="text-xs text-muted-foreground">Sort by</label>
              <div className="relative">
                <select id="image-sort" defaultValue="filename" className="h-8 appearance-none rounded-lg border border-input bg-card py-1 pr-8 pl-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  <option value="filename">File name</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div role="group" aria-label="View options" className="flex items-center rounded-lg border bg-card p-0.5">
                <button type="button" aria-label="Grid view" aria-pressed="true" className="grid size-7 place-items-center rounded-md bg-secondary text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><Grid2X2 aria-hidden="true" className="size-3.5" /></button>
                <button type="button" aria-label="List view" aria-pressed="false" className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><List aria-hidden="true" className="size-3.5" /></button>
              </div>
            </div>
          </div>

          <div className="mt-3"><ActiveFilterChips filters={activeFilters} onRemove={handleRemoveFilter} /></div>

          <div className="mt-4">
            {selectedImageIds.size > 0 ? <SelectionToolbar count={selectedImageIds.size} onClear={() => setSelectedImageIds(new Set())} onExport={() => setIsExportOpen(true)} /> : null}
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{selectedImageIds.size > 0 ? `${selectedImageIds.size.toLocaleString()} selected across visible results` : "Select images to prepare a dataset"}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAllVisible} disabled={allVisibleImagesSelected || images.length === 0}><Check data-icon="inline-start" />Select All Visible</Button>
                <Button type="button" variant="outline" size="sm" onClick={handleExportAllFiltered} disabled={totalResults === 0}>Export All Filtered</Button>
              </div>
            </div>
            {searchError ? (
              <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <span>{searchError}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadSearchResults(appliedFilters)}>Retry</Button>
              </div>
            ) : null}
            {isSearchLoading ? <div className="mb-3 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">Loading search results...</div> : null}
            <ImageGrid images={images} selectedImageIds={selectedImageIds} onSelectionChange={handleSelectionChange} onOpenImage={(image) => handleOpenImage(image.id)} />
          </div>
        </section>
      </div>

      {isDetailLoading ? <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4"><div className="rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">Loading image details...</div></div> : null}
      {detailError ? <div role="alert" className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-destructive/30 bg-card px-3 py-2.5 text-sm shadow-lg"><span className="text-destructive">{detailError}</span><Button type="button" variant="ghost" size="icon-sm" aria-label="Close image detail error" onClick={() => setDetailError(null)}><X aria-hidden="true" /></Button></div> : null}
      <ImageDetailDrawer image={imageDetail} onClose={() => setImageDetail(null)} />
      {isExportOpen ? <ExportDatasetModal datasetId={datasetId} selectedImageIds={Array.from(selectedImageIds)} selectedCount={exportAllFiltered ? totalResults : selectedImageIds.size} datasetName={dataset.name} appliedFilters={appliedFilters} selectionMode={exportAllFiltered ? "all_filtered" : "explicit"} onClose={() => { setIsExportOpen(false); setExportAllFiltered(false); }} /> : null}
    </div>
  );
}
