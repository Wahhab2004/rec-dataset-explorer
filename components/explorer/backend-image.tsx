"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

import { resolveBackendFileUrl } from "@/lib/api/file-url"

export function BackendImage({
  src,
  alt,
  className,
}: {
  src?: string | null
  alt: string
  className?: string
}) {
  const [isLoading, setIsLoading] = useState(Boolean(src))
  const [hasError, setHasError] = useState(!src)

  if (hasError || !src) {
    return (
      <div className="grid size-full place-items-center bg-muted/70">
        <ImageIcon
          aria-hidden="true"
          className="size-9 stroke-[1.25] text-muted-foreground/70"
        />
      </div>
    )
  }

  const resolvedUrl = resolveBackendFileUrl(src)

  if (!resolvedUrl) {
    return (
      <div className="grid size-full place-items-center bg-muted/70">
        <ImageIcon
          aria-hidden="true"
          className="size-9 stroke-[1.25] text-muted-foreground/70"
        />
      </div>
    )
  }

  return (
    <div className="relative size-full bg-muted/70">
      {isLoading ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      ) : null}
      {/* Backend file URLs are runtime-configured and may point to a separate local server. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedUrl}
        alt={alt}
        className={`size-full object-cover transition-opacity duration-200 ${
          isLoading ? "opacity-0" : "opacity-100"
        } ${className ?? ""}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />
    </div>
  )
}
