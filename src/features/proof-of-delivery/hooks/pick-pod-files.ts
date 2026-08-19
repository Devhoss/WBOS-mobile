import * as ImagePicker from "expo-image-picker";

import type { PodPickedFile } from "@/api/proof-of-delivery/types";

/**
 * Choosing signed paperwork to attach.
 *
 * Both routes hand off to the operating system: `launchCameraAsync` opens the
 * phone's own camera activity and `launchImageLibraryAsync` opens its own
 * gallery. Neither renders a camera inside WBOS, which is deliberate — the
 * driver already photographs the signed pages with the Camera app out of habit,
 * and an in-app viewfinder would be a second, worse way to do something the
 * phone already does well.
 *
 * Because both return the same shape, camera photos and gallery photos mix
 * freely in one upload session.
 */

export type PickOutcome =
  | { ok: true; files: PodPickedFile[] }
  | { ok: false; reason: "cancelled" }
  | { ok: false; reason: "denied"; message: string };

/** expo-image-picker names files inconsistently across platforms and sources. */
function nameFor(asset: ImagePicker.ImagePickerAsset, index: number): string {
  if (asset.fileName) return asset.fileName;
  const fromUri = asset.uri.split("/").pop();
  if (fromUri && fromUri.includes(".")) return fromUri;
  const extension = (asset.mimeType ?? "image/jpeg").split("/")[1] ?? "jpg";
  return `proof-of-delivery-${Date.now()}-${index + 1}.${extension}`;
}

function toFiles(
  assets: ImagePicker.ImagePickerAsset[],
  source: PodPickedFile["source"],
): PodPickedFile[] {
  return assets.map((asset, index) => ({
    uri: asset.uri,
    name: nameFor(asset, index),
    // A missing type would make the server reject the file; JPEG is what both
    // the camera and the library overwhelmingly produce.
    type: asset.mimeType ?? "image/jpeg",
    source,
  }));
}

export async function takePodPhoto(): Promise<PickOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return {
      ok: false,
      reason: "denied",
      message: permission.canAskAgain
        ? "Camera access is needed to photograph the signed invoice."
        : "Camera access is blocked. Enable it for WBOS in your phone's settings.",
    };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    // Signed paperwork has to stay legible — this is evidence, not a thumbnail.
    quality: 0.8,
    exif: false,
  });

  if (result.canceled || result.assets.length === 0) return { ok: false, reason: "cancelled" };
  return { ok: true, files: toFiles(result.assets, "camera") };
}

export async function pickPodFromLibrary(): Promise<PickOutcome> {
  /**
   * No permission is requested here, deliberately.
   *
   * Android's system photo picker (API 33+) and iOS's PHPicker both run outside
   * the app and hand back only what the user selected, so neither needs a
   * library permission — and `READ_MEDIA_IMAGES` is not declared, which means
   * asking for it returns "denied" without ever showing a prompt. Gating on
   * that would block a flow that requires no permission at all, on every modern
   * handset. The picker's own UI is the consent step.
   */
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    // A two-page invoice is two photos; selecting them one at a time would be
    // the common case made tedious.
    allowsMultipleSelection: true,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled || result.assets.length === 0) return { ok: false, reason: "cancelled" };
  return { ok: true, files: toFiles(result.assets, "library") };
}
