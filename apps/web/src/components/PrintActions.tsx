"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintActions() {
  return (
    <div className="print-actions" aria-label="Worksheet print options">
      <span className="print-tip">
        For a clean worksheet, turn off “Headers and footers” in the print dialog.
      </span>
      <Button type="button" onClick={() => window.print()}>
        <Printer />
        Print worksheet
      </Button>
    </div>
  );
}
