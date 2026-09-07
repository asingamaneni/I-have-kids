import { randomUUID } from "node:crypto";
import { LearningDirectiveRequestSchema } from "@child-learning/contracts";
import { applyLearningDirective } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const input = LearningDirectiveRequestSchema.parse(await request.json());
    const result = await applyLearningDirective({ id: input.id ?? `directive-${randomUUID()}`, studentId: input.studentId, conceptId: input.conceptId, action: input.action, reason: input.reason, authorId: input.authorId, ...(input.requestedStage === undefined ? {} : { requestedStage: input.requestedStage }), ...(input.priority === undefined ? {} : { priority: input.priority }), ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }) });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Learning plan could not be updated" }, { status: 400 });
  }
}
