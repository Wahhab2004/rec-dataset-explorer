"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { ExportDatasetModal } from "@/components/export/export-dataset-modal";
import { ActiveFilterChips } from "@/components/explorer/active-filter-chips";
import { ImageDetailDrawer } from "@/components/explorer/image-detail-drawer";
import { FilterPanel } from "@/components/explorer/filter-panel";
import {
  ImageGrid,
  type DatasetImageCardData,
} from "@/components/explorer/image-grid";
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

type AnnotationExclusions = Record<string, Set<string>>;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isDatasetLoading, setIsDatasetLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [imageDetail, setImageDetail] = useState<ImageDetail | null>(null);
  const [annotationExclusions, setAnnotationExclusions] = useState<AnnotationExclusions>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportAllFiltered, setExportAllFiltered] = useState(false);
  const resultsScrollRef = useRef<HTMLDivElement>(null);

  const loadSearchResults = useCallback(
    async (filters: DatasetFilters, page = currentPage, size = pageSize, direction = sortDirection) => {
      setIsSearchLoading(true);
      setSearchError(null);

      try {
        const response = await searchDataset(
          datasetId,
          toBackendSearchRequest(filters, page, size, direction),
        );
        let nextResponse = response;
        const lastPage = Math.max(1, Math.ceil(response.total / response.pageSize));
        if (response.total > 0 && response.items.length === 0 && page > lastPage) {
          setCurrentPage(lastPage);
          nextResponse = await searchDataset(
            datasetId,
            toBackendSearchRequest(filters, lastPage, size, direction),
          );
        }

        const nextImages = nextResponse.items.map(toCardImage);
        setImages(nextImages);
        setTotalResults(nextResponse.total);
      } catch (error) {
        setSearchError(getErrorMessage(error, "Unable to load search results."));
      } finally {
        setIsSearchLoading(false);
      }
    },
    [currentPage, datasetId, pageSize, sortDirection],
  );

  useEffect(() => {
    let active = true;

    void Promise.all([getDataset(datasetId), searchDataset(datasetId, toBackendSearchRequest(createEmptyDatasetFilters(), 1, 24))])
      .then(([datasetResponse, searchResponse]) => {
        if (!active) {
          return;
        }

        setDataset(datasetResponse);
        setImages(searchResponse.items.map(toCardImage));
        setTotalResults(searchResponse.total);
        setCurrentPage(1);
        setPageSize(searchResponse.pageSize);
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

  useEffect(() => {
    resultsScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [appliedFilters, currentPage, pageSize, sortDirection]);

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
      // Raw backend category values are preserved as-is; labels are formatted only at render time.
      categories: dataset.availableFilters.categories as AnnotationCategory[],
    };
  }, [dataset]);

  function handleApplyFilters() {
    if (!areDatasetFiltersValid(draftFilters)) {
      return;
    }

    const normalizedFilters = normalizeDatasetFilters(draftFilters);
    setAppliedFilters(normalizedFilters);
    setCurrentPage(1);
    void loadSearchResults(normalizedFilters, 1, pageSize);
  }

  function handleResetFilters() {
    const emptyFilters = createEmptyDatasetFilters();
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCategorySearch("");
    setSelectedImageIds(new Set());
    setCurrentPage(1);
    void loadSearchResults(emptyFilters, 1, pageSize);
  }

  function handleRemoveFilter(filterId: string) {
    const nextFilters = removeActiveFilter(appliedFilters, filterId);
    setAppliedFilters(nextFilters);
    setDraftFilters(removeActiveFilter(draftFilters, filterId));
    setCurrentPage(1);
    void loadSearchResults(nextFilters, 1, pageSize);
  }

  function handlePageChange(page: number) {
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const nextPage = Math.min(totalPages, Math.max(1, page));
    setCurrentPage(nextPage);
    void loadSearchResults(appliedFilters, nextPage, pageSize);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
    void loadSearchResults(appliedFilters, 1, nextPageSize);
  }

  function handleSortChange(nextDirection: "asc" | "desc") {
    setSortDirection(nextDirection);
    setCurrentPage(1);
    void loadSearchResults(appliedFilters, 1, pageSize, nextDirection);
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

  function handleExportSelected() {
    setExportAllFiltered(false);
    setIsExportOpen(true);
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

  function handleToggleAnnotation(imageId: string, annotationId: string) {
    setAnnotationExclusions((currentExclusions) => {
      const nextExclusions = { ...currentExclusions };
      const imageExclusions = new Set(nextExclusions[imageId] ?? []);

      if (imageExclusions.has(annotationId)) {
        imageExclusions.delete(annotationId);
      } else {
        imageExclusions.add(annotationId);
      }

      if (imageExclusions.size === 0) {
        delete nextExclusions[imageId];
      } else {
        nextExclusions[imageId] = imageExclusions;
      }

      return nextExclusions;
    });
  }

  function handleRestoreAnnotationExclusions(imageId: string) {
    setAnnotationExclusions((currentExclusions) => {
      if (!(imageId in currentExclusions)) {
        return currentExclusions;
      }

      const nextExclusions = { ...currentExclusions };
      delete nextExclusions[imageId];
      return nextExclusions;
    });
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
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const rangeStart = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalResults);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  );
  const exportExcludedAnnotationIds = Array.from(
    new Set(
      Array.from(exportAllFiltered ? new Set(images.map((image) => image.id)) : selectedImageIds)
        .flatMap((imageId) => Array.from(annotationExclusions[imageId] ?? [])),
    ),
  );

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

      <div className="grid h-[calc(100svh-7.25rem)] min-h-0 grid-cols-[17rem_minmax(0,1fr)] items-stretch overflow-hidden xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto border-r bg-muted/20 p-3">
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

        <section aria-labelledby="results-heading" className="flex min-h-0 min-w-0 flex-col overflow-hidden px-4 py-4 xl:px-5">
          <div className="shrink-0 flex flex-wrap items-center gap-2 border-b py-1.5 text-xs">
            <h2 id="results-heading" aria-live="polite" className="font-semibold">
              {totalResults.toLocaleString()} {imageLabel} found
            </h2>
            <span className="text-muted-foreground" aria-live="polite">
              · Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {totalResults.toLocaleString()}
            </span>
            <ActiveFilterChips filters={activeFilters} onRemove={handleRemoveFilter} />
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <label htmlFor="image-sort" className="text-muted-foreground">Sort</label>
              <div className="relative">
                <select id="image-sort" value={sortDirection} onChange={(event) => handleSortChange(event.target.value as "asc" | "desc")} className="h-7 appearance-none rounded-md border border-input bg-card py-1 pr-7 pl-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  <option value="asc">File name</option>
                  <option value="desc">File name (Z-A)</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <select id="images-per-page" aria-label="Images per page" value={pageSize} onChange={(event) => handlePageSizeChange(Number(event.target.value))} className="h-7 w-18 rounded-md border border-input bg-card px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                {[24, 48, 96, 100].map((size) => <option key={size} value={size}>{size}/page</option>)}
              </select>
              <Button type="button" variant="outline" size="xs" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || totalResults === 0}>‹</Button>
              <div className="flex items-center gap-0.5" aria-label="Pagination">
                {pageNumbers.map((page, index) => (
                  <span key={page} className="flex items-center gap-0.5">
                    {index > 0 && page - pageNumbers[index - 1] > 1 ? <span className="px-0.5 text-xs text-muted-foreground">...</span> : null}
                    <Button type="button" variant={page === currentPage ? "secondary" : "ghost"} size="icon-xs" aria-label={`Page ${page}`} aria-current={page === currentPage ? "page" : undefined} onClick={() => handlePageChange(page)}>{page}</Button>
                  </span>
                ))}
              </div>
              <Button type="button" variant="outline" size="xs" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || totalResults === 0}>›</Button>
              {selectedImageIds.size > 0 ? <span className="text-muted-foreground">{selectedImageIds.size.toLocaleString()} selected</span> : null}
              {selectedImageIds.size > 0 ? <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedImageIds(new Set())}><X data-icon="inline-start" />Clear Selection</Button> : null}
              <Button type="button" variant="outline" size="xs" onClick={handleSelectAllVisible} disabled={allVisibleImagesSelected || images.length === 0}>Select All</Button>
              {selectedImageIds.size > 0 ? <Button type="button" variant="outline" size="xs" onClick={handleExportSelected}>Export Selected</Button> : null}
              <Button type="button" variant="outline" size="xs" onClick={handleExportAllFiltered} disabled={totalResults === 0}>Export All Filtered</Button>
            </div>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col">
            {searchError ? (
              <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <span>{searchError}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadSearchResults(appliedFilters)}>Retry</Button>
              </div>
            ) : null}
            {isSearchLoading ? <div className="mb-3 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">Loading search results...</div> : null}
            <div ref={resultsScrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ImageGrid images={images} selectedImageIds={selectedImageIds} onSelectionChange={handleSelectionChange} onOpenImage={(image) => handleOpenImage(image.id)} />
            </div>
          </div>
        </section>
      </div>

      {isDetailLoading ? <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4"><div className="rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">Loading image details...</div></div> : null}
      {detailError ? <div role="alert" className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-destructive/30 bg-card px-3 py-2.5 text-sm shadow-lg"><span className="text-destructive">{detailError}</span><Button type="button" variant="ghost" size="icon-sm" aria-label="Close image detail error" onClick={() => setDetailError(null)}><X aria-hidden="true" /></Button></div> : null}
      <ImageDetailDrawer
        key={imageDetail?.id ?? "closed"}
        image={imageDetail}
        excludedAnnotationIds={imageDetail ? annotationExclusions[imageDetail.id] ?? new Set() : new Set()}
        onToggleAnnotation={(annotationId) => {
          if (imageDetail) {
            handleToggleAnnotation(imageDetail.id, annotationId);
          }
        }}
        onRestoreAll={() => {
          if (imageDetail) {
            handleRestoreAnnotationExclusions(imageDetail.id);
          }
        }}
        onClose={() => setImageDetail(null)}
      />
      {isExportOpen ? <ExportDatasetModal datasetId={datasetId} selectedImageIds={Array.from(selectedImageIds)} selectedCount={exportAllFiltered ? totalResults : selectedImageIds.size} datasetName={dataset.name} appliedFilters={appliedFilters} selectionMode={exportAllFiltered ? "all_filtered" : "explicit"} excludedAnnotationIds={exportExcludedAnnotationIds} onClose={() => { setIsExportOpen(false); setExportAllFiltered(false); }} /> : null}
    </div>
  );
}
