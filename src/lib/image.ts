// Shrinks photos before upload: ~150–300 KB instead of several MB.
// Faster scans, fewer timeouts, cheaper AI calls – and still plenty of detail for food recognition.
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function toUploadBase64(uri: string, maxSide = 1024): Promise<string> {
  const r = await manipulateAsync(uri, [{ resize: { width: maxSide } }], {
    compress: 0.7, format: SaveFormat.JPEG, base64: true,
  });
  if (!r.base64) throw new Error('Could not process photo');
  return r.base64;
}
