# REC Dataset Explorer Dataset Import Format

This document defines the dataset package accepted by the REC Dataset Explorer MVP.

## MVP Scope

- Import format: ZIP package
- Annotation format: YOLO only
- The original package must be prepared correctly by the user.
- The application reports malformed dataset errors but does not automatically repair datasets.
- COCO, VOC, conversion, upload API behavior, ZIP parsing, and database ingestion are outside this document.

## ZIP Package Structure

The ZIP file must contain this structure at its root:

```text
dataset.zip
├── images/
│   ├── image_000001.jpg
│   └── image_000002.jpg
├── labels/
│   ├── image_000001.txt
│   └── image_000002.txt
└── metadata/
    └── metadata.json
```

Required directories and file:

- `images/`
- `labels/`
- `metadata/metadata.json`

Image files may use the supported image formats configured by the importer. The file basename, excluding its extension, must match the corresponding label basename.

Example:

```text
images/image_000001.jpg
labels/image_000001.txt
```

## YOLO Annotation Format

Each non-empty row in a label file must contain exactly five whitespace-separated values:

```text
<class_index> <x_center> <y_center> <width> <height>
```

Example:

```text
0 0.512 0.431 0.120 0.350
2 0.625 0.580 0.400 0.250
```

Rules:

- `class_index` is an integer.
- `class_index` must exist in `metadata.json` under `classes[].index`.
- `x_center`, `y_center`, `width`, and `height` are normalized YOLO values.
- Every bounding-box value must be between `0` and `1`, inclusive.
- Empty label files are allowed for images with no annotations.
- Confidence scores are not supported.
- Segmentation data is not supported.

## metadata.json

The required metadata file is `metadata/metadata.json`.

Example:

```json
{
  "classes": [
    {
      "index": 0,
      "name": "person"
    },
    {
      "index": 1,
      "name": "bicycle"
    },
    {
      "index": 2,
      "name": "car"
    }
  ],
  "images": [
    {
      "fileName": "image_000001.jpg",
      "timeOfDay": "daytime",
      "weather": "sunny",
      "installationLocation": "front",
      "location": "Taipei",
      "tags": ["urban", "intersection"]
    }
  ]
}
```

### `classes`

- Required.
- Must be an array.
- Each entry must contain an integer `index` and a string `name`.
- Class indexes must be unique.
- Class names should be non-empty.
- Every class index referenced by a YOLO annotation must be defined here.

### `images`

- Required.
- Must be an array.
- There must be exactly one metadata record for every image in `images/`.
- Each entry must contain `fileName`.
- `fileName` must match a file in `images/`.
- Duplicate image metadata filenames are rejected.

Supported image metadata fields:

| Field | Required | Rules |
| --- | --- | --- |
| `fileName` | Yes | Must match a file in `images/` |
| `timeOfDay` | No | Recommended values: `daytime`, `nighttime` |
| `weather` | No | Image weather value, such as `sunny`, `cloudy`, `rainy`, or `foggy` |
| `installationLocation` | No | Recommended values: `front`, `rear`, `side` |
| `location` | No | Free-form location string |
| `tags` | No | String array; defaults to `[]` when omitted |

Unknown metadata fields may be ignored or preserved as implementation details, but the fields above define the MVP contract.

## Validation Rules

The importer must reject the package when any of these conditions is true:

1. The ZIP structure is invalid.
2. `images/` does not exist.
3. `labels/` does not exist.
4. `metadata/metadata.json` does not exist.
5. An image does not have a matching TXT file.
6. A TXT file does not have a matching image.
7. An image does not have a metadata entry.
8. A YOLO class index does not exist in `metadata.classes`.
9. A YOLO row does not contain exactly five values.
10. A YOLO bounding-box value is outside the normalized range `0` to `1`, or is not numeric where a numeric value is required.
11. Duplicate image filenames are present in the package or metadata.
12. `metadata/metadata.json` contains invalid JSON.

Matching is based on the image basename. For example, `images/frame_001.jpg` must match `labels/frame_001.txt` and the metadata record with `fileName` set to `frame_001.jpg`.

Additional malformed conditions, such as unreadable image files or unsafe ZIP paths, may also be rejected by the importer.

## Non-Destructive Error Handling

Malformed dataset errors must be reported to the user. The application must not:

- rename files automatically
- create missing labels
- create missing metadata records
- infer missing classes
- rewrite invalid YOLO rows
- change normalized coordinates
- delete unrelated files
- silently skip invalid files

Preparing the dataset correctly is the user's responsibility.

## Example Complete Package

```text
dataset.zip
├── images/
│   ├── image_000001.jpg
│   └── image_000002.jpg
├── labels/
│   ├── image_000001.txt
│   └── image_000002.txt
└── metadata/
    └── metadata.json
```

`metadata/metadata.json`:

```json
{
  "classes": [
    {"index": 0, "name": "person"},
    {"index": 1, "name": "bicycle"},
    {"index": 2, "name": "car"}
  ],
  "images": [
    {
      "fileName": "image_000001.jpg",
      "timeOfDay": "daytime",
      "weather": "sunny",
      "installationLocation": "front",
      "location": "Taipei",
      "tags": ["urban", "intersection"]
    },
    {
      "fileName": "image_000002.jpg",
      "timeOfDay": "nighttime",
      "weather": "rainy",
      "installationLocation": "rear",
      "location": "Taipei",
      "tags": ["wet-road"]
    }
  ]
}
```

`labels/image_000001.txt`:

```text
0 0.512 0.431 0.120 0.350
2 0.625 0.580 0.400 0.250
```

`labels/image_000002.txt`:

```text
2 0.420 0.610 0.220 0.180
```

## Out of Scope

This format contract does not implement or define:

- upload API behavior
- ZIP parsing implementation
- database ingestion
- automatic dataset repair
- COCO conversion
- VOC conversion
- frontend behavior
