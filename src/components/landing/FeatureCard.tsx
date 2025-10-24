import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
  delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, gradient, delay = 0 }: FeatureCardProps) {
  return (
    <Card 
      className="group hover:shadow-lg hover:border-primary/50 transition-all hover:scale-105 animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <CardHeader className="space-y-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient || 'from-primary/20 to-secondary/20'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
