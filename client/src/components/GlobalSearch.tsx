import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store/useStore';
import { searchIndex, useDebounceSearch, SearchResult } from '@/lib/search';
import { Search, Star, Grid3X3, FolderIcon, CheckSquare, Lightbulb, BookmarkIcon, Folder } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Capture, Bucket, Folder as FolderType } from '@shared/schema';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { setCurrentScreen, setSelectedBucket, setSelectedCapture, setSelectedFolder } = useStore();
  const { results, isSearching, search, clearResults } = useDebounceSearch(200);

  // Fetch data for search index
  const { data: captures = [] } = useQuery<Capture[]>({
    queryKey: ['/api/captures'],
  });

  const { data: buckets = [] } = useQuery<Bucket[]>({
    queryKey: ['/api/buckets'],
  });

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ['/api/folders'],
  });

  // Build search index when data changes
  useEffect(() => {
    if (captures.length || buckets.length || folders.length) {
      searchIndex.buildIndex(captures, buckets, folders);
    }
  }, [captures, buckets, folders]);

  // Handle search input changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      search(value, 30);
    } else {
      clearResults();
    }
  }, [search, clearResults]);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'capture':
        const capture = result.item as Capture;
        // Navigate to the capture in its context
        setSelectedBucket(capture.bucketId);
        if (capture.folderId) {
          setSelectedFolder(capture.folderId);
        }
        setSelectedCapture(capture.id);
        setCurrentScreen('capture-view');
        break;

      case 'bucket':
        const bucket = result.item as Bucket;
        setSelectedBucket(bucket.id);
        setCurrentScreen('bucket-view');
        break;

      case 'folder':
        const folder = result.item as FolderType;
        setSelectedBucket(folder.bucketId);
        setSelectedFolder(folder.id);
        setCurrentScreen('bucket-view');
        break;
    }
    
    // Close search and clear query
    onOpenChange(false);
    setSearchQuery('');
    clearResults();
  }, [setSelectedBucket, setSelectedFolder, setSelectedCapture, setCurrentScreen, onOpenChange, clearResults]);

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      clearResults();
    }
  }, [open, clearResults]);

  // Group results by type
  const groupedResults = results.reduce((groups, result) => {
    if (!groups[result.type]) {
      groups[result.type] = [];
    }
    groups[result.type].push(result);
    return groups;
  }, {} as Record<string, SearchResult[]>);

  // Get icon for result type
  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'capture':
        const capture = result.item as Capture;
        switch (capture.type) {
          case 'task': return <CheckSquare className="w-4 h-4" />;
          case 'idea': return <Lightbulb className="w-4 h-4" />;
          case 'reference': return <BookmarkIcon className="w-4 h-4" />;
          default: return <Search className="w-4 h-4" />;
        }
      case 'bucket': 
        return <Grid3X3 className="w-4 h-4" />;
      case 'folder': 
        return <Folder className="w-4 h-4" />;
      default: 
        return <Search className="w-4 h-4" />;
    }
  };

  // Get styled text for results
  const getStyledTitle = (result: SearchResult) => {
    // For now, return the title as-is. In the future, we could highlight matching terms
    return result.title;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0" data-testid="dialog-global-search">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search captures, buckets, and folders..."
              value={searchQuery}
              onValueChange={handleSearchChange}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="input-global-search"
            />
          </div>
          
          <CommandList className="max-h-[400px] overflow-y-auto">
            {!searchQuery.trim() && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-6 w-6 mb-2 opacity-50" />
                <p>Start typing to search across all your content</p>
                <p className="mt-1 text-xs">Press Cmd+K (Mac) or Ctrl+K to open from anywhere</p>
              </div>
            )}

            {searchQuery.trim() && results.length === 0 && !isSearching && (
              <CommandEmpty data-testid="search-no-results">
                <div className="p-6 text-center text-sm">
                  <Search className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try different keywords or check your spelling</p>
                </div>
              </CommandEmpty>
            )}

            {isSearching && (
              <div className="p-6 text-center text-sm text-muted-foreground" data-testid="search-loading">
                <Search className="mx-auto h-6 w-6 mb-2 opacity-50 animate-pulse" />
                <p>Searching...</p>
              </div>
            )}

            {/* Captures Group */}
            {groupedResults.capture && groupedResults.capture.length > 0 && (
              <CommandGroup heading="Captures" data-testid="search-group-captures">
                {groupedResults.capture.slice(0, 8).map((result) => {
                  const capture = result.item as Capture;
                  return (
                    <CommandItem
                      key={result.id}
                      value={`capture-${result.id}`}
                      onSelect={() => handleResultSelect(result)}
                      className="flex items-center gap-2 p-3"
                      data-testid={`search-item-capture-${result.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {getResultIcon(result)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {result.isStarred && <Star className="w-3 h-3 fill-current text-yellow-500" />}
                            <p className="text-sm font-medium truncate">{getStyledTitle(result)}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                            {capture.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                • {formatDistanceToNow(new Date(capture.createdAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {result.color && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: result.color }}
                        />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Buckets Group */}
            {groupedResults.bucket && groupedResults.bucket.length > 0 && (
              <CommandGroup heading="Buckets" data-testid="search-group-buckets">
                {groupedResults.bucket.slice(0, 5).map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`bucket-${result.id}`}
                    onSelect={() => handleResultSelect(result)}
                    className="flex items-center gap-2 p-3"
                    data-testid={`search-item-bucket-${result.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getResultIcon(result)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getStyledTitle(result)}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                    {result.color && (
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: result.color }}
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Folders Group */}
            {groupedResults.folder && groupedResults.folder.length > 0 && (
              <CommandGroup heading="Folders" data-testid="search-group-folders">
                {groupedResults.folder.slice(0, 5).map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`folder-${result.id}`}
                    onSelect={() => handleResultSelect(result)}
                    className="flex items-center gap-2 p-3"
                    data-testid={`search-item-folder-${result.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getResultIcon(result)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getStyledTitle(result)}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                    {result.color && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: result.color }}
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}