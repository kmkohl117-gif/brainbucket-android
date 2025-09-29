export interface Capture {
  id: string;
  text: string;
  type: 'task' | 'idea' | 'reference';
  bucketId: string;
  folderId?: string;
  isStarred: boolean;
  isCompleted: boolean;
  description?: string;
  media?: MediaItem[];
  links?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'document' | 'link';
  url: string;
  name: string;
}

export interface Bucket {
  id: string;
  name: string;
  icon: string;
  color: string;
  hasInboxItems: boolean;
  itemCount: number;
}

export interface Folder {
  /**
   * Unique identifier for the folder
   */
  id: string;
  /**
   * Display name for the folder
   */
  name: string;
  /**
   * Identifier of the bucket this folder belongs to.  If undefined the
   * folder is treated as global and captures within it will live in
   * whatever bucket they were captured from.
   */
  bucketId: string;
  /**
   * Sort order of the folder within its bucket
   */
  order: number;
  /**
   * How many captures reside in this folder.  This is derived from
   * the state and updated automatically in the reducer.
   */
  itemCount: number;
  /**
   * Optional icon name for the folder.  Defaults to a generic folder
   * icon if not specified.  This should correspond to a name in
   * lucide-react such as `Folder`, `Star`, etc.
   */
  icon?: string;
  /**
   * Optional color associated with the folder.  Used when rendering
   * the folder card so that users can visually differentiate folders.
   */
  color?: string;
}

export interface QuickTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: string[];
}

export interface AppState {
  captures: Capture[];
  buckets: Bucket[];
  folders: Folder[];
  templates: QuickTemplate[];
  activeView: 'capture' | 'search' | 'buckets' | 'bucket-detail' | 'folder-detail' | 'capture-view' | 'capture-edit';
  activeBucketId?: string;
  activeFolderId?: string;
  activeCaptureId?: string;
  searchQuery: string;
}