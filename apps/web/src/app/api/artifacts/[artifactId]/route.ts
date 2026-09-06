import { getArtifactContent } from "@/lib/data";

export async function GET(_request: Request, context: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await context.params;
  const result = await getArtifactContent(artifactId);
  if (!result) return Response.json({ error: "Artifact not found" }, { status: 404 });
  const inlineMediaTypes = new Set(["image/png", "image/jpeg"]);
  const downloadableMediaTypes = new Set(["application/pdf", "text/plain", "application/json"]);
  if (!inlineMediaTypes.has(result.artifact.mediaType) && !downloadableMediaTypes.has(result.artifact.mediaType)) return Response.json({ error: "Artifact type is not browser-viewable" }, { status: 415 });
  const disposition = inlineMediaTypes.has(result.artifact.mediaType) ? "inline" : "attachment";
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `${disposition}; filename="${result.artifact.id}"`,
      "content-security-policy": "default-src 'none'; sandbox",
      "content-type": result.artifact.mediaType,
      "x-content-type-options": "nosniff",
    },
  });
}
