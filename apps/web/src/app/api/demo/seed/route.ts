import { NextResponse } from "next/server";
import { createDemoService } from "@child-learning/mcp-server";

export async function POST() {
  const service = createDemoService();
  try {
    const result = await service.initializeDemo();
    return NextResponse.json({ ok: true, ...result as Record<string, unknown> });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Seed failed" }, { status: 500 });
  } finally {
    service.close();
  }
}
