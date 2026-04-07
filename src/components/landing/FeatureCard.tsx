import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
  delay?: number;
  large?: boolean;
}

export function FeatureCard({ icon: Icon, title, description, gradient, delay = 0, large = false }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rawRotateX = useTransform(mouseY, [-150, 150], [5, -5]);
  const rawRotateY = useTransform(mouseX, [-150, 150], [-5, 5]);
  const rotateX = useSpring(rawRotateX, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!large || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={large ? { rotateX, rotateY, transformPerspective: 1000 } : undefined}
    >
      <Card
        className={`group hover:shadow-lg hover:shadow-[#1c102f]/10 hover:border-[#1c102f]/40 transition-all border-border/50 h-full ${
          large ? "hover:scale-[1.02]" : "hover:scale-105"
        }`}
      >
        <CardHeader className="space-y-4">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
              gradient || "from-[#1c102f]/20 to-violet-500/20"
            } flex items-center justify-center group-hover:scale-110 transition-transform`}
          >
            <Icon className="w-7 h-7 text-[#1c102f] dark:text-violet-400" />
          </div>
          <h3 className={`font-semibold ${large ? "text-xl" : "text-lg"}`}>{title}</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
