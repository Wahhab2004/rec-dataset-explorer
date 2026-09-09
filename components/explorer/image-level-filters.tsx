"use client";

import { Input } from "@/components/ui/input";
import {
  INSTALLATION_LOCATION_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  type ImageLevelFilterState,
} from "@/lib/dataset-filtering";

type ImageLevelFiltersProps = {
  filters: ImageLevelFilterState;
  onChange: (filters: ImageLevelFilterState) => void;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function normalizeTags(tags: readonly string[]) {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    const trimmedTag = tag.trim();
    const tagKey = trimmedTag.toLowerCase();

    if (tagKey !== "" && !seenTags.has(tagKey)) {
      seenTags.add(tagKey);
      normalizedTags.push(trimmedTag);
    }
  }

  return normalizedTags;
}

export function ImageLevelFilters({
  filters,
  onChange,
}: ImageLevelFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="filter-time-of-day" className="text-xs font-medium">
          Time of Day
        </label>
        <select
          id="filter-time-of-day"
          name="timeOfDay"
          value={filters.timeOfDay}
          onChange={(event) =>
            onChange({
              ...filters,
              timeOfDay: event.target
                .value as ImageLevelFilterState["timeOfDay"],
            })
          }
          className={selectClassName}
        >
          <option value="">Any time</option>
          {TIME_OF_DAY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-weather" className="text-xs font-medium">
          Weather
        </label>
        <select
          id="filter-weather"
          name="weather"
          value={filters.weather}
          onChange={(event) =>
            onChange({
              ...filters,
              weather: event.target.value as ImageLevelFilterState["weather"],
            })
          }
          className={selectClassName}
        >
          <option value="">Any weather</option>
          {WEATHER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="filter-installation-location"
          className="text-xs font-medium"
        >
          Installation Location
        </label>
        <select
          id="filter-installation-location"
          name="installationLocation"
          value={filters.installationLocation}
          onChange={(event) =>
            onChange({
              ...filters,
              installationLocation: event.target
                .value as ImageLevelFilterState["installationLocation"],
            })
          }
          className={selectClassName}
        >
          <option value="">Any position</option>
          {INSTALLATION_LOCATION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-location" className="text-xs font-medium">
          Location
        </label>
        <Input
          id="filter-location"
          name="location"
          type="search"
          value={filters.location}
          onChange={(event) =>
            onChange({ ...filters, location: event.target.value })
          }
          placeholder="Search locations…"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-image-tags" className="text-xs font-medium">
          Additional Image Tags
        </label>
        <Input
          id="filter-image-tags"
          name="imageTags"
          type="text"
          value={filters.tags.join(", ")}
          onChange={(event) =>
            onChange({
              ...filters,
              tags: event.target.value.split(/,\s?/),
            })
          }
          onBlur={() =>
            onChange({
              ...filters,
              tags: normalizeTags(filters.tags),
            })
          }
          placeholder="urban, wet-road"
          aria-describedby="filter-image-tags-help"
          autoComplete="off"
        />
        <p
          id="filter-image-tags-help"
          className="text-[11px] text-muted-foreground"
        >
          Separate tags with commas.
        </p>
      </div>
    </div>
  );
}
