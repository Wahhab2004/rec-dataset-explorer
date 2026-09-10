"use client";

import type { ExportStatusResponse } from "@/lib/api/exports";

const stageLabels: Record<string, string> = {
  preparing_images: "Preparing export...",
  generating_annotations: "Generating files...",
  preparing_metadata: "Generating files...",
  creating_package: "Generating files...",
};

export function ExportProgress({ status }: { status: ExportStatusResponse | null }) {
  const progress = status?.progress;
  const label = status?.stage ? stageLabels[status.stage] ?? "Generating files..." : "Preparing export...";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">Generating Dataset</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The backend is generating your export package.
        </p>
      </div>

      <div className="space-y-2">
        {typeof progress === "number" ? <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div> : null}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {typeof progress === "number" ? <span>{progress}%</span> : null}
        </div>
      </div>

      <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        The original dataset will remain unchanged.
      </p>
    </div>
  );
}
