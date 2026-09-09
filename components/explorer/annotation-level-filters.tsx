"use client";

import { useRef } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ANNOTATION_CATEGORIES,
  BOUNDING_BOX_FIELDS,
  BOUNDING_BOX_FIELD_LABELS,
  isBoundingBoxValueValid,
  isObjectCountValueValid,
  NUMERIC_OPERATORS,
  type AnnotationCategory,
  type AnnotationLevelFilterState,
  type BoundingBoxField,
  type NumericOperator,
  type ObjectCountCondition,
} from "@/lib/dataset-filtering";

type AnnotationLevelFiltersProps = {
  filters: AnnotationLevelFilterState;
  categorySearch: string;
  onCategorySearchChange: (value: string) => void;
  onChange: (filters: AnnotationLevelFilterState) => void;
};

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function OperatorOptions() {
  return NUMERIC_OPERATORS.map((operator) => (
    <option key={operator} value={operator}>
      {operator}
    </option>
  ));
}

export function AnnotationLevelFilters({
  filters,
  categorySearch,
  onCategorySearchChange,
  onChange,
}: AnnotationLevelFiltersProps) {
  const nextObjectCountId = useRef(2);
  const normalizedCategorySearch = categorySearch.trim().toLowerCase();
  const matchingCategories = ANNOTATION_CATEGORIES.filter(
    (category) =>
      !filters.selectedAnnotationCategories.includes(category) &&
      category.toLowerCase().includes(normalizedCategorySearch),
  );

  function addCategory(category: AnnotationCategory) {
    onChange({
      ...filters,
      selectedAnnotationCategories: [
        ...filters.selectedAnnotationCategories,
        category,
      ],
    });
    onCategorySearchChange("");
  }

  function removeCategory(category: AnnotationCategory) {
    onChange({
      ...filters,
      selectedAnnotationCategories:
        filters.selectedAnnotationCategories.filter(
          (selectedCategory) => selectedCategory !== category,
        ),
    });
  }

  function updateObjectCountCondition(
    id: string,
    patch: Partial<Omit<ObjectCountCondition, "id">>,
  ) {
    onChange({
      ...filters,
      objectCountConditions: filters.objectCountConditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition,
      ),
    });
  }

  function addObjectCountCondition() {
    let id = `object-count-${nextObjectCountId.current}`;
    nextObjectCountId.current += 1;

    while (
      filters.objectCountConditions.some((condition) => condition.id === id)
    ) {
      id = `object-count-${nextObjectCountId.current}`;
      nextObjectCountId.current += 1;
    }

    onChange({
      ...filters,
      objectCountConditions: [
        ...filters.objectCountConditions,
        {
          id,
          category:
            filters.selectedAnnotationCategories[0] ??
            ANNOTATION_CATEGORIES[0],
          operator: ">",
          value: "",
        },
      ],
    });
  }

  function removeObjectCountCondition(id: string) {
    onChange({
      ...filters,
      objectCountConditions: filters.objectCountConditions.filter(
        (condition) => condition.id !== id,
      ),
    });
  }

  function updateBoundingBoxCondition(
    key: BoundingBoxField,
    patch: Partial<
      AnnotationLevelFilterState["boundingBoxConditions"][BoundingBoxField]
    >,
  ) {
    onChange({
      ...filters,
      boundingBoxConditions: {
        ...filters.boundingBoxConditions,
        [key]: {
          ...filters.boundingBoxConditions[key],
          ...patch,
        },
      },
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="filter-category-search" className="text-xs font-medium">
          Category
        </label>
        <div className="group relative">
          <div className="rounded-lg border border-input bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            {filters.selectedAnnotationCategories.length > 0 ? (
              <div
                aria-label="Selected categories"
                className="mb-1.5 flex flex-wrap gap-1.5"
              >
                {filters.selectedAnnotationCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="gap-1 pr-1 font-normal"
                  >
                    {category}
                    <button
                      type="button"
                      aria-label={`Remove ${category} category`}
                      onClick={() => removeCategory(category)}
                      className="grid size-4 place-items-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X aria-hidden="true" className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            <Input
              id="filter-category-search"
              name="categorySearch"
              type="search"
              value={categorySearch}
              onChange={(event) =>
                onCategorySearchChange(event.target.value)
              }
              placeholder="Search categories…"
              autoComplete="off"
              aria-controls="category-search-results"
              aria-describedby="filter-category-help"
              className="h-7 border-0 bg-transparent px-1 focus-visible:ring-0"
            />
          </div>

          <div
            id="category-search-results"
            aria-label="Available categories"
            className="absolute z-20 mt-1 hidden max-h-40 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground group-focus-within:block"
          >
            {matchingCategories.length > 0 ? (
              matchingCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => addCategory(category)}
                  className="flex h-8 w-full items-center rounded-md px-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                >
                  {category}
                </button>
              ))
            ) : (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No categories found.
              </p>
            )}
          </div>
        </div>
        <p id="filter-category-help" className="text-[11px] text-muted-foreground">
          Search and select multiple categories.
        </p>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold">Object Count</legend>
        {filters.objectCountConditions.length > 0 ? (
          <div className="space-y-2">
            <div
              aria-hidden="true"
              className="grid grid-cols-[minmax(0,1fr)_4rem_3.75rem_1.75rem] gap-1.5 text-[11px] text-muted-foreground"
            >
              <span>Category</span>
              <span>Operator</span>
              <span>Value</span>
              <span />
            </div>
            {filters.objectCountConditions.map((condition, index) => (
              <div
                key={condition.id}
                className="grid grid-cols-[minmax(0,1fr)_4rem_3.75rem_1.75rem] items-center gap-1.5"
              >
                <label htmlFor={`${condition.id}-category`} className="sr-only">
                  Condition {index + 1} category
                </label>
                <select
                  id={`${condition.id}-category`}
                  value={condition.category}
                  onChange={(event) =>
                    updateObjectCountCondition(condition.id, {
                      category: event.target
                        .value as ObjectCountCondition["category"],
                    })
                  }
                  className={selectClassName}
                >
                  <option value="">Select</option>
                  {ANNOTATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <label htmlFor={`${condition.id}-operator`} className="sr-only">
                  Condition {index + 1} operator
                </label>
                <select
                  id={`${condition.id}-operator`}
                  value={condition.operator}
                  onChange={(event) =>
                    updateObjectCountCondition(condition.id, {
                      operator: event.target.value as NumericOperator,
                    })
                  }
                  className={selectClassName}
                >
                  <OperatorOptions />
                </select>
                <label htmlFor={`${condition.id}-value`} className="sr-only">
                  Condition {index + 1} value
                </label>
                <Input
                  id={`${condition.id}-value`}
                  type="number"
                  min="0"
                  step="1"
                  value={condition.value}
                  aria-invalid={
                    !isObjectCountValueValid(condition.value)
                  }
                  onChange={(event) =>
                    updateObjectCountCondition(condition.id, {
                      value: event.target.value,
                    })
                  }
                  className="px-2"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove object count condition ${index + 1}`}
                  title="Remove condition"
                  onClick={() => removeObjectCountCondition(condition.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
            No object count conditions.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addObjectCountCondition}
          className="w-full"
        >
          + Add Condition
        </Button>
      </fieldset>

      <fieldset className="space-y-2.5" aria-describedby="bounding-box-help">
        <legend className="text-xs font-semibold">Bounding Box</legend>
        <p id="bounding-box-help" className="text-[11px] text-muted-foreground">
          Values use normalized YOLO coordinates.
        </p>
        <div className="space-y-2">
          {BOUNDING_BOX_FIELDS.map((field) => {
            const condition = filters.boundingBoxConditions[field];
            const fieldId = field.replace(
              /[A-Z]/g,
              (character) => `-${character.toLowerCase()}`,
            );
            const fieldLabel = BOUNDING_BOX_FIELD_LABELS[field];
            const operatorId = `bounding-box-${fieldId}-operator`;
            const valueId = `bounding-box-${fieldId}-value`;

            return (
              <div
                key={field}
                className="grid grid-cols-[minmax(0,1fr)_4.25rem_4.75rem] items-center gap-2"
              >
                <label htmlFor={valueId} className="truncate text-xs">
                  {fieldLabel}
                </label>
                <label htmlFor={operatorId} className="sr-only">
                  {fieldLabel} operator
                </label>
                <select
                  id={operatorId}
                  value={condition.operator}
                  onChange={(event) =>
                    updateBoundingBoxCondition(field, {
                      operator: event.target.value as NumericOperator,
                    })
                  }
                  className={selectClassName}
                >
                  <OperatorOptions />
                </select>
                <Input
                  id={valueId}
                  type="number"
                  min="0"
                  max="1"
                  step="any"
                  value={condition.value}
                  aria-invalid={
                    !isBoundingBoxValueValid(condition.value)
                  }
                  onChange={(event) =>
                    updateBoundingBoxCondition(field, {
                      value: event.target.value,
                    })
                  }
                  placeholder="Value"
                  className="px-2"
                />
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
