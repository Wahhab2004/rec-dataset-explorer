"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UploadErrorList } from "@/components/upload/upload-error-list";
import type { ImportValidationError } from "@/lib/api/dataset-imports";

export function UploadValidationError({
  errors,
  onTryAgain,
}: {
  errors: readonly ImportValidationError[];
  onTryAgain: () => void;
}) {
  return (
    <section className="space-y-5" aria-labelledby="upload-error-title">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-amber-600" aria-hidden="true" />
        <div>
          <h2 id="upload-error-title" className="text-base font-semibold">
            Dataset validation failed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fix the reported dataset problems before trying again.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <h3 className="text-sm font-semibold">Problems</h3>
        <UploadErrorList errors={errors} />
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onTryAgain}>
          Try Again
        </Button>
      </div>
    </section>
  );
}
