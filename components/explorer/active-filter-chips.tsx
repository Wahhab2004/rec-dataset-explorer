import { Badge } from "@/components/ui/badge"

export function ActiveFilterChips({ filters }: { filters: string[] }) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="flex flex-wrap gap-1.5"
    >
      {filters.map((filter, index) => (
        <Badge
          key={`${filter}-${index}`}
          variant="secondary"
          className="font-normal text-muted-foreground"
        >
          {filter}
        </Badge>
      ))}
    </div>
  )
}
