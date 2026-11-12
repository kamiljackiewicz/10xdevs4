import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive w-full min-w-0 rounded-md border px-3 py-2 text-base transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
