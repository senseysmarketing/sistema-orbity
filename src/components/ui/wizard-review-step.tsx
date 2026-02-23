import React from "react";

interface ReviewField {
  label: string;
  value: string | React.ReactNode;
}

interface WizardReviewStepProps {
  fields: ReviewField[];
}

export function WizardReviewStep({ fields }: WizardReviewStepProps) {
  const filledFields = fields.filter((f) => {
    if (typeof f.value === "string") return f.value.trim() !== "";
    return !!f.value;
  });

  if (filledFields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhum campo preenchido ainda.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {filledFields.map((field, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {field.label}
          </p>
          <div className="text-sm font-medium break-words">
            {typeof field.value === "string" ? (
              field.value.length > 120 ? field.value.slice(0, 120) + "..." : field.value
            ) : (
              field.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
