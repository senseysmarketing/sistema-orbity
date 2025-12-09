import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MeetingDurationSelectorProps {
  selectedDuration: number | null;
  onSelect: (minutes: number) => void;
}

const durations = [
  { label: "15min", value: 15 },
  { label: "30min", value: 30 },
  { label: "45min", value: 45 },
  { label: "1h", value: 60 },
  { label: "1h30", value: 90 },
  { label: "2h", value: 120 },
];

export const MeetingDurationSelector = ({ selectedDuration, onSelect }: MeetingDurationSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {durations.map((duration) => (
        <Button
          key={duration.value}
          type="button"
          variant={selectedDuration === duration.value ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(duration.value)}
          className={cn(
            "text-xs",
            selectedDuration === duration.value && "ring-2 ring-primary/50"
          )}
        >
          {duration.label}
        </Button>
      ))}
    </div>
  );
};
