import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentClass?: string;
  actions?: React.ReactNode; // buttons shown in the header right side
}

export function Accordion({ title, icon, defaultOpen = false, children, accentClass, actions }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-rim overflow-hidden">
      <div className="flex items-center bg-surface hover:bg-surface-2 transition-colors">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-2 px-4 py-2.5 text-left"
        >
          {icon && <span className={cn("text-sm leading-none", accentClass ?? "text-accent")}>{icon}</span>}
          <span className="text-[10px] font-bold uppercase tracking-widest text-subtle">{title}</span>
          <ChevronDown
            size={13}
            className={cn("text-muted transition-transform duration-150 ml-1", open && "rotate-180")}
          />
        </button>
        {actions && (
          <div className="flex items-center pr-2 gap-1" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      {open && (
        <div className="px-4 py-3 bg-base border-t border-rim">
          {children}
        </div>
      )}
    </div>
  );
}


