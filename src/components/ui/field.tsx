import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  hintId?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: (props: FieldControlProps) => ReactNode;
}

function Field({
  id,
  label,
  hint,
  hintId = `${id}-hint`,
  error,
  errorId = `${id}-error`,
  className,
  children,
}: FieldProps) {
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const hasError = Boolean(error);
  const describedBy = [hasHint && hintId, hasError && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div data-slot="field" className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-foreground block text-sm font-medium">
        {label}
      </label>
      {children({ id, "aria-invalid": hasError, "aria-describedby": describedBy })}
      {hasHint && (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export { Field, type FieldControlProps, type FieldProps };
