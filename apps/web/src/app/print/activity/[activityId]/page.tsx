import { notFound } from "next/navigation";
import { WorksheetRenderer } from "@child-learning/rendering";
import { PrintActions } from "@/components/PrintActions";
import { getAdultActivity } from "@/lib/data";

export default async function PrintActivity({ params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const activity = await getAdultActivity(activityId);
  if (!activity) notFound();
  return <div className="print-page">
    <PrintActions />
    <WorksheetRenderer activity={activity} options={{ mode: "print", showAnswers: false, assetBasePath: "/" }} />
  </div>;
}
