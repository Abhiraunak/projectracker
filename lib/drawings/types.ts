export interface AppUser {
  id: string;
  email: string;
}

/** A picture, a PDF, or an AutoCAD drawing (DWG, DXF, DWF) */
export type DrawingKind = "image" | "pdf" | "cad";

export interface Drawing {
  id: string;
  title: string;
  description: string;
  kind: DrawingKind;
  format: string; // png, jpg, pdf, dwg, dxf, dwf...
  pageCount: number | null; // PDFs only
  imageUrl: string | null; // large picture (page 1 for a PDF); none for AutoCAD files
  thumbnailUrl: string | null; // small picture for the grid; none for AutoCAD files
  openUrl: string; // the original, to open in a new tab
  downloadUrl: string; // the original file, sent as a download
  mimeType: string;
  sizeBytes: number;
  owner: AppUser;
  isOwner: boolean; // is the signed-in user the uploader?
  sharedWith: AppUser[]; // only filled for the owner
  createdAt: string;
}

export type DrawingScope = "all" | "mine" | "shared";

export interface DrawingListParams {
  scope: DrawingScope;
  q?: string;
  page: number;
  pageSize: number;
}

export interface DrawingPage {
  items: Drawing[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UploadInput {
  file: File;
  title: string;
  description: string;
  sharedWith: string[]; // user ids
}

/** fraction between 0 and 1 */
export type ProgressCallback = (fraction: number) => void;

/** The contract the UI depends on. The real API and the mock both implement it. */
export interface DrawingsApi {
  list(params: DrawingListParams): Promise<DrawingPage>;
  upload(input: UploadInput, onProgress: ProgressCallback): Promise<Drawing>;
  share(drawingId: string, userIds: string[]): Promise<Drawing>;
  remove(drawingId: string): Promise<void>;
  searchUsers(query: string): Promise<AppUser[]>;
}
