"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function UploadValidationError({
  onTryAgain,
}: {
  onTryAgain: () => void;
}) {
  const [showErrors, setShowErrors] = useState(false);

  return (
    <section className="space-y-5" aria-labelledby="upload-error-title">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-amber-600" aria-hidden="true" />
        <div>
          <h2 id="upload-error-title" className="text-base font-semibold">
            Dataset validation failed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The prepared dataset has structural problems that must be fixed before uploading.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <h3 className="text-sm font-semibold">Problems</h3>
        {showErrors ? (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>- 12 images are missing annotation files</li>
            <li>- 3 annotation files have no matching image</li>
            <li>- Metadata file is missing required fields</li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Review the structural problems before trying again.
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          aria-expanded={showErrors}
          onClick={() => setShowErrors((current) => !current)}
        >
          {showErrors ? "Hide Errors" : "View Errors"}
        </Button>
        <Button type="button" onClick={onTryAgain}>
          Try Again
        </Button>
      </div>
    </section>
  );
}
