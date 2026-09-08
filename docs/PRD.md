# REC Dataset Explorer — Product Requirements Document

## 1. Product Summary

REC Dataset Explorer is an internal web application for AI/ML engineers to search, filter, inspect, and generate computer vision datasets without manually manipulating the raw dataset.

The application works with image datasets, YOLO annotation files, and image metadata.

The original/source dataset must never be modified.

---

## 2. Main Problem

Currently, engineers need to manually:

- copy entire datasets
- inspect annotation files
- remove unnecessary classes
- delete irrelevant images
- write scripts to filter objects by bounding-box conditions
- regenerate annotation files

The goal of this product is to abstract these common dataset operations into reusable services exposed through a simple web interface.

---

## 3. Target Users

Primary users:

- AI / ML Engineers
- Computer Vision Engineers
- Researchers
- Dataset Engineers
- Internal REC engineering teams

---

## 4. Core Workflow

Datasets
→ Open Dataset
→ Image-Level Filtering
→ Annotation-Level Filtering
→ Review Results
→ Select Images
→ Export Dataset
→ Download Generated Dataset

---

## 5. Dataset Structure

Each dataset contains:

- Images
- YOLO TXT annotation files
- Image-level metadata

Each image can contain multiple object annotations.

Image-level metadata and annotation-level information must be treated separately.

---

## 6. Image-Level Filtering

The first filtering phase selects candidate images using image metadata.

Supported filters include:

- Time of Day

  - Daytime
  - Nighttime

- Weather

  - Sunny
  - Cloudy
  - Rainy
  - Foggy
  - Other

- Installation Location

  - Front
  - Rear
  - Side

- Location

- Additional image tags

---

## 7. Annotation-Level Filtering

After candidate images are selected, users can filter annotations based on object-level information.

Supported filters:

### Category

Examples:

- Person
- Car
- Bus
- Truck
- Bicycle
- Rider

Multiple categories may be selected.

### Object Count

Users can define conditions such as:

- Person > 3
- Car < 5

Supported operators:

- Equal
- Less than
- Less than or equal
- Greater than
- Greater than or equal

### Bounding Box

Supported properties:

- Width
- Height
- Area
- X Center
- Y Center

YOLO bounding-box values use normalized coordinates.

Filtering must support both small and large object conditions.

---

## 8. Search Results

The Dataset Explorer displays images matching the active filters.

Each result should show:

- image thumbnail
- filename
- relevant image metadata
- object/category summary

Bounding boxes must NOT be rendered on images.

The application is not an annotation editor.

---

## 9. Image Detail

Clicking an image opens a side drawer.

The drawer may show:

- original image
- image metadata
- annotation category summary
- original YOLO TXT file

The drawer must NOT provide:

- bounding-box visualization
- annotation editing
- annotation creation
- confidence-score editing

---

## 10. Selection

Users can:

- select individual images
- select the current page
- select all filtered results
- clear the selection

The selected result set is used for export.

---

## 11. Dataset Export

The application provides exactly three export modes.

### Option 1 — Images + YOLO Annotations

Export selected images together with regenerated YOLO TXT files containing only annotations that satisfy the active filters.

### Option 2 — Annotation Files Only

Export only regenerated YOLO TXT annotation files.

### Option 3 — Complete Dataset Package

Export:

- selected images
- regenerated YOLO annotation files
- related metadata/configuration

The package may be delivered as a ZIP file.

---

## 12. Annotation Generation Behavior

Annotation filtering must be non-destructive.

Example:

Original image annotations:

- Person
- Person
- Car
- Bus

Filter:

Category = Person

Generated annotation:

- Person
- Person

The original annotation file remains unchanged.

If an image has no annotations remaining after annotation filtering, it should not be included in the generated training dataset.

---

## 13. Dataset Upload

The system provides an upload tool for structured datasets.

The user is responsible for preparing the dataset in the correct format.

The application may perform basic validation such as:

- checking image/annotation pairs
- checking required files
- checking readable annotation format

The application should report errors but should not automatically repair malformed datasets.

---

## 14. MVP Pages

Required pages/features:

- Dataset List
- Upload Dataset
- Upload Progress / Validation
- Dataset Explorer
- Image Detail Drawer
- Result Selection
- Export Modal
- Export Progress
- Export Success
- Empty / No Result States

---

## 15. Out of Scope for MVP

Do NOT implement:

- Object detection / AI inference
- Bounding-box visualization
- Bounding-box editing
- Annotation editing
- Add annotation
- Detection confidence
- Model training
- Model management
- Analytics dashboard
- Authentication / advanced user management
- Saved filter presets
- Query DSL
- Storage infrastructure dashboard

---

## 16. Product Principle

The product should prioritize:

1. Fast dataset exploration
2. Clear separation between image-level and annotation-level filtering
3. Simple filter configuration
4. Easy result selection
5. Predictable dataset export
6. Non-destructive dataset processing
7. Usability for AI/ML engineers
