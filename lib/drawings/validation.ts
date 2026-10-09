export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

// SVG is left out on purpose: an SVG file can carry scripts
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");

const isAcceptedType = (type: string) => (ACCEPTED_TYPES as readonly string[]).includes(type);

/** Returns a message if the file can't be uploaded, otherwise null. (Quick feedback only: the server must check again.) */
export function validateImage(file: File): string | null {
  if (!isAcceptedType(file.type)) return `${file.name}: only PNG, JPG, WebP or GIF images are allowed.`;
  if (file.size === 0) return `${file.name}: the file is empty.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  return null;
}

/** Splits chosen files into the ones to queue and the problems to show */
export function pickValidFiles(files: File[], alreadyQueued: number) {
  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const problem = validateImage(file);
    if (problem) {
      errors.push(problem);
    } else if (alreadyQueued + valid.length >= MAX_FILES_PER_UPLOAD) {
      errors.push(`You can upload up to ${MAX_FILES_PER_UPLOAD} images at a time.`);
      break;
    } else {
      valid.push(file);
    }
  }
  return { valid, errors };
}