/**
 * Image helpers for the browser. Face detection no longer runs here: the server analyses every selfie and photo with one model,
 * so the guest's phone only has to downscale the picture before sending it (and never downloads a face model).
 */

/** Decode an image file (honouring phone-camera rotation) onto a canvas no larger than `maxDim`. */
export async function fileToCanvas(file: Blob, maxDim: number): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

export const canvasToJpeg = (c: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality));
