"use client";

import { Progress } from "@/components/ui/progress";

const stageLabels: Record<string, string> = {
  uploading: "Uploading ZIP",
  uploaded: "Upload complete",
  validating: "Validating dataset",
  validating_structure: "Validating dataset",
  creating_records: "Creating dataset records",
  processing_images: "Processing images",
  processing_annotations: "Processing annotations",
  validated: "Dataset validated",
  completed: "Completed",
};

export function UploadProgress({
  phase,
  progress,
  stage,
  processedImages,
  totalImages,
}: {
  phase: "uploading" | "processing";
  progress: number;
  stage: string | null;
  processedImages?: number | null;
  totalImages?: number | null;
}) {
  const stageLabel = stageLabels[stage ?? ""] ?? "Processing dataset";
  const hasCounts = processedImages != null && totalImages != null;

  return (
    <section className="space-y-5" aria-labelledby="upload-progress-title">
      <div>
        <h2 id="upload-progress-title" className="text-base font-semibold">
          {phase === "uploading" ? "Uploading Dataset" : "Processing Dataset"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {phase === "uploading" ? "Uploading ZIP to the backend." : "Upload complete. Processing the prepared dataset."}
        </p>
      </div>
      <div className="space-y-2">
        <Progress value={progress} aria-label={`${phase === "uploading" ? "Upload" : "Processing"} progress: ${progress}%`} />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{stageLabel}</span>
          <span>{progress}%</span>
        </div>
      </div>
      {phase === "processing" ? <div className="rounded-lg border bg-card px-3 py-2.5">
        <p className="text-xs text-muted-foreground">Images processed</p>
        <p className="mt-1 text-sm font-semibold">
          {hasCounts
            ? `${processedImages.toLocaleString()} / ${totalImages.toLocaleString()}`
            : "Processing status will appear shortly"}
        </p>
      </div> : null}
      <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        The original dataset will remain unchanged.
      </p>
    </section>
  );
}
