import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const operators = ["=", "<", "<=", ">", ">="] as const;

const categories = ["Person", "Car", "Bus", "Truck", "Bicycle", "Rider"];

const boundingBoxFields = [
  { id: "width", label: "Width", operator: "=", value: "" },
  { id: "height", label: "Height", operator: "=", value: "" },
  { id: "area", label: "Area", operator: ">", value: "0.02" },
  { id: "x-center", label: "X Center", operator: "=", value: "" },
  { id: "y-center", label: "Y Center", operator: "=", value: "" },
] as const;

function OperatorOptions() {
  return operators.map((operator) => (
    <option key={operator} value={operator}>
      {operator}
    </option>
  ));
}

export function AnnotationLevelFilters() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="filter-category-search" className="text-xs font-medium">
          Category
        </label>
        <div className="rounded-lg border border-input bg-background p-2">
          <div aria-label="Selected categories" className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-normal">
              Person
            </Badge>
          </div>
          <Input
            id="filter-category-search"
            name="categorySearch"
            type="search"
            placeholder="Search categories…"
            autoComplete="off"
            aria-describedby="filter-category-help"
            className="mt-1.5 h-7 border-0 bg-transparent px-1 focus-visible:ring-0"
          />
        </div>
        <p id="filter-category-help" className="text-[11px] text-muted-foreground">
          Multiple categories may be selected.
        </p>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold">Object Count</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_4.25rem_4rem] gap-2">
          <div className="min-w-0 space-y-1">
            <label htmlFor="object-count-category" className="text-[11px] text-muted-foreground">
              Category
            </label>
            <select
              id="object-count-category"
              name="objectCountCategory"
              defaultValue="Person"
              className={selectClassName}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="object-count-operator" className="text-[11px] text-muted-foreground">
              Operator
            </label>
            <select
              id="object-count-operator"
              name="objectCountOperator"
              defaultValue=">"
              className={selectClassName}
            >
              <OperatorOptions />
            </select>
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="object-count-value" className="text-[11px] text-muted-foreground">
              Value
            </label>
            <Input
              id="object-count-value"
              name="objectCountValue"
              type="number"
              min="0"
              step="1"
              defaultValue="3"
              className="px-2"
            />
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full">
          + Add Condition
        </Button>
      </fieldset>

      <fieldset className="space-y-2.5" aria-describedby="bounding-box-help">
        <legend className="text-xs font-semibold">Bounding Box</legend>
        <p id="bounding-box-help" className="text-[11px] text-muted-foreground">
          Values use normalized YOLO coordinates.
        </p>
        <div className="space-y-2">
          {boundingBoxFields.map((field) => {
            const operatorId = `bounding-box-${field.id}-operator`;
            const valueId = `bounding-box-${field.id}-value`;

            return (
              <div
                key={field.id}
                className="grid grid-cols-[minmax(0,1fr)_4.25rem_4.75rem] items-center gap-2"
              >
                <label htmlFor={valueId} className="truncate text-xs text-foreground">
                  {field.label}
                </label>
                <label htmlFor={operatorId} className="sr-only">
                  {field.label} operator
                </label>
                <select
                  id={operatorId}
                  name={`${field.id}Operator`}
                  defaultValue={field.operator}
                  className={selectClassName}
                >
                  <OperatorOptions />
                </select>
                <Input
                  id={valueId}
                  name={`${field.id}Value`}
                  type="number"
                  min="0"
                  max="1"
                  step="any"
                  defaultValue={field.value}
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
