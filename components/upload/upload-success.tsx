"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ImportSummary } from "@/lib/api/dataset-imports";

export function UploadSuccess({
  datasetName,
  datasetId,
  summary,
  onUploadAnother,
}: {
  datasetName: string;
  datasetId: string;
  summary: ImportSummary | null;
  onUploadAnother: () => void;
}) {
  const router = useRouter();

  return (
    <section className="space-y-5" aria-labelledby="upload-success-title">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" aria-hidden="true" />
        <div>
          <h2 id="upload-success-title" className="text-base font-semibold">
            Dataset uploaded successfully
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{datasetName}</p>
        </div>
      </div>
      <dl className="divide-y rounded-lg border text-sm">
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Images</dt>
          <dd className="font-medium">{summary?.images ?? "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Annotation files</dt>
          <dd className="font-medium">{summary?.annotationFiles ?? "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Annotations</dt>
          <dd className="font-medium">{summary?.annotations ?? "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Classes</dt>
          <dd className="font-medium">{summary?.classes ?? "-"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onUploadAnother}>
          Upload Another Dataset
        </Button>
        <Button type="button" onClick={() => router.push(`/datasets/${datasetId}`)}>
          Open Dataset
        </Button>
      </div>
    </section>
  );
}
