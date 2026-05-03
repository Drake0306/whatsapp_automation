import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "$env/dynamic/private";

function getR2Client() {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getBucketName() {
  return env.R2_BUCKET_NAME || "whatsappflow-uploads";
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getFile(
  key: string,
): Promise<ReadableStream | null> {
  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
  return (response.Body as ReadableStream) ?? null;
}

export async function deleteFile(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
}

export function buildStorageKey(
  businessId: string,
  filename: string,
): string {
  return `${businessId}/${Date.now()}-${filename}`;
}
