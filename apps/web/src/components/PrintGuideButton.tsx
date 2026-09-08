"use client";

export function PrintGuideButton() {
  return <button className="small-button guide-print-control" type="button" onClick={() => window.print()}>Print this guide</button>;
}
