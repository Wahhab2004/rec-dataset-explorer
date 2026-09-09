import type { ComponentProps } from "react"
import { cn } from "cn"

export function Progress({
  value,
  className,
  ...props
}: ComponentProps<"div"> & { value: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
