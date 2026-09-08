import { AnnotationLevelFilters } from "@/components/explorer/annotation-level-filters";
import { ImageLevelFilters } from "@/components/explorer/image-level-filters";
import { Button } from "@/components/ui/button";

export function FilterPanel() {
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
        <Button type="button" variant="ghost" size="xs">
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
          <ImageLevelFilters />
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
          <AnnotationLevelFilters />
        </section>
      </div>

      <footer className="border-t p-3">
        <Button type="button" className="w-full">
          Apply Filters
        </Button>
      </footer>
    </aside>
  );
}
