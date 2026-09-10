import { apiRequest } from "@/lib/api/client";

export type ImportStatus = "processing" | "completed" | "failed" | string;

export type ImportValidationError = {
  code: string;
  message: string;
  file?: string;
};

export type ImportSummary = {
  images: number;
  annotationFiles: number;
  annotations?: number;
  classes?: number;
  metadataLoaded: boolean;
  annotationFormat: string;
};

export type DatasetImportStatus = {
  id: string;
  status: ImportStatus;
  progress: number;
  stage: string | null;
  datasetId?: string | null;
  processedImages?: number | null;
  totalImages?: number | null;
  summary?: ImportSummary | null;
  errors?: ImportValidationError[] | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type DatasetImportAccepted = {
  importId: string;
  status: "processing";
};

export async function createDatasetImport({
  name,
  description,
  annotationFormat,
  file,
}: {
  name: string;
  description?: string;
  annotationFormat: "YOLO";
  file: File;
}): Promise<DatasetImportAccepted> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description ?? "");
  formData.append("annotationFormat", annotationFormat);
  formData.append("file", file);

  return apiRequest<DatasetImportAccepted>("/dataset-imports", {
    method: "POST",
    body: formData,
  });
}

export async function getDatasetImport(
  importId: string,
): Promise<DatasetImportStatus> {
  return apiRequest<DatasetImportStatus>(`/dataset-imports/${encodeURIComponent(importId)}`);
}
