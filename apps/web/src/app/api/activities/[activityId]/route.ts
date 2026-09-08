import { NextResponse } from "next/server";
import { getChildActivity } from "@/lib/data";
export async function GET(request: Request, { params }: { params: Promise<{ activityId: string }> }) { const { activityId } = await params; const scope = new URL(request.url).searchParams.get("scope") === "demo" ? "demo" : "household"; const activity = await getChildActivity(activityId, scope); if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 }); return NextResponse.json(activity); }
