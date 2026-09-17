import { apiRequest } from "@/lib/api/client";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

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
  onUploadProgress,
}: {
  name: string;
  description?: string;
  annotationFormat: "YOLO";
  file: File;
  onUploadProgress?: (progress: number) => void;
}): Promise<DatasetImportAccepted> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description ?? "");
  formData.append("annotationFormat", annotationFormat);
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/dataset-imports`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error("Unable to upload the dataset."));
    request.onload = () => {
      const response = request.response as DatasetImportAccepted | { error?: { code?: string; message?: string } } | null;
      if (request.status >= 200 && request.status < 300 && response && "importId" in response) {
        resolve(response);
        return;
      }
      reject(new Error(response && "error" in response ? response.error?.message ?? "Unable to upload the dataset." : "Unable to upload the dataset."));
    };
    request.send(formData);
  });
}

export async function getDatasetImport(
  importId: string,
): Promise<DatasetImportStatus> {
  return apiRequest<DatasetImportStatus>(`/dataset-imports/${encodeURIComponent(importId)}`);
}
