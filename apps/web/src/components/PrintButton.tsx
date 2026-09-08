"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button className="small-button print-control" type="button" onClick={() => window.print()}>{label}</button>;
}
