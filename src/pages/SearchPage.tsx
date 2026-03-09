import { useState } from "react";
import { searchAnime, cacheAnime } from "@/lib/jikan";
import AnimeSearchModal from "@/components/AnimeSearchModal";
import { useWatchEntries } from "@/hooks/useWatchEntries";
import { useAuthContext } from "@/contexts/AuthContext";
import type { JikanAnime } from "@/types";
import { Search, Star, Tv, Plus, Check } from "lucide-react";

export default function SearchPage() {
  const { user } = useAuthContext();
  const { entries, addEntry } = useWatchEntries(user?.id);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchAnime(query);
      setResults(data);
    } catch {
      // silent
    }
    setLoading(false);
  }

  async function handleAdd(anime: JikanAnime) {
    if (!user) return;
    setAdding(anime.mal_id);
    await cacheAnime(anime);
    await addEntry(user.id, anime.mal_id, "plan_to_watch");
    setAdding(null);
  }

  const inList = new Set(entries.map((e) => e.mal_id));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Search Anime</h1>
        <p className="text-sm text-muted-foreground">Powered by MyAnimeList via Jikan API</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 gradient-primary rounded-lg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-glow"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((anime) => (
            <div
              key={anime.mal_id}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all shadow-card group"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={anime.images?.jpg?.image_url}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {anime.score && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-medium text-foreground">{anime.score}</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-foreground text-xs leading-tight line-clamp-2 mb-2">
                  {anime.title_english || anime.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {anime.episodes ? `${anime.episodes} eps` : "?"}
                  </span>
                  <button
                    onClick={() => handleAdd(anime)}
                    disabled={inList.has(anime.mal_id) || adding === anime.mal_id}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                      inList.has(anime.mal_id)
                        ? "bg-accent/20 text-accent cursor-default"
                        : "gradient-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {inList.has(anime.mal_id) ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-16">
          <Tv className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-foreground font-medium">Search for your next watch</p>
          <p className="text-muted-foreground text-sm mt-1">
            Find anime by title and add them to your list
          </p>
        </div>
      )}
    </div>
  );
}
