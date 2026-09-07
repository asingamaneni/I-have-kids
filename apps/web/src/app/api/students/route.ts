import { StudentCreateRequestSchema } from "@child-learning/contracts";
import { createStudentWithStarter } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const input = StudentCreateRequestSchema.parse(await request.json());
    const result = await createStudentWithStarter(input);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Learner profile could not be created" }, { status: 400 });
  }
}
