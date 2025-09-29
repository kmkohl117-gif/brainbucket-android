import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Capture, Bucket, Folder, QuickTemplate, AppState } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

type AppAction =
  | { type: 'ADD_CAPTURE'; payload: Capture }
  | { type: 'UPDATE_CAPTURE'; payload: Capture }
  | { type: 'DELETE_CAPTURE'; payload: string }
  | { type: 'TOGGLE_STAR'; payload: string }
  | { type: 'TOGGLE_COMPLETE'; payload: string }
  | { type: 'MOVE_CAPTURE'; payload: { captureId: string; bucketId: string; folderId?: string } }
  | { type: 'ADD_BUCKET'; payload: Bucket }
  | { type: 'UPDATE_BUCKET'; payload: Bucket }
  | { type: 'DELETE_BUCKET'; payload: string }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: Folder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'REORDER_FOLDERS'; payload: { bucketId: string; folders: Folder[] } }
  | { type: 'ADD_TEMPLATE'; payload: QuickTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: QuickTemplate }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'SET_ACTIVE_VIEW'; payload: AppState['activeView'] }
  | { type: 'SET_ACTIVE_BUCKET'; payload: string | undefined }
  | { type: 'SET_ACTIVE_FOLDER'; payload: string | undefined }
  | { type: 'SET_ACTIVE_CAPTURE'; payload: string | undefined }
  | { type: 'SET_SEARCH_QUERY'; payload: string };

// Predefined buckets.  An additional "Unsorted" bucket is provided so that
// captures that aren't explicitly assigned to a bucket don't disappear.  This
// bucket collects all unassigned captures.  Each bucket defines its icon and
// color which are used in the UI.  Note: the id values are strings and must
// remain stable across app launches to preserve persisted data.
const initialBuckets: Bucket[] = [
  { id: 'unsorted', name: 'Unsorted', icon: 'Inbox', color: '#6b7280', hasInboxItems: false, itemCount: 0 },
  { id: '1', name: 'To-Dos', icon: 'CheckSquare', color: '#3b82f6', hasInboxItems: false, itemCount: 0 },
  { id: '2', name: 'Creatives', icon: 'Palette', color: '#8b5cf6', hasInboxItems: false, itemCount: 0 },
  { id: '3', name: 'Shopping Lists', icon: 'ShoppingCart', color: '#06b6d4', hasInboxItems: false, itemCount: 0 },
  { id: '4', name: 'Ideas & Dreams', icon: 'Lightbulb', color: '#10b981', hasInboxItems: false, itemCount: 0 },
  { id: '5', name: 'Vault', icon: 'Lock', color: '#f59e0b', hasInboxItems: false, itemCount: 0 },
  { id: '6', name: 'Health', icon: 'Heart', color: '#ef4444', hasInboxItems: false, itemCount: 0 },
];

const initialTemplates: QuickTemplate[] = [
  {
    id: '1',
    name: 'Cleaning Tasks',
    icon: 'Sparkles',
    color: '#06b6d4',
    items: ['Vacuum living room', 'Clean bathroom', 'Do laundry', 'Wash dishes', 'Take out trash']
  },
  {
    id: '2',
    name: 'Grocery List',
    icon: 'ShoppingCart',
    color: '#10b981',
    items: ['Milk', 'Bread', 'Eggs', 'Fruits', 'Vegetables']
  },
  {
    id: '3',
    name: 'Daily Goals',
    icon: 'Target',
    color: '#8b5cf6',
    items: ['Morning exercise', 'Read for 30 minutes', 'Drink 8 glasses of water', 'Meditate']
  }
];

const initialState: AppState = {
  captures: [],
  buckets: initialBuckets,
  folders: [],
  templates: initialTemplates,
  activeView: 'capture',
  searchQuery: '',
};

function updateBucketStats(state: AppState): AppState {
  const updatedBuckets = state.buckets.map(bucket => {
    const bucketCaptures = state.captures.filter(capture => capture.bucketId === bucket.id);
    const inboxItems = bucketCaptures.filter(capture => !capture.folderId && !capture.isCompleted);
    
    return {
      ...bucket,
      hasInboxItems: inboxItems.length > 0,
      itemCount: bucketCaptures.length
    };
  });

  return { ...state, buckets: updatedBuckets };
}

/**
 * Update folder statistics such as the number of items contained within each
 * folder.  This helper traverses the list of captures and counts how many
 * belong to each folder.  It returns a new state with the updated folder
 * list.  This must be called whenever captures or folders change to ensure
 * the itemCount remains accurate.
 */
function updateFolderStats(state: AppState): AppState {
  const updatedFolders = state.folders.map(folder => {
    const count = state.captures.filter(capture => capture.folderId === folder.id).length;
    return { ...folder, itemCount: count };
  });
  return { ...state, folders: updatedFolders };
}

function appReducer(state: AppState, action: AppAction): AppState {
  let newState = state;

  switch (action.type) {
    case 'ADD_CAPTURE':
      newState = {
        ...state,
        captures: [action.payload, ...state.captures],
      };
      break;
    case 'UPDATE_CAPTURE':
      newState = {
        ...state,
        captures: state.captures.map(capture =>
          capture.id === action.payload.id ? action.payload : capture
        ),
      };
      break;
    case 'DELETE_CAPTURE':
      newState = {
        ...state,
        captures: state.captures.filter(capture => capture.id !== action.payload),
      };
      break;
    case 'TOGGLE_STAR':
      newState = {
        ...state,
        captures: state.captures.map(capture =>
          capture.id === action.payload 
            ? { ...capture, isStarred: !capture.isStarred, updatedAt: new Date() }
            : capture
        ),
      };
      break;
    case 'TOGGLE_COMPLETE':
      newState = {
        ...state,
        captures: state.captures.map(capture =>
          capture.id === action.payload 
            ? { ...capture, isCompleted: !capture.isCompleted, updatedAt: new Date() }
            : capture
        ),
      };
      break;
    case 'MOVE_CAPTURE':
      newState = {
        ...state,
        captures: state.captures.map(capture =>
          capture.id === action.payload.captureId 
            ? { 
                ...capture, 
                bucketId: action.payload.bucketId,
                folderId: action.payload.folderId,
                updatedAt: new Date() 
              }
            : capture
        ),
      };
      break;
    case 'ADD_BUCKET':
      newState = {
        ...state,
        buckets: [...state.buckets, action.payload],
      };
      break;
    case 'UPDATE_BUCKET':
      newState = {
        ...state,
        buckets: state.buckets.map(bucket =>
          bucket.id === action.payload.id ? action.payload : bucket
        ),
      };
      break;
    case 'DELETE_BUCKET':
      newState = {
        ...state,
        buckets: state.buckets.filter(bucket => bucket.id !== action.payload),
        captures: state.captures.filter(capture => capture.bucketId !== action.payload),
        folders: state.folders.filter(folder => folder.bucketId !== action.payload),
      };
      break;
    case 'ADD_FOLDER':
      newState = {
        ...state,
        folders: [...state.folders, action.payload],
      };
      break;
    case 'UPDATE_FOLDER':
      newState = {
        ...state,
        folders: state.folders.map(folder =>
          folder.id === action.payload.id ? action.payload : folder
        ),
      };
      break;
    case 'DELETE_FOLDER':
      newState = {
        ...state,
        folders: state.folders.filter(folder => folder.id !== action.payload),
        captures: state.captures.map(capture =>
          capture.folderId === action.payload 
            ? { ...capture, folderId: undefined }
            : capture
        ),
      };
      break;
    case 'REORDER_FOLDERS':
      newState = {
        ...state,
        folders: state.folders.map(folder => {
          const updatedFolder = action.payload.folders.find(f => f.id === folder.id);
          return updatedFolder || folder;
        }),
      };
      break;
    case 'ADD_TEMPLATE':
      newState = {
        ...state,
        templates: [...state.templates, action.payload],
      };
      break;
    case 'UPDATE_TEMPLATE':
      newState = {
        ...state,
        templates: state.templates.map(template =>
          template.id === action.payload.id ? action.payload : template
        ),
      };
      break;
    case 'DELETE_TEMPLATE':
      newState = {
        ...state,
        templates: state.templates.filter(template => template.id !== action.payload),
      };
      break;
    case 'SET_ACTIVE_VIEW':
      newState = {
        ...state,
        activeView: action.payload,
      };
      break;
    case 'SET_ACTIVE_BUCKET':
      newState = {
        ...state,
        activeBucketId: action.payload,
      };
      break;
    case 'SET_ACTIVE_FOLDER':
      newState = {
        ...state,
        activeFolderId: action.payload,
      };
      break;
    case 'SET_ACTIVE_CAPTURE':
      newState = {
        ...state,
        activeCaptureId: action.payload,
      };
      break;
    case 'SET_SEARCH_QUERY':
      newState = {
        ...state,
        searchQuery: action.payload,
      };
      break;
    default:
      return state;
  }
  // After every state change, recompute the bucket and folder statistics so the
  // UI displays accurate counts.  The order here is important: update the
  // bucket stats first so that folders can rely on up-to-date captures.
  const withBucketStats = updateBucketStats(newState);
  const withFolderStats = updateFolderStats(withBucketStats);
  return withFolderStats;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [persistedState, setPersistedState] = useLocalStorage('brainBucketData', initialState);
  // Merge the persisted state with our initial defaults.  If the persisted state does
  // not contain the "unsorted" bucket (introduced in a later version), inject it at
  // the front of the buckets array.  This ensures users upgrading from an
  // older version of the app see the Unsorted bucket without losing data.
  let mergedState: AppState = { ...initialState, ...persistedState };
  const hasUnsorted = mergedState.buckets.some((b) => b.id === 'unsorted');
  if (!hasUnsorted) {
    mergedState = {
      ...mergedState,
      buckets: [
        // take the unsorted definition from our initial state (first element)
        ...initialState.buckets.filter((b) => b.id === 'unsorted'),
        ...mergedState.buckets,
      ],
    };
  }
  const [state, dispatch] = useReducer(appReducer, mergedState);

  useEffect(() => {
    setPersistedState(state);
  }, [state, setPersistedState]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}