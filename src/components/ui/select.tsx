import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative w-full min-w-0">
      <select
        data-slot="select"
        className={cn(
          "peer border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive w-full min-w-0 appearance-none rounded-md border py-2 pr-10 pl-3 text-base transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 peer-disabled:opacity-60"
      />
    </div>
  );
}

export { Select };
