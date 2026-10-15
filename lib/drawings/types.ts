export interface AppUser {
  id: string;
  email: string;
}

export interface Drawing {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // full size
  thumbnailUrl: string; // small version for the grid
  mimeType: string;
  sizeBytes: number;
  owner: AppUser;
  downloadUrl: string;
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
  sharedWith: string[];
}

/** fraction between 0 and 1 */
export type ProgressCallback = (fraction: number) => void;


export interface DrawingsApi {
  list(params: DrawingListParams): Promise<DrawingPage>;
  upload(input: UploadInput, onProgress: ProgressCallback): Promise<Drawing>;
  share(drawingId: string, userIds: string[]): Promise<Drawing>;
  remove(drawingId: string): Promise<void>;
  searchUsers(query: string): Promise<AppUser[]>;
}