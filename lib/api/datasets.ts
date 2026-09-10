import { apiRequest } from "@/lib/api/client";
import {
  BOUNDING_BOX_FIELDS,
  type DatasetFilters,
  type NumericOperator,
} from "@/lib/dataset-filtering";

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

export type BoundingBoxRequest = {
  operator: "eq" | "lt" | "lte" | "gt" | "gte";
  value: number;
};

function toBackendOperator(operator: NumericOperator) {
  const operators = {
    "=": "eq",
    "<": "lt",
    "<=": "lte",
    ">": "gt",
    ">=": "gte",
  } as const;

  return operators[operator];
}

export function toBackendSearchRequest(filters: DatasetFilters): SearchRequest {
  const bbox = Object.fromEntries(
    BOUNDING_BOX_FIELDS.map((field) => {
      const condition = filters.boundingBoxConditions[field];
      const value = Number(condition.value.trim());

      return [
        field,
        condition.value.trim() === ""
          ? null
          : { operator: toBackendOperator(condition.operator), value },
      ];
    }),
  ) as SearchRequest["annotationFilters"]["bbox"];

  return {
    imageFilters: {
      timeOfDay: filters.timeOfDay ? [filters.timeOfDay.toLowerCase()] : [],
      weather: filters.weather ? [filters.weather.toLowerCase()] : [],
      installationLocation: filters.installationLocation
        ? [filters.installationLocation.toLowerCase()]
        : [],
      location: filters.location || null,
      tags: filters.tags.map((tag) => tag.toLowerCase()),
    },
    annotationFilters: {
      categories: filters.selectedAnnotationCategories.map((category) =>
        category.trim(),
      ),
      objectCounts: filters.objectCountConditions
        .filter(
          (condition) => condition.category !== "" && condition.value.trim() !== "",
        )
        .map((condition) => ({
          category: condition.category.trim(),
          operator: toBackendOperator(condition.operator),
          value: Number(condition.value),
        })),
      bbox,
    },
    sort: { field: "fileName", direction: "asc" },
    page: 1,
    pageSize: 24,
  };
}

export function toBackendExportFilters(filters: DatasetFilters) {
  const request = toBackendSearchRequest(filters);
  return {
    imageFilters: request.imageFilters,
    annotationFilters: request.annotationFilters,
  };
}

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
