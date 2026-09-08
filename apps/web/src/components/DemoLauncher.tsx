"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adultHomeRoute, childHomeRoute } from "@/lib/routes";

export function DemoLauncher({ audience }: { audience: "child" | "adult" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openDemo() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const result = await response.json() as { studentId?: string; error?: string };
      if (!response.ok || !result.studentId) throw new Error(result.error ?? "The demo could not be opened.");
      router.push(audience === "adult" ? adultHomeRoute(result.studentId, "demo") : childHomeRoute(result.studentId, "demo"));
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "The demo could not be opened.");
    }
  }

  return <span className="demo-launcher"><Button size="lg" variant={audience === "adult" ? "ghost" : "outline"} type="button" onClick={openDemo} disabled={busy}>{busy ? "Opening demo…" : audience === "adult" ? "Demo adult view" : "Explore the demo"}</Button>{error && <small role="alert">{error}</small>}</span>;
}
