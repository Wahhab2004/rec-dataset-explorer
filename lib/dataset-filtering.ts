export const TIME_OF_DAY_OPTIONS = ["Daytime", "Nighttime"] as const;

export const WEATHER_OPTIONS = [
  "Sunny",
  "Cloudy",
  "Rainy",
  "Foggy",
  "Other",
] as const;

export const INSTALLATION_LOCATION_OPTIONS = [
  "Front",
  "Rear",
  "Side",
] as const;

export const ANNOTATION_CATEGORIES = [
  "Person",
  "Car",
  "Bus",
  "Truck",
  "Bicycle",
  "Rider",
] as const;

export const NUMERIC_OPERATORS = ["=", "<", "<=", ">", ">="] as const;

export const BOUNDING_BOX_FIELDS = [
  "width",
  "height",
  "area",
  "xCenter",
  "yCenter",
] as const;

export type TimeOfDay = (typeof TIME_OF_DAY_OPTIONS)[number];
export type Weather = (typeof WEATHER_OPTIONS)[number];
export type InstallationLocation =
  (typeof INSTALLATION_LOCATION_OPTIONS)[number];
export type AnnotationCategory = (typeof ANNOTATION_CATEGORIES)[number];
export type NumericOperator = (typeof NUMERIC_OPERATORS)[number];
export type BoundingBoxField = (typeof BOUNDING_BOX_FIELDS)[number];

export const BOUNDING_BOX_FIELD_LABELS = {
  width: "Width",
  height: "Height",
  area: "Area",
  xCenter: "X Center",
  yCenter: "Y Center",
} as const satisfies Readonly<Record<BoundingBoxField, string>>;

export type DatasetAnnotation = Readonly<{
  category: AnnotationCategory;
  width: number;
  height: number;
  area: number;
  xCenter: number;
  yCenter: number;
}>;

export type DatasetImage = Readonly<{
  id: string;
  filename: string;
  timeOfDay: TimeOfDay;
  weather: Weather;
  installationLocation: InstallationLocation;
  location: string;
  tags: readonly string[];
  annotations: readonly DatasetAnnotation[];
}>;

export type NumericFilterCondition = Readonly<{
  operator: NumericOperator;
  value: string;
}>;

export type ObjectCountCondition = Readonly<{
  id: string;
  category: AnnotationCategory | "";
  operator: NumericOperator;
  value: string;
}>;

export type BoundingBoxConditions = Readonly<
  Record<BoundingBoxField, NumericFilterCondition>
>;

export type ImageLevelFilterState = Readonly<{
  timeOfDay: TimeOfDay | "";
  weather: Weather | "";
  installationLocation: InstallationLocation | "";
  location: string;
  tags: readonly string[];
}>;

export type AnnotationLevelFilterState = Readonly<{
  selectedAnnotationCategories: readonly AnnotationCategory[];
  objectCountConditions: readonly ObjectCountCondition[];
  boundingBoxConditions: BoundingBoxConditions;
}>;

export type DatasetFilters = ImageLevelFilterState &
  AnnotationLevelFilterState;

export type ActiveFilterChip = Readonly<{
  id: string;
  label: string;
}>;

type CompleteBoundingBoxCondition = Readonly<{
  field: BoundingBoxField;
  operator: NumericOperator;
  value: number;
}>;

type CompleteObjectCountCondition = Readonly<{
  category: AnnotationCategory;
  operator: NumericOperator;
  value: number;
}>;

const TIME_OF_DAY_CHIP_ID = "image:time-of-day";
const WEATHER_CHIP_ID = "image:weather";
const INSTALLATION_LOCATION_CHIP_ID = "image:installation-location";
const LOCATION_CHIP_ID = "image:location";

function tagChipId(tag: string) {
  return `image:tag:${encodeURIComponent(normalizeSearchValue(tag))}`;
}

function annotationCategoryChipId(category: AnnotationCategory) {
  return `annotation:category:${encodeURIComponent(category)}`;
}

function objectCountChipId(id: string) {
  return `annotation:object-count:${id}`;
}

function boundingBoxChipId(field: BoundingBoxField) {
  return `annotation:bounding-box:${field}`;
}

function parseNumericValue(value: string) {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseObjectCountValue(value: string) {
  const parsedValue = parseNumericValue(value);

  if (
    parsedValue === null ||
    parsedValue < 0 ||
    !Number.isInteger(parsedValue)
  ) {
    return null;
  }

  return parsedValue;
}

function parseBoundingBoxValue(value: string) {
  const parsedValue = parseNumericValue(value);

  if (parsedValue === null || parsedValue < 0 || parsedValue > 1) {
    return null;
  }

  return parsedValue;
}

function compareNumbers(
  actual: number,
  operator: NumericOperator,
  expected: number,
) {
  switch (operator) {
    case "=":
      return actual === expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
  }
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function getCompleteBoundingBoxConditions(
  conditions: BoundingBoxConditions,
) {
  const completeConditions: CompleteBoundingBoxCondition[] = [];

  for (const field of BOUNDING_BOX_FIELDS) {
    const condition = conditions[field];
    const value = parseBoundingBoxValue(condition.value);

    if (value !== null) {
      completeConditions.push({
        field,
        operator: condition.operator,
        value,
      });
    }
  }

  return completeConditions;
}

function getCompleteObjectCountConditions(
  conditions: readonly ObjectCountCondition[],
) {
  const completeConditions: CompleteObjectCountCondition[] = [];

  for (const condition of conditions) {
    const value = parseObjectCountValue(condition.value);

    if (condition.category !== "" && value !== null) {
      completeConditions.push({
        category: condition.category,
        operator: condition.operator,
        value,
      });
    }
  }

  return completeConditions;
}

function matchesImageLevelFilters(
  image: DatasetImage,
  filters: ImageLevelFilterState,
) {
  if (filters.timeOfDay !== "" && image.timeOfDay !== filters.timeOfDay) {
    return false;
  }

  if (filters.weather !== "" && image.weather !== filters.weather) {
    return false;
  }

  if (
    filters.installationLocation !== "" &&
    image.installationLocation !== filters.installationLocation
  ) {
    return false;
  }

  const locationQuery = normalizeSearchValue(filters.location);
  if (
    locationQuery !== "" &&
    !normalizeSearchValue(image.location).includes(locationQuery)
  ) {
    return false;
  }

  const imageTags = image.tags.map(normalizeSearchValue);
  const activeTags = filters.tags
    .map(normalizeSearchValue)
    .filter((tag) => tag !== "");

  return activeTags.every((tag) => imageTags.includes(tag));
}

function matchesObjectCountConditions(
  image: DatasetImage,
  conditions: readonly CompleteObjectCountCondition[],
) {
  return conditions.every((condition) => {
    const count = image.annotations.reduce(
      (total, annotation) =>
        annotation.category === condition.category ? total + 1 : total,
      0,
    );

    return compareNumbers(count, condition.operator, condition.value);
  });
}

function matchesCategoryAndBoundingBoxConditions(
  image: DatasetImage,
  selectedCategories: readonly AnnotationCategory[],
  boundingBoxConditions: readonly CompleteBoundingBoxCondition[],
) {
  const hasCategoryFilter = selectedCategories.length > 0;
  const hasBoundingBoxFilter = boundingBoxConditions.length > 0;

  if (!hasCategoryFilter && !hasBoundingBoxFilter) {
    return true;
  }

  return image.annotations.some((annotation) => {
    if (
      hasCategoryFilter &&
      !selectedCategories.includes(annotation.category)
    ) {
      return false;
    }

    return boundingBoxConditions.every((condition) =>
      compareNumbers(
        annotation[condition.field],
        condition.operator,
        condition.value,
      ),
    );
  });
}

export function createEmptyDatasetFilters(): DatasetFilters {
  return {
    timeOfDay: "",
    weather: "",
    installationLocation: "",
    location: "",
    tags: [],
    selectedAnnotationCategories: [],
    objectCountConditions: [
      {
        id: "object-count-1",
        category: ANNOTATION_CATEGORIES[0],
        operator: ">",
        value: "",
      },
    ],
    boundingBoxConditions: {
      width: { operator: "=", value: "" },
      height: { operator: "=", value: "" },
      area: { operator: ">", value: "" },
      xCenter: { operator: "=", value: "" },
      yCenter: { operator: "=", value: "" },
    },
  };
}

export function isObjectCountValueValid(value: string) {
  return value.trim() === "" || parseObjectCountValue(value) !== null;
}

export function isBoundingBoxValueValid(value: string) {
  return value.trim() === "" || parseBoundingBoxValue(value) !== null;
}

export function areDatasetFiltersValid(filters: DatasetFilters) {
  return (
    filters.objectCountConditions.every((condition) =>
      isObjectCountValueValid(condition.value),
    ) &&
    BOUNDING_BOX_FIELDS.every((field) =>
      isBoundingBoxValueValid(filters.boundingBoxConditions[field].value),
    )
  );
}

export function normalizeDatasetFilters(
  filters: DatasetFilters,
): DatasetFilters {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of filters.tags) {
    const trimmedTag = tag.trim();
    const normalizedTag = normalizeSearchValue(trimmedTag);

    if (normalizedTag !== "" && !seenTags.has(normalizedTag)) {
      seenTags.add(normalizedTag);
      normalizedTags.push(trimmedTag);
    }
  }

  return {
    ...filters,
    location: filters.location.trim(),
    tags: normalizedTags,
  };
}

export function filterDatasetImages(
  images: readonly DatasetImage[],
  filters: DatasetFilters,
) {
  const imageLevelCandidates = images.filter((image) =>
    matchesImageLevelFilters(image, filters),
  );

  const objectCountConditions = getCompleteObjectCountConditions(
    filters.objectCountConditions,
  );
  const boundingBoxConditions = getCompleteBoundingBoxConditions(
    filters.boundingBoxConditions,
  );

  return imageLevelCandidates.filter(
    (image) =>
      matchesObjectCountConditions(image, objectCountConditions) &&
      matchesCategoryAndBoundingBoxConditions(
        image,
        filters.selectedAnnotationCategories,
        boundingBoxConditions,
      ),
  );
}

export function getActiveFilterChips(filters: DatasetFilters) {
  const chips: ActiveFilterChip[] = [];

  if (filters.timeOfDay !== "") {
    chips.push({ id: TIME_OF_DAY_CHIP_ID, label: filters.timeOfDay });
  }

  if (filters.weather !== "") {
    chips.push({ id: WEATHER_CHIP_ID, label: filters.weather });
  }

  if (filters.installationLocation !== "") {
    chips.push({
      id: INSTALLATION_LOCATION_CHIP_ID,
      label: filters.installationLocation,
    });
  }

  if (filters.location.trim() !== "") {
    chips.push({
      id: LOCATION_CHIP_ID,
      label: `Location: ${filters.location.trim()}`,
    });
  }

  const tagChipIds = new Set<string>();
  filters.tags.forEach((tag) => {
    if (tag.trim() !== "") {
      const id = tagChipId(tag);

      if (!tagChipIds.has(id)) {
        tagChipIds.add(id);
        chips.push({ id, label: `Tag: ${tag.trim()}` });
      }
    }
  });

  filters.selectedAnnotationCategories.forEach((category) => {
    chips.push({ id: annotationCategoryChipId(category), label: category });
  });

  filters.objectCountConditions.forEach((condition) => {
    if (
      condition.category !== "" &&
      parseObjectCountValue(condition.value) !== null
    ) {
      chips.push({
        id: objectCountChipId(condition.id),
        label: `${condition.category} ${condition.operator} ${condition.value.trim()}`,
      });
    }
  });

  for (const field of BOUNDING_BOX_FIELDS) {
    const condition = filters.boundingBoxConditions[field];

    if (parseBoundingBoxValue(condition.value) !== null) {
      chips.push({
        id: boundingBoxChipId(field),
        label: `BBox ${BOUNDING_BOX_FIELD_LABELS[field]} ${condition.operator} ${condition.value.trim()}`,
      });
    }
  }

  return chips;
}

export function removeActiveFilter(
  filters: DatasetFilters,
  chipId: string,
): DatasetFilters {
  if (chipId === TIME_OF_DAY_CHIP_ID) {
    return { ...filters, timeOfDay: "" };
  }

  if (chipId === WEATHER_CHIP_ID) {
    return { ...filters, weather: "" };
  }

  if (chipId === INSTALLATION_LOCATION_CHIP_ID) {
    return { ...filters, installationLocation: "" };
  }

  if (chipId === LOCATION_CHIP_ID) {
    return { ...filters, location: "" };
  }

  const hasMatchingTag = filters.tags.some((tag) => tagChipId(tag) === chipId);
  if (hasMatchingTag) {
    return {
      ...filters,
      tags: filters.tags.filter((tag) => tagChipId(tag) !== chipId),
    };
  }

  const hasMatchingCategory = filters.selectedAnnotationCategories.some(
    (category) => annotationCategoryChipId(category) === chipId,
  );
  if (hasMatchingCategory) {
    return {
      ...filters,
      selectedAnnotationCategories:
        filters.selectedAnnotationCategories.filter(
          (category) => annotationCategoryChipId(category) !== chipId,
        ),
    };
  }

  const objectCountIndex = filters.objectCountConditions.findIndex(
    (condition) => objectCountChipId(condition.id) === chipId,
  );
  if (objectCountIndex !== -1) {
    return {
      ...filters,
      objectCountConditions: filters.objectCountConditions.map(
        (condition, index) =>
          index === objectCountIndex
            ? { ...condition, value: "" }
            : condition,
      ),
    };
  }

  const boundingBoxField = BOUNDING_BOX_FIELDS.find(
    (field) => boundingBoxChipId(field) === chipId,
  );
  if (boundingBoxField !== undefined) {
    return {
      ...filters,
      boundingBoxConditions: {
        ...filters.boundingBoxConditions,
        [boundingBoxField]: {
          ...filters.boundingBoxConditions[boundingBoxField],
          value: "",
        },
      },
    };
  }

  return { ...filters };
}
