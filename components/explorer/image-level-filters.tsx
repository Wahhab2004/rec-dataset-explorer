import { Input } from "@/components/ui/input";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ImageLevelFilters() {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="filter-time-of-day" className="text-xs font-medium">
          Time of Day
        </label>
        <select
          id="filter-time-of-day"
          name="timeOfDay"
          defaultValue="Nighttime"
          className={selectClassName}
        >
          <option value="">Any time</option>
          <option value="Daytime">Daytime</option>
          <option value="Nighttime">Nighttime</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-weather" className="text-xs font-medium">
          Weather
        </label>
        <select
          id="filter-weather"
          name="weather"
          defaultValue="Rainy"
          className={selectClassName}
        >
          <option value="">Any weather</option>
          <option value="Sunny">Sunny</option>
          <option value="Cloudy">Cloudy</option>
          <option value="Rainy">Rainy</option>
          <option value="Foggy">Foggy</option>
          <option value="Other">Other</option>
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
          defaultValue="Front"
          className={selectClassName}
        >
          <option value="">Any position</option>
          <option value="Front">Front</option>
          <option value="Rear">Rear</option>
          <option value="Side">Side</option>
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
          type="search"
          placeholder="Search or add tags…"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
