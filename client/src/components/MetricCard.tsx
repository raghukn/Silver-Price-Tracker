import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: ReactNode;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
  delay?: number;
}

export function MetricCard({ 
  label, 
  value, 
  subValue, 
  icon, 
  trend,
  className,
  delay = 0 
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "glass-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-300",
        className
      )}
    >
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-display">
              {value}
            </span>
          </div>
          {subValue && (
            <div className="mt-1 text-sm text-muted-foreground font-medium">
              {subValue}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      {/* Decorative gradient blob */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-accent/20 to-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
    </motion.div>
  );
}
