import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, businessDocs } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { extractText, chunkText } from "$lib/server/file-extract.js";
import { env } from "$env/dynamic/private";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".csv", ".doc", ".docx"]);

function isR2Configured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) {
    return json({ error: "No business found" }, { status: 400 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: exceeds 10MB limit`);
      continue;
    }

    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(`${file.name}: unsupported file type`);
      continue;
    }

    let text: string;
    const buffer = await file.arrayBuffer();
    try {
      text = await extractText(buffer, file.name);
    } catch (err) {
      console.error(`[upload] extractText failed for ${file.name}:`, err);
      errors.push(`${file.name}: failed to extract text`);
      continue;
    }

    if (!text.trim()) {
      errors.push(`${file.name}: no text content found`);
      continue;
    }

    let storageKey: string | null = null;
    if (isR2Configured()) {
      try {
        const { uploadFile, buildStorageKey } = await import("$lib/server/storage.js");
        storageKey = await uploadFile(
          buildStorageKey(business.id, file.name),
          Buffer.from(buffer),
          file.type || "application/octet-stream",
        );
      } catch (err) {
        console.warn(`[upload] R2 upload failed for ${file.name}, storing text only:`, err);
      }
    }

    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(businessDocs).values({
        businessId: business.id,
        source: file.name,
        chunkText: chunks[i],
        chunkIndex: i,
        metadata: { originalSize: file.size, mimeType: file.type },
        storageKey,
      });
    }

    console.log(`[upload] Stored ${chunks.length} chunks from ${file.name} for business ${business.name}`);
    uploaded.push(file.name);
  }

  return json({ uploaded, errors, chunks: uploaded.length });
};
