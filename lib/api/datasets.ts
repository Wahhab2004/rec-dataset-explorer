import { apiRequest } from "@/lib/api/client";

export type DatasetStatus = "processing" | "ready" | "failed" | string;

export type DatasetSummary = {
  id: string;
  name: string;
  description: string | null;
  imageCount: number;
  annotationFormat: string;
  status: DatasetStatus;
  createdAt: string;
  updatedAt: string;
};

export type DatasetDetail = DatasetSummary & {
  availableFilters: {
    timeOfDay: string[];
    weather: string[];
    installationLocations: string[];
    categories: string[];
  };
};

export type SearchRequest = {
  imageFilters: {
    timeOfDay: string[];
    weather: string[];
    installationLocation: string[];
    location: string | null;
    tags: string[];
  };
  annotationFilters: {
    categories: string[];
    objectCounts: Array<{
      category: string;
      operator: "eq" | "lt" | "lte" | "gt" | "gte";
      value: number;
    }>;
    bbox: {
      width: BoundingBoxRequest | null;
      height: BoundingBoxRequest | null;
      area: BoundingBoxRequest | null;
      xCenter: BoundingBoxRequest | null;
      yCenter: BoundingBoxRequest | null;
    };
  };
  sort: {
    field: "fileName";
    direction: "asc" | "desc";
  };
  page: number;
  pageSize: number;
};

type BoundingBoxRequest = {
  operator: "eq" | "lt" | "lte" | "gt" | "gte";
  value: number;
};

export type DatasetSearchItem = {
  id: string;
  fileName: string;
  imageUrl: string;
  metadata: {
    timeOfDay: string | null;
    weather: string | null;
    installationLocation: string | null;
    location: string | null;
    tags: string[];
  };
  annotationSummary: Array<{
    category: string;
    count: number;
  }>;
};

export type DatasetSearchResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: DatasetSearchItem[];
};

export type ImageDetail = {
  id: string;
  fileName: string;
  imageUrl: string;
  metadata: DatasetSearchItem["metadata"];
  annotationSummary: DatasetSearchItem["annotationSummary"];
  annotationFile: {
    fileName: string;
    content: string;
  };
};

export async function getDatasets(): Promise<{ items: DatasetSummary[] }> {
  return apiRequest<{ items: DatasetSummary[] }>("/datasets");
}

export async function getDataset(datasetId: string): Promise<DatasetDetail> {
  return apiRequest<DatasetDetail>(`/datasets/${encodeURIComponent(datasetId)}`);
}

export async function searchDataset(
  datasetId: string,
  request: SearchRequest,
): Promise<DatasetSearchResponse> {
  return apiRequest<DatasetSearchResponse>(
    `/datasets/${encodeURIComponent(datasetId)}/search`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export async function getImageDetail(
  datasetId: string,
  imageId: string,
): Promise<ImageDetail> {
  return apiRequest<ImageDetail>(
    `/datasets/${encodeURIComponent(datasetId)}/images/${encodeURIComponent(imageId)}`,
  );
}
