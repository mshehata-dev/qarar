import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* silent */ }
  }

  return (
    <button
      onClick={copy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      className={cn(
        "flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium transition-all",
        copied
          ? "text-pass bg-pass/15"
          : "text-muted hover:text-ink hover:bg-surface-2",
        className
      )}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
