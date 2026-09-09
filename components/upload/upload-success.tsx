"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants, Button } from "@/components/ui/button";

export function UploadSuccess({
  datasetName,
  onUploadAnother,
}: {
  datasetName: string;
  onUploadAnother: () => void;
}) {
  return (
    <section className="space-y-5" aria-labelledby="upload-success-title">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" aria-hidden="true" />
        <div>
          <h2 id="upload-success-title" className="text-base font-semibold">
            Dataset uploaded successfully
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {datasetName} is ready in this mock frontend flow.
          </p>
        </div>
      </div>
      <dl className="divide-y rounded-lg border text-sm">
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Images</dt>
          <dd className="font-medium">12,450</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Annotation files</dt>
          <dd className="font-medium">12,450</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Metadata</dt>
          <dd className="font-medium">Loaded</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Annotation format</dt>
          <dd className="font-medium">YOLO</dd>
        </div>
      </dl>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onUploadAnother}>
          Upload Another Dataset
        </Button>
        <Link
          href="/datasets/bdd100k-demo"
          className={buttonVariants({ variant: "default" })}
        >
          Open Dataset
        </Link>
      </div>
    </section>
  );
}
