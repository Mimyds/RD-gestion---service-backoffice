import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorBanner({ message, onDismiss, className }: { message: string; onDismiss?: () => void; className?: string }) {
  if (!message) return null;
  return <div role="alert" className={cn("flex items-start justify-between gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive", className)}>
    <span>{message}</span>
    {onDismiss ? <button type="button" className="border-0 bg-transparent text-inherit" onClick={onDismiss} aria-label="Fermer"><X size={15}/></button> : null}
  </div>;
}
