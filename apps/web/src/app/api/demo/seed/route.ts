import { NextResponse } from "next/server";
import { seedDemo } from "@kindergarten/demo";
import type { DemoSeedOptions } from "@kindergarten/demo";
export async function POST() { try { const options: DemoSeedOptions = {}; if (process.env.LEARNING_WORKTABLE_DB) options.databasePath = process.env.LEARNING_WORKTABLE_DB; if (process.env.LEARNING_WORKTABLE_ARTIFACTS) options.artifactsDir = process.env.LEARNING_WORKTABLE_ARTIFACTS; const result = await seedDemo(options); return NextResponse.json({ ok: true, ...result }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Seed failed" }, { status: 500 }); } }
