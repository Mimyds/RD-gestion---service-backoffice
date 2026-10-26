"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { siretDigits } from "@/lib/siret";
import { frenchVatDigits } from "@/lib/vat-number";

type Props = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "maxLength"> & {
  kind: "siret" | "vat";
  value: string;
  onValueChange: (value: string) => void;
};

function grouped(value: string, sizes: number[]) {
  let offset = 0;
  return sizes.map(size => { const group = value.slice(offset, offset + size); offset += size; return group; }).filter(Boolean).join(" ");
}

export function LegalNumberInput({ kind, value, onValueChange, className = "", ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const digits = kind === "siret" ? siretDigits(value) : frenchVatDigits(value);
  const formatted = kind === "siret" ? grouped(digits, [3, 3, 3, 5]) : digits ? `FR ${grouped(digits, [2, 3, 3, 3])}` : "";

  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  return <input {...props} ref={inputRef} type="text" inputMode={kind === "siret" ? "numeric" : "text"} autoComplete="off" spellCheck={false}
    className={`w-full min-w-0 rounded-lg border bg-background px-3 py-2.5 text-[15px] text-foreground outline-ring placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive ${className}`}
    placeholder={kind === "siret" ? "123 456 789 00012" : "FR 12 123 456 789"}
    value={formatted}
    onChange={event => {
      const input = event.currentTarget;
      const digitPosition = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length;
      const nextDigits = kind === "siret" ? siretDigits(input.value) : frenchVatDigits(input.value);
      const nextFormatted = kind === "siret" ? grouped(nextDigits, [3, 3, 3, 5]) : nextDigits ? `FR ${grouped(nextDigits, [2, 3, 3, 3])}` : "";
      let position = kind === "vat" && nextDigits ? 3 : 0;
      let count = 0;
      while (position < nextFormatted.length && count < digitPosition) {
        if (/\d/.test(nextFormatted[position])) count += 1;
        position += 1;
      }
      caret.current = position;
      onValueChange(kind === "vat" && nextDigits ? `FR${nextDigits}` : nextDigits);
    }}
  />;
}
