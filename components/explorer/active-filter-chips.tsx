"use client"

import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ActiveFilterChip } from "@/lib/dataset-filtering"

export function ActiveFilterChips({
  filters,
  onRemove,
}: {
  filters: readonly ActiveFilterChip[]
  onRemove: (id: string) => void
}) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="flex flex-wrap gap-1.5"
    >
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="h-6 gap-1 pr-1 font-normal text-muted-foreground"
        >
          <span>{filter.label}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            aria-label={`Remove ${filter.label} filter`}
            className="grid size-4 place-items-center rounded-full outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
