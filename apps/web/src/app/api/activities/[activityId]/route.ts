import { NextResponse } from "next/server";
import { getChildActivity } from "@/lib/data";
export async function GET(request: Request, { params }: { params: Promise<{ activityId: string }> }) { const { activityId } = await params; const activity = await getChildActivity(activityId); if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 }); return NextResponse.json(activity); }
