import { apiDownload, apiRequest } from "@/lib/api/client";
import type { SearchRequest } from "@/lib/api/datasets";

export type ExportType =
  | "images_and_annotations"
  | "annotations_only"
  | "complete_dataset";

export type ExportSelection =
  | { mode: "explicit"; imageIds: string[] }
  | { mode: "all_filtered" };

export type CreateExportRequest = {
  exportType: ExportType;
  selection: ExportSelection;
  filters: Pick<SearchRequest, "imageFilters" | "annotationFilters">;
};

export type ExportStatusResponse = {
  id: string;
  status: "processing" | "completed" | "failed" | string;
  progress?: number;
  stage?: string;
  error?: string | { message?: string };
  errors?: Array<{ message?: string }>;
  summary?: {
    selectedImages?: number;
    generatedAnnotationFiles?: number;
    exportType?: ExportType;
  };
  fileName?: string;
};

export async function createExport(
  datasetId: string,
  request: CreateExportRequest,
) {
  return apiRequest<{ exportId: string; status: string }>(
    `/datasets/${encodeURIComponent(datasetId)}/exports`,
    { method: "POST", body: JSON.stringify(request) },
  );
}

export async function getExportStatus(exportId: string) {
  return apiRequest<ExportStatusResponse>(
    `/exports/${encodeURIComponent(exportId)}`,
  );
}

export async function downloadExport(exportId: string) {
  return apiDownload(`/exports/${encodeURIComponent(exportId)}/download`);
}