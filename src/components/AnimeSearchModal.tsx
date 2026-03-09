import { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { searchAnime, cacheAnime } from "@/lib/jikan";
import type { JikanAnime } from "@/types";

interface AnimeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (anime: JikanAnime) => void;
  buttonLabel?: string;
}

export default function AnimeSearchModal({
  isOpen,
  onClose,
  onSelect,
  buttonLabel = "Add",
}: AnimeSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await searchAnime(query);
        setResults(data.slice(0, 10));
      } catch {
        setError("Failed to search. Please try again.");
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleSelect(anime: JikanAnime) {
    await cacheAnime(anime);
    onSelect(anime);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-card animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {error && (
            <p className="text-destructive text-xs p-4">{error}</p>
          )}
          {results.length === 0 && query && !loading && (
            <p className="text-muted-foreground text-sm p-4 text-center">No results found</p>
          )}
          {!query && (
            <p className="text-muted-foreground text-sm p-4 text-center">
              Type to search from MyAnimeList
            </p>
          )}
          {results.map((anime) => (
            <div
              key={anime.mal_id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <img
                src={anime.images?.jpg?.image_url}
                alt={anime.title}
                className="w-10 h-14 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{anime.title}</p>
                {anime.title_english && anime.title_english !== anime.title && (
                  <p className="text-xs text-muted-foreground truncate">{anime.title_english}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {anime.episodes && (
                    <span className="text-xs text-muted-foreground">{anime.episodes} eps</span>
                  )}
                  {anime.score && (
                    <span className="text-xs text-yellow-400">★ {anime.score}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{anime.status}</span>
                </div>
              </div>
              <button
                onClick={() => handleSelect(anime)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center gradient-primary rounded-lg text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
