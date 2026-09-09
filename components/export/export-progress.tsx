"use client";

import { useEffect, useRef, useState } from "react";

import { Progress } from "@/components/ui/progress";

const stages = [
  "Preparing selected images",
  "Generating YOLO annotations",
  "Preparing metadata",
  "Creating package",
] as const;

export function ExportProgress({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setProgress(step * 25);
      if (step === stages.length) {
        window.clearInterval(timer);
        onCompleteRef.current();
      }
    }, 650);

    return () => window.clearInterval(timer);
  }, []);

  const activeStage = Math.min(Math.floor(progress / 25), stages.length - 1);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">Generating Dataset</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Preparing your mock export package.
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} aria-label={`Export progress: ${progress}%`} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{stages[activeStage]}</span>
          <span>{progress}%</span>
        </div>
      </div>

      <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        The original dataset will remain unchanged.
      </p>
    </div>
  );
}
