import * as ImagePicker from 'expo-image-picker';

import { api } from './api';

import {
  ALLOWED_IMAGE_MIME,
  type AllowedImageMime,
  type UploadKind,
} from '@petwalker/shared/dto';

interface UploadResult {
  publicUrl: string;
  fileKey: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Pick an image from the gallery and upload it to S3 (or MinIO in dev) via the
 * three-step pre-signed URL flow used everywhere in the app:
 *
 *   1. POST /pets/photo-upload-url → { uploadUrl, publicUrl, requiredHeaders }
 *   2. PUT uploadUrl with the image bytes + Content-Type
 *   3. caller writes publicUrl onto whatever record (PATCH /pets/:id, etc.)
 *
 * Returns null if the user cancels the picker.
 */
export async function pickAndUploadImage(
  kind: UploadKind = 'pet-photo',
): Promise<UploadResult | null> {
  // Permission may have been denied previously — request lazily.
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photo library permission denied');
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (picked.canceled || !picked.assets.length) return null;

  const asset = picked.assets[0];
  if (!asset) return null; // narrow for TS noUncheckedIndexedAccess
  const uri = asset.uri;
  const rawMime = asset.mimeType ?? guessMimeFromUri(uri) ?? 'image/jpeg';
  const mimeType: AllowedImageMime = (ALLOWED_IMAGE_MIME as readonly string[]).includes(
    rawMime,
  )
    ? (rawMime as AllowedImageMime)
    : 'image/jpeg';

  // RN's fetch supports loading file:// URIs; turn into a Blob to get size + body.
  const blobRes = await fetch(uri);
  const blob = await blobRes.blob();
  const sizeBytes = blob.size;
  if (sizeBytes > MAX_BYTES) {
    throw new Error(
      `Image too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB; max 10 MB)`,
    );
  }

  const presigned = await api.pets.requestPhotoUploadUrl({
    kind,
    mimeType,
    sizeBytes,
  });

  const putRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: presigned.requiredHeaders,
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status} ${putRes.statusText})`);
  }

  return { publicUrl: presigned.publicUrl, fileKey: presigned.fileKey };
}

function guessMimeFromUri(uri: string): string | null {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return null;
  }
}
