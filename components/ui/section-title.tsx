import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionTitleProps = {
  children: React.ReactNode;
  eyebrow?: string;
  action?: boolean;
  className?: string;
};

export function SectionTitle({
  children,
  eyebrow,
  action = true,
  className
}: SectionTitleProps) {
  return (
    <div className={cn("mb-2 flex items-center justify-between", className)}>
      <div>
        {eyebrow && (
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-bone-muted">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/80">
          {children}
        </h2>
      </div>
      {action && <ArrowUpRight size={12} className="text-white/30" />}
    </div>
  );
}
