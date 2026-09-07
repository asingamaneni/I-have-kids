import { notFound } from "next/navigation";
import { WorksheetRenderer } from "@child-learning/rendering";
import { getAdultActivity } from "@/lib/data";
export default async function PrintActivityAnswers({ params }: { params: Promise<{ activityId: string }> }) { const { activityId } = await params; const activity = await getAdultActivity(activityId); if (!activity) notFound(); return <div className="print-page"><WorksheetRenderer activity={activity} options={{ mode: "print", showAnswers: true, assetBasePath: "/" }} /></div>; }
