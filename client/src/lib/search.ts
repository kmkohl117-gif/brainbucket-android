import type { Capture, Bucket, Folder } from '@shared/schema';

export interface SearchResult {
  id: string;
  type: 'capture' | 'bucket' | 'folder';
  title: string;
  subtitle?: string;
  score: number;
  item: Capture | Bucket | Folder;
  icon?: string;
  color?: string;
  isStarred?: boolean;
}

export interface SearchableItem {
  id: string;
  type: 'capture' | 'bucket' | 'folder';
  searchableText: string;
  title: string;
  subtitle?: string;
  item: Capture | Bucket | Folder;
  icon?: string;
  color?: string;
  isStarred?: boolean;
  createdAt?: string;
  baseScore: number;
}

export class SearchIndex {
  private items: SearchableItem[] = [];
  private bucketMap: Map<string, Bucket> = new Map();
  private folderMap: Map<string, Folder> = new Map();

  buildIndex(captures: Capture[], buckets: Bucket[], folders: Folder[]) {
    // Clear previous index
    this.items = [];
    this.bucketMap.clear();
    this.folderMap.clear();

    // Build lookup maps
    buckets.forEach(bucket => this.bucketMap.set(bucket.id, bucket));
    folders.forEach(folder => this.folderMap.set(folder.id, folder));

    // Index buckets
    buckets.forEach(bucket => {
      this.items.push({
        id: bucket.id,
        type: 'bucket',
        searchableText: `${bucket.name}`.toLowerCase(),
        title: bucket.name,
        subtitle: 'Bucket',
        item: bucket,
        icon: bucket.icon,
        color: bucket.color,
        isStarred: false,
        createdAt: bucket.createdAt instanceof Date ? bucket.createdAt.toISOString() : (bucket.createdAt || undefined),
        baseScore: 0.8, // Buckets have medium base priority
      });
    });

    // Index folders
    folders.forEach(folder => {
      const bucket = this.bucketMap.get(folder.bucketId);
      this.items.push({
        id: folder.id,
        type: 'folder',
        searchableText: `${folder.name}`.toLowerCase(),
        title: folder.name,
        subtitle: bucket ? `Folder in ${bucket.name}` : 'Folder',
        item: folder,
        icon: 'fas fa-folder',
        color: bucket?.color,
        isStarred: false,
        createdAt: folder.createdAt instanceof Date ? folder.createdAt.toISOString() : (folder.createdAt || undefined),
        baseScore: 0.7, // Folders have medium-low priority
      });
    });

    // Index captures
    captures.forEach(capture => {
      const bucket = this.bucketMap.get(capture.bucketId);
      const folder = capture.folderId ? this.folderMap.get(capture.folderId) : null;
      
      // Build searchable text with weighted fields
      const searchableText = [
        capture.text, // Primary search field (weight 3)
        capture.description || '', // Secondary field (weight 2)
        capture.type, // Type field (weight 1)
      ].join(' ').toLowerCase();

      let subtitle = `${capture.type}`;
      if (folder) {
        subtitle += ` in ${folder.name}`;
      } else if (bucket) {
        subtitle += ` in ${bucket.name}`;
      }

      this.items.push({
        id: capture.id,
        type: 'capture',
        searchableText,
        title: capture.text,
        subtitle,
        item: capture,
        icon: this.getCaptureIcon(capture.type),
        color: bucket?.color,
        isStarred: capture.isStarred || false,
        createdAt: capture.createdAt instanceof Date ? capture.createdAt.toISOString() : (capture.createdAt || undefined),
        baseScore: 1.0, // Captures have highest base priority
      });
    });
  }

  search(query: string, limit: number = 30): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const queryTerms = this.tokenize(normalizedQuery);

    const results: SearchResult[] = [];

    for (const item of this.items) {
      const score = this.calculateFuzzyScore(item, queryTerms, normalizedQuery);
      
      if (score > 0) {
        results.push({
          id: item.id,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle,
          score,
          item: item.item,
          icon: item.icon,
          color: item.color,
          isStarred: item.isStarred,
        });
      }
    }

    // Sort by score (descending) and return limited results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.toLowerCase());
  }

  private calculateFuzzyScore(item: SearchableItem, queryTerms: string[], fullQuery: string): number {
    let score = 0;
    const text = item.searchableText;
    const title = item.title.toLowerCase();

    // Exact phrase match (highest weight)
    if (text.includes(fullQuery)) {
      score += 100;
      
      // Bonus for title match
      if (title.includes(fullQuery)) {
        score += 50;
      }
    }

    // Individual term matches
    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 20;
        
        // Bonus for title match
        if (title.includes(term)) {
          score += 10;
        }

        // Bonus for word start match
        if (this.matchesWordStart(text, term)) {
          score += 15;
        }
      }

      // Partial matches using simple substring approach
      for (let i = 0; i < text.length - term.length + 1; i++) {
        const substring = text.substring(i, i + term.length);
        if (this.fuzzyMatch(substring, term)) {
          score += 5;
          break;
        }
      }
    }

    // Apply base score multiplier
    score *= item.baseScore;

    // Boost starred items
    if (item.isStarred) {
      score *= 1.3;
    }

    // Boost recent items (created within last 7 days)
    if (item.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        score *= 1.1;
      }
    }

    return score;
  }

  private matchesWordStart(text: string, term: string): boolean {
    // Escape special regex characters to prevent crashes
    const escapedTerm = this.escapeRegExp(term);
    try {
      const regex = new RegExp(`\\b${escapedTerm}`, 'i');
      return regex.test(text);
    } catch (error) {
      // Fallback to simple word start check if regex fails
      return text.split(/\s+/).some(word => word.toLowerCase().startsWith(term.toLowerCase()));
    }
  }

  private escapeRegExp(string: string): string {
    // Escape special regex characters
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    const threshold = 0.7;
    const similarity = this.calculateSimilarity(text, pattern);
    return similarity >= threshold;
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  private getCaptureIcon(type: string): string {
    switch (type) {
      case 'task': return 'fas fa-check-square';
      case 'idea': return 'fas fa-lightbulb';
      case 'reference': return 'fas fa-bookmark';
      default: return 'fas fa-note';
    }
  }
}

// Singleton instance
export const searchIndex = new SearchIndex();

// Debounced search hook
import { useState, useCallback, useRef } from 'react';

export function useDebounceSearch(delay: number = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const search = useCallback((query: string, limit?: number) => {
    setIsSearching(true);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const searchResults = searchIndex.search(query, limit);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, delay);
  }, [delay]);

  const clearResults = useCallback(() => {
    setResults([]);
    setIsSearching(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    results,
    isSearching,
    search,
    clearResults,
  };
}