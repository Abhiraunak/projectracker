/**
 * Turns an uploaded logo into a small PNG data: URL, stored inside the BOQ itself.
 * Resizing in the browser keeps the BOQ small, and an embedded image prints and exports to Excel without any
 * extra download. SVG is not accepted: an SVG file can carry scripts.
 */

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 320; // pixels: plenty for a printed logo
export const MAX_LOGO_CHARS = 380_000; // the server refuses anything bigger

export const LOGO_ACCEPT = ACCEPTED.join(",");

/** Draws the image at most MAX_SIDE pixels on its longest side */
async function drawScaled(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function fileToLogo(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That image is larger than 5 MB.");

  const canvas = await drawScaled(file);
  const png = canvas.toDataURL("image/png"); // keeps a transparent background
  if (png.length <= MAX_LOGO_CHARS) return png;
  throw new Error("That logo is too detailed to store. Try a simpler or smaller image.");
}
