import Link from "next/link";
import { ChevronDown, ChevronRight, Grid2X2, List } from "lucide-react";

import { ActiveFilterChips } from "@/components/explorer/active-filter-chips";
import type { DatasetImage } from "@/components/explorer/dataset-image-card";
import { FilterPanel } from "@/components/explorer/filter-panel";
import { ImageGrid } from "@/components/explorer/image-grid";

const activeFilters = [
  "Nighttime",
  "Rainy",
  "Front",
  "Person",
  "Person > 3",
  "BBox Area > 0.02",
];

const images: DatasetImage[] = [
  {
    id: "image-000123",
    filename: "image_000123.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 4 · Car 2",
  },
  {
    id: "image-000124",
    filename: "image_000124.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 6 · Car 1",
  },
  {
    id: "image-000125",
    filename: "image_000125.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 4 · Bus 1",
  },
  {
    id: "image-000126",
    filename: "image_000126.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 5 · Car 3",
  },
  {
    id: "image-000127",
    filename: "image_000127.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 4 · Truck 1",
  },
  {
    id: "image-000128",
    filename: "image_000128.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 7 · Bicycle 2",
  },
  {
    id: "image-000129",
    filename: "image_000129.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 4 · Rider 1",
  },
  {
    id: "image-000130",
    filename: "image_000130.jpg",
    tags: ["Night", "Rain", "Front"],
    annotationSummary: "Person 5 · Bus 2",
  },
];

export default function DatasetExplorerPage() {
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
              BDD100K Demo
            </li>
          </ol>
        </nav>

        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          BDD100K Demo
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>70,000 images</span>
          <span aria-hidden="true">·</span>
          <span>YOLO</span>
          <span aria-hidden="true">·</span>
          <span>Updated Sep 8, 2026</span>
        </p>
      </header>

      <div className="grid min-h-[calc(100svh-7.25rem)] grid-cols-[17rem_minmax(0,1fr)] items-stretch xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="border-r bg-muted/20 p-3">
          <FilterPanel />
        </div>

        <section
          aria-labelledby="results-heading"
          className="min-w-0 px-4 py-4 xl:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm font-semibold">
              1,248 images found
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
                  aria-pressed={true}
                  className="grid size-7 place-items-center rounded-md bg-secondary text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Grid2X2 aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={false}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <List aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <ActiveFilterChips filters={activeFilters} />
          </div>

          <div className="mt-4">
            <ImageGrid images={images} />
          </div>
        </section>
      </div>
    </div>
  );
}
