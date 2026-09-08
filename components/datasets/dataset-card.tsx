import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DatasetSummary = {
  id: string;
  name: string;
  imageCount: number;
  annotationFormat: string;
  updatedAt: string;
  status: string;
};

type DatasetCardProps = {
  dataset: DatasetSummary;
};

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

export function DatasetCard({ dataset }: DatasetCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 truncate text-sm font-semibold tracking-tight">
          {dataset.name}
        </h2>
        <Badge variant="outline" className="shrink-0 bg-background">
          {dataset.status}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Images</dt>
          <dd className="mt-1 truncate font-medium text-foreground">
            {imageCountFormatter.format(dataset.imageCount)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Annotation format</dt>
          <dd className="mt-1 truncate font-medium text-foreground">
            {dataset.annotationFormat}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-muted-foreground">Updated</dt>
          <dd className="mt-1 truncate font-medium text-foreground">
            {formatUpdatedAt(dataset.updatedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t pt-3">
        <Link
          href={`/datasets/${dataset.id}`}
          aria-label={`Open ${dataset.name} dataset`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-between",
          )}
        >
          Open Dataset
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </div>
    </article>
  );
}
