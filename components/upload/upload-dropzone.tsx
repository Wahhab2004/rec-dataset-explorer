"use client";

import { useRef } from "react";
import { FileArchive, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UploadDropzone({
  files,
  onFilesChange,
}: {
  files: readonly File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    onFilesChange(Array.from(fileList));
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed bg-card p-6 text-center transition-colors hover:border-foreground/30 hover:bg-muted/20"
      role="button"
      tabIndex={0}
      aria-label="Choose dataset files"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        addFiles(event.dataTransfer.files);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        onChange={(event) => addFiles(event.target.files)}
      />
      <div className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <UploadCloud aria-hidden="true" className="size-5" />
      </div>
      <h2 className="mt-3 text-sm font-semibold">Drop your dataset files here</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload a prepared dataset package or select its files from your computer.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <FileArchive data-icon="inline-start" />
        Browse Files
      </Button>
      {files.length > 0 ? (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {files.length.toLocaleString()} file{files.length === 1 ? "" : "s"} selected
        </p>
      ) : null}
    </div>
  );
}
