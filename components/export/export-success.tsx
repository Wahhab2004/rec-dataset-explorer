"use client";

import { useState } from "react";
import { CheckCircle2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ExportMode } from "@/components/export/export-dataset-modal";

const modeLabels: Record<ExportMode, string> = {
  "images-and-annotations": "Images + YOLO Annotations",
  "annotation-files": "Annotation Files Only",
  "complete-package": "Complete Dataset Package",
};

export function ExportSuccess({
  selectedCount,
  generatedFilename,
  exportMode,
  onClose,
  onCreateAnother,
}: {
  selectedCount: number;
  generatedFilename: string;
  exportMode: ExportMode;
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  const [downloadMessage, setDownloadMessage] = useState("");

  function handleDownload() {
    setDownloadMessage("Download will be connected to the backend export service.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold">Dataset successfully generated</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your mock export is ready to download.
          </p>
        </div>
      </div>

      <dl className="divide-y rounded-lg border text-sm">
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Selected images</dt>
          <dd className="font-medium">{selectedCount.toLocaleString()}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Export type</dt>
          <dd className="text-right font-medium">{modeLabels[exportMode]}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Generated annotations</dt>
          <dd className="font-medium">{selectedCount.toLocaleString()}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Filename</dt>
          <dd className="max-w-56 truncate font-mono text-xs font-medium" title={generatedFilename}>
            {generatedFilename}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Create Another Export
        </Button>
        <Button type="button" onClick={handleDownload}>
          <Download data-icon="inline-start" />
          Download ZIP
        </Button>
      </div>
      {downloadMessage ? (
        <p role="status" className="text-right text-xs text-muted-foreground">
          {downloadMessage}
        </p>
      ) : null}
    </div>
  );
}
