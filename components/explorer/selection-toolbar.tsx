import { Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SelectionToolbar({
  count,
  onClear,
}: {
  count: number
  onClear: () => void
}) {
  return (
    <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 shadow-sm backdrop-blur">
      <p className="text-sm font-medium" aria-live="polite">
        {count.toLocaleString()} {count === 1 ? "image" : "images"} selected
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X data-icon="inline-start" />
          Clear Selection
        </Button>
        <Button type="button" variant="outline" size="sm" disabled>
          <Download data-icon="inline-start" />
          Export Dataset
        </Button>
      </div>
    </div>
  )
}
