# REC Dataset Explorer API Contract

This document defines the API contract between the existing Next.js frontend and the future FastAPI backend.

## Conventions

- Base path: `/api/v1`
- Use JSON unless an endpoint explicitly uploads or downloads files.
- Backend-generated IDs are string UUIDs.
- Timestamps use ISO 8601 format.
- The original/source dataset and annotation files must remain unchanged.

## Common Error Response

All API errors use this shape:

```json
{
  "error": {
    "code": "DATASET_NOT_FOUND",
    "message": "Dataset not found",
    "details": null
  }
}
```

## 1. Dataset List

### `GET /api/v1/datasets`

Returns datasets shown on the Datasets page.

#### Response `200`

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "BDD100K Demo",
      "description": "Demo computer vision dataset",
      "imageCount": 70000,
      "annotationFormat": "YOLO",
      "status": "ready",
      "createdAt": "2026-09-08T10:00:00Z",
      "updatedAt": "2026-09-08T10:00:00Z"
    }
  ]
}
```

Possible dataset statuses:

- `processing`
- `ready`
- `failed`

## 2. Dataset Detail

### `GET /api/v1/datasets/{datasetId}`

#### Response `200`

```json
{
  "id": "uuid",
  "name": "BDD100K Demo",
  "description": "Demo computer vision dataset",
  "imageCount": 70000,
  "annotationFormat": "YOLO",
  "status": "ready",
  "availableFilters": {
    "timeOfDay": ["daytime", "nighttime"],
    "weather": ["sunny", "cloudy", "rainy", "foggy"],
    "installationLocations": ["front", "rear", "side"],
    "categories": ["person", "car", "bus", "truck", "bicycle", "rider"]
  },
  "createdAt": "2026-09-08T10:00:00Z",
  "updatedAt": "2026-09-08T10:00:00Z"
}
```

## 3. Dataset Search and Filtering

### `POST /api/v1/datasets/{datasetId}/search`

Performs image-level filtering first, followed by annotation-level filtering.

#### Request

```json
{
  "imageFilters": {
    "timeOfDay": ["nighttime"],
    "weather": ["rainy"],
    "installationLocation": ["front"],
    "location": null,
    "tags": ["urban"]
  },
  "annotationFilters": {
    "categories": ["person"],
    "objectCounts": [
      {
        "category": "person",
        "operator": "gt",
        "value": 3
      }
    ],
    "bbox": {
      "width": null,
      "height": null,
      "area": {
        "operator": "gt",
        "value": 0.02
      },
      "xCenter": null,
      "yCenter": null
    }
  },
  "sort": {
    "field": "fileName",
    "direction": "asc"
  },
  "page": 1,
  "pageSize": 24
}
```

Supported numeric operators:

- `eq`
- `lt`
- `lte`
- `gt`
- `gte`

YOLO bounding-box values are normalized between `0` and `1`.

#### Response `200`

```json
{
  "total": 1248,
  "page": 1,
  "pageSize": 24,
  "items": [
    {
      "id": "uuid",
      "fileName": "image_000123.jpg",
      "imageUrl": "/api/v1/files/...",
      "metadata": {
        "timeOfDay": "nighttime",
        "weather": "rainy",
        "installationLocation": "front",
        "location": "Taipei",
        "tags": ["urban"]
      },
      "annotationSummary": [
        {
          "category": "person",
          "count": 4
        },
        {
          "category": "car",
          "count": 2
        }
      ]
    }
  ]
}
```

Important behavior:

- Image filters are evaluated first.
- Annotation filters are evaluated only against candidate images.
- Search must not modify the original dataset or annotation files.
- Bounding boxes are not rendered by this endpoint.

## 4. Image Detail

### `GET /api/v1/datasets/{datasetId}/images/{imageId}`

#### Response `200`

```json
{
  "id": "uuid",
  "fileName": "image_000123.jpg",
  "imageUrl": "/api/v1/files/...",
  "metadata": {
    "timeOfDay": "nighttime",
    "weather": "rainy",
    "installationLocation": "front",
    "location": "Taipei",
    "tags": ["urban"]
  },
  "annotationSummary": [
    {
      "category": "person",
      "count": 4
    }
  ],
  "annotationFile": {
    "fileName": "image_000123.txt",
    "content": "0 0.512 0.431 0.120 0.350\n..."
  }
}
```

Do not return detection confidence unless it is explicitly added to the product requirements later.

## 5. Dataset Upload and Import

### `POST /api/v1/dataset-imports`

Uses `multipart/form-data`.

Fields:

- `name`: string
- `description`: optional string
- `annotationFormat`: `YOLO`
- `file`: structured dataset package

The user is responsible for preparing the dataset correctly. The backend may validate the dataset, but must not automatically repair malformed data.

#### Response `202`

```json
{
  "importId": "uuid",
  "status": "processing"
}
```

## 6. Upload and Import Status

### `GET /api/v1/dataset-imports/{importId}`

#### Processing response

```json
{
  "id": "uuid",
  "status": "processing",
  "progress": 58,
  "stage": "processing_annotations",
  "processedImages": 7240,
  "totalImages": 12450
}
```

Possible stages:

- `uploading`
- `validating_structure`
- `processing_images`
- `processing_annotations`
- `loading_metadata`
- `creating_records`

#### Success response

```json
{
  "id": "uuid",
  "status": "completed",
  "progress": 100,
  "datasetId": "uuid",
  "summary": {
    "images": 12450,
    "annotationFiles": 12450,
    "metadataLoaded": true,
    "annotationFormat": "YOLO"
  }
}
```

#### Validation failure response

```json
{
  "id": "uuid",
  "status": "failed",
  "progress": 100,
  "errors": [
    {
      "code": "MISSING_ANNOTATION",
      "message": "12 images are missing annotation files"
    },
    {
      "code": "UNMATCHED_ANNOTATION",
      "message": "3 annotation files have no matching image"
    }
  ]
}
```

## 7. Create Export Job

### `POST /api/v1/datasets/{datasetId}/exports`

Generates a filtered dataset without modifying the source dataset.

Exactly three export types are supported:

- `images_and_annotations`
- `annotations_only`
- `complete_dataset`

#### Request with explicit selection

```json
{
  "exportType": "images_and_annotations",
  "selection": {
    "mode": "explicit",
    "imageIds": ["uuid-1", "uuid-2"]
  },
  "filters": {
    "imageFilters": {
      "timeOfDay": ["nighttime"]
    },
    "annotationFilters": {
      "categories": ["person"],
      "objectCounts": [],
      "bbox": {
        "width": null,
        "height": null,
        "area": null,
        "xCenter": null,
        "yCenter": null
      }
    }
  }
}
```

#### Request selecting all filtered results

```json
{
  "exportType": "complete_dataset",
  "selection": {
    "mode": "all_filtered"
  },
  "filters": {
    "imageFilters": {},
    "annotationFilters": {}
  }
}
```

#### Response `202`

```json
{
  "exportId": "uuid",
  "status": "processing"
}
```

## 8. Export Status

### `GET /api/v1/exports/{exportId}`

#### Processing response

```json
{
  "id": "uuid",
  "status": "processing",
  "progress": 65,
  "stage": "generating_annotations"
}
```

Possible stages:

- `preparing_images`
- `generating_annotations`
- `preparing_metadata`
- `creating_package`

#### Success response

```json
{
  "id": "uuid",
  "status": "completed",
  "progress": 100,
  "summary": {
    "selectedImages": 1248,
    "generatedAnnotationFiles": 1248,
    "exportType": "complete_dataset"
  },
  "fileName": "bdd100k-demo_filtered.zip"
}
```

The original dataset must remain unchanged.

## 9. Download Export

### `GET /api/v1/exports/{exportId}/download`

Downloads the generated export file.

The backend should set appropriate `Content-Type` and `Content-Disposition` headers.

## 10. Frontend Integration Rule

The frontend should eventually replace mock services with these API endpoints.

UI components should not directly contain raw `fetch` calls. All HTTP communication should later be centralized through a frontend API/service layer.

This task does not implement that integration.

## 11. Out of Scope

Do not define API endpoints for:

- authentication
- annotation editing
- bounding-box editing
- object detection
- model training
- confidence scores
- analytics dashboard
- saved filter presets
