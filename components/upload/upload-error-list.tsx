"use client";

import type { ImportValidationError } from "@/lib/api/dataset-imports";

export function UploadErrorList({
  errors,
}: {
  errors: readonly ImportValidationError[];
}) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm text-muted-foreground">
      {errors.map((error, index) => (
        <li key={`${error.code}-${error.file ?? ""}-${index}`}>
          <span className="font-medium text-foreground">{error.code}</span>{" "}
          {error.message}
          {error.file ? ` (${error.file})` : ""}
        </li>
      ))}
    </ul>
  );
}
