// this file contains utility functions for interacting with the Cloudinary API, including creating upload signatures and deleting assets
import { createHash } from "node:crypto";

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function createCloudinaryUploadSignature(
  gymId: string,
  draftId: string,
  now = Math.floor(Date.now() / 1000),
) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !apiKey || !apiSecret || !uploadPreset)
    throw new Error("Cloudinary upload configuration is missing.");

  const folder = `fitfix/${gymId}/drafts/${draftId}`;
  const allowedFormats = "jpg,png,webp";
  const params = `allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${now}&upload_preset=${uploadPreset}`;
  const signature = createHash("sha1").update(`${params}${apiSecret}`).digest("hex");
  return {
    cloudName,
    apiKey,
    timestamp: now,
    folder,
    signature,
    uploadPreset,
    allowedFormats,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    maxBytes: MAX_MEDIA_BYTES,
    mimeTypes: [...MEDIA_MIME_TYPES],
  };
}

export async function deleteCloudinaryAsset(publicId: string): Promise<boolean> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret)
    throw new Error("Cloudinary upload configuration is missing.");
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}&type=upload`;
  const signature = createHash("sha1").update(`${params}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    invalidate: "true",
    type: "upload",
    api_key: apiKey,
    signature,
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/destroy`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { result?: string };
  return result.result === "ok" || result.result === "not found";
}
