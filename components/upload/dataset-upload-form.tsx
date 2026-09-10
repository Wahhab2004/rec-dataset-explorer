"use client";

import { useEffect, useState, type FormEvent } from "react";

import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { UploadSuccess } from "@/components/upload/upload-success";
import { UploadValidationError } from "@/components/upload/upload-validation-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  createDatasetImport,
  getDatasetImport,
  type DatasetImportStatus,
  type ImportValidationError,
} from "@/lib/api/dataset-imports";

type UploadStage = "form" | "progress" | "success" | "error";

function getApiError(error: unknown): ImportValidationError {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  return { code: "UPLOAD_FAILED", message: "Unable to upload the dataset." };
}

export function DatasetUploadForm() {
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [annotationFormat] = useState<"YOLO">("YOLO");
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<UploadStage>("form");
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [importId, setImportId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<DatasetImportStatus | null>(null);

  useEffect(() => {
    if (!importId || stage !== "progress") {
      return;
    }

    let active = true;
    let timeout: number | undefined;
    const poll = async () => {
      if (!active) {
        return;
      }

      try {
        const nextStatus = await getDatasetImport(importId);
        if (!active) {
          return;
        }

        setImportStatus(nextStatus);
        if (nextStatus.status === "completed") {
          setStage("success");
          return;
        }
        if (nextStatus.status === "failed") {
          setErrors(nextStatus.errors ?? [{ code: "IMPORT_FAILED", message: "Dataset import failed." }]);
          setStage("error");
          return;
        }
      } catch (error) {
        if (active) {
          setErrors([getApiError(error)]);
          setStage("error");
        }
        return;
      }

      if (active) {
        timeout = window.setTimeout(() => void poll(), 900);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [importId, stage]);

  function handleFilesChange(nextFiles: File[]) {
    setFiles(nextFiles.slice(0, 1));
    setErrors([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: ImportValidationError[] = [];
    const file = files[0];

    if (datasetName.trim() === "") {
      nextErrors.push({ code: "REQUIRED_FIELD", message: "Dataset Name is required." });
    }
    if (!file) {
      nextErrors.push({ code: "REQUIRED_FILE", message: "Select a ZIP dataset package." });
    } else if (!file.name.toLowerCase().endsWith(".zip")) {
      nextErrors.push({ code: "INVALID_FILE_TYPE", message: "Dataset file must be a ZIP package." });
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors([]);
    setImportStatus(null);
    setImportId(null);
    setStage("progress");

    try {
      const accepted = await createDatasetImport({
        name: datasetName.trim(),
        description: description.trim(),
        annotationFormat,
        file,
      });
      setImportId(accepted.importId);
    } catch (error) {
      setErrors([getApiError(error)]);
      setStage("error");
    }
  }

  function resetForm() {
    setDatasetName("");
    setDescription("");
    setFiles([]);
    setErrors([]);
    setImportId(null);
    setImportStatus(null);
    setStage("form");
  }

  if (stage === "progress") {
    return (
      <UploadProgress
        progress={importStatus?.progress ?? 0}
        stage={importStatus?.stage ?? "uploading"}
        processedImages={importStatus?.processedImages}
        totalImages={importStatus?.totalImages}
      />
    );
  }

  if (stage === "success" && importStatus?.datasetId) {
    return (
      <UploadSuccess
        datasetName={datasetName}
        datasetId={importStatus.datasetId}
        summary={importStatus.summary ?? null}
        onUploadAnother={resetForm}
      />
    );
  }

  if (stage === "error") {
    return <UploadValidationError errors={errors} onTryAgain={resetForm} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="dataset-name" className="text-sm font-medium">
            Dataset Name <span className="text-destructive">*</span>
          </label>
          <Input id="dataset-name" value={datasetName} onChange={(event) => setDatasetName(event.target.value)} placeholder="e.g. REC Front Camera Dataset" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="dataset-description" className="text-sm font-medium">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea id="dataset-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the dataset contents or intended use." className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        </div>
        <div className="space-y-2">
          <label htmlFor="annotation-format" className="text-sm font-medium">Annotation Format <span className="text-destructive">*</span></label>
          <select id="annotation-format" value={annotationFormat} disabled className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none disabled:opacity-70">
            <option value="YOLO">YOLO</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Dataset Files <span className="text-destructive">*</span></h2>
          <p className="mt-1 text-xs text-muted-foreground">Select the prepared ZIP dataset package.</p>
        </div>
        <UploadDropzone files={files} onFilesChange={handleFilesChange} />
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h2 className="text-sm font-semibold">Expected dataset structure</h2>
          <p className="mt-1 text-xs text-muted-foreground">Please prepare the dataset according to the required structure before uploading.</p>
        </div>
        <pre className="overflow-x-auto rounded-lg border bg-card p-3 font-mono text-xs leading-6 text-muted-foreground">{`dataset.zip
├── images/
├── labels/
└── metadata/
    └── metadata.json`}</pre>
        <p className="text-xs text-muted-foreground">The application does not automatically repair or prepare malformed datasets. Preparing the dataset correctly is the user&apos;s responsibility.</p>
      </div>

      {errors.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <p className="font-medium">Please correct the following problems.</p>
          <ul className="mt-1 list-disc pl-4">{errors.map((error, index) => <li key={`${error.code}-${index}`}>{error.message}</li>)}</ul>
        </div>
      ) : null}

      <div className="flex justify-end border-t pt-4">
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={datasetName.trim() === "" || files.length === 0}
        >
          Upload Dataset
        </Button>
      </div>
    </form>
  );
}
