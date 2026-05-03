import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, businessDocs } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { extractText, chunkText } from "$lib/server/file-extract.js";
import { uploadFile, buildStorageKey } from "$lib/server/storage.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".csv", ".doc", ".docx"]);

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

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      continue;
    }

    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      continue;
    }

    const buffer = await file.arrayBuffer();
    const text = await extractText(buffer, file.name);

    if (!text.trim()) continue;

    let storageKey: string | null = null;
    try {
      storageKey = await uploadFile(
        buildStorageKey(business.id, file.name),
        Buffer.from(buffer),
        file.type || "application/octet-stream",
      );
    } catch {
      // R2 creds not configured yet — store text in DB only
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

    uploaded.push(file.name);
  }

  return json({ uploaded, chunks: uploaded.length });
};
