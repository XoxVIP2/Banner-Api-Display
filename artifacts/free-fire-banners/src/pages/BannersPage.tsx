import { useState, useMemo, useCallback, useEffect, useTransition, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  Loader2,
  AlertCircle,
  Search,
  X,
  Sparkles,
  ShoppingBag,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─────────── Regions ─────────── */
const REGIONS = [
  { code: "SG",    name: "Singapore" },
  { code: "BD",    name: "Bangladesh" },
  { code: "IND",   name: "India" },
  { code: "CIS",   name: "CIS" },
  { code: "EU",    name: "Europe" },
  { code: "NA",    name: "North America" },
  { code: "PK",    name: "Pakistan" },
  { code: "ID",    name: "Indonesia" },
  { code: "TH",    name: "Thailand" },
  { code: "ME",    name: "Middle East" },
  { code: "BR",    name: "Brazil" },
  { code: "LATAM", name: "Latin America" },
  { code: "VN",    name: "Vietnam" },
  { code: "TW",    name: "Taiwan" },
];

/* Per-region quick filter chips */
const REGION_FILTERS: Record<string, string[]> = {
  SG:    ["Tab", "1400x700"],
  IND:   ["Tab", "1400x700"],
  BD:    ["Tab", "1400x700"],
  CIS:   ["Tab", "1400x700"],
  EU:    ["Tab", "1400x700"],
  NA:    ["Tab", "1400x700"],
  PK:    ["Tab", "1400x700"],
  ID:    ["Tab", "1400x700", "Overview"],
  VN:    ["Tab", "1400x700"],
  LATAM: ["Tab", "1400x700"],
  BR:    ["Tab", "1400x700"],
  ME:    ["Tab", "1400x700", "BG"],
  TW:    ["180x80", "1400x700"],
  TH:    ["TabTH", "1400x700"],
};

/* ─────────── Types ─────────── */
type Tab = "banners" | "store";

interface BannerItem {
  slno: number;
  filename: string;
  request_name: string;
  url: string;
}

interface ApiResponse {
  success: boolean;
  server: string;
  categories: {
    backgrounds?: { total: number; items: BannerItem[] };
    booyahpass?:  { total: number; items: BannerItem[] };
    loading?:     { total: number; items: BannerItem[] };
    html?:        { total: number; items: BannerItem[] };
    others?:      { total: number; items: BannerItem[] };
  };
}

/* ─────────── URL cleaning ─────────── */
function cleanUrl(raw: string): string {
  if (!raw) return raw;

  // 1. Remove duplicated region path: /common/{1-6 lower}/common/ → /common/
  //    Handles: /common/in/common/, /common/com/common/, /common/sg/common/ etc.
  let url = raw.replace(/\/common\/[a-z]{1,6}\/common\//gi, "/common/");

  // 2. Remove leftover short region prefix directly before OB version number
  //    e.g. /common/inOB53/ or /common/0OB46/ or /common/-OB46/ → /common/OB46/
  url = url.replace(/\/common\/[-0-9a-zA-Z]{1,4}(OB\d+)\//gi, "/common/$1/");

  // 3. Strip everything after a valid file extension (garbage bytes)
  const extMatch = url.match(
    /^(https?:\/\/[^\s\x00-\x1F\x7F-\uFFFF]+?\.(jpg|jpeg|png|gif|webp|svg|mp4|mp3|ogg|html|json|ktx|pvr|astc|png))/i
  );
  if (extMatch) return extMatch[1];

  // 4. Fallback: strip non-ASCII chars from the end
  const cleaned = url.replace(/[^\x20-\x7E]+.*$/, "").trim();
  return cleaned || raw;
}

/* ─────────── Junk URL filter ─────────── */
const JUNK_PATTERN =
  /discord\.gg|facebook\.com|youtube\.com|youtu\.be|whatsapp\.com|linktr\.ee|ffredirect|t\.me\/|instagram\.com|twitter\.com|tiktok\.com|docs\.google\.com|ff\.redirect|ff\.article\.en|ff\.garena\.com|esports\.freefire|PreviewBG|167\.png/i;

function isJunk(item: BannerItem): boolean {
  return JUNK_PATTERN.test(item.url) || JUNK_PATTERN.test(item.request_name);
}

/* ─────────── API fetch ─────────── */
function fetchBanners(region: string): Promise<ApiResponse> {
  return fetch(`/api/banners?server=${region}`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch banners");
    return r.json();
  });
}

/* ─────────── Logo ─────────── */
function FFLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ffG1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF3D00" />
        </linearGradient>
      </defs>
      <path d="M16 2L28 8.5V23.5L16 30L4 23.5V8.5L16 2Z" fill="url(#ffG1)" />
      <path d="M16 5L25.5 10.25V21.75L16 27L6.5 21.75V10.25L16 5Z"
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <path d="M19.5 8H13L10 16H14L11 24H13.5L23 14.5H18.5L21.5 8Z"
            fill="white" opacity="0.95" />
    </svg>
  );
}

/* ─────────── Banner Card (memoised) ─────────── */
const BannerCard = memo(function BannerCard({ item }: { item: BannerItem }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const url = useMemo(() => cleanUrl(item.url), [item.url]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        toast({ description: "URL copied!" });
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [url, toast]
  );

  const handleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [url]
  );

  const isImage =
    !url.endsWith(".html") &&
    !url.endsWith(".mp4") &&
    !url.endsWith(".mp3") &&
    !url.endsWith(".ogg") &&
    !url.endsWith(".ktx") &&
    !url.endsWith(".pvr") &&
    !url.endsWith(".astc") &&
    !url.endsWith(".json");

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.04] transition-colors duration-150 hover:border-orange-500/25 hover:bg-white/[0.06]">
      {/* Image / fallback */}
      {isImage && !imgError ? (
        <div className="relative w-full aspect-[21/9] bg-black/40 overflow-hidden">
          <img
            src={url}
            alt={item.request_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <button
            onClick={handleOpen}
            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/55 hover:bg-orange-500 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
            title="Open"
          >
            <ExternalLink size={13} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-[21/9] bg-black/25 flex items-center justify-center border-b border-white/5">
          <div className="text-center text-white/20 px-4 select-none">
            <ExternalLink size={22} className="mx-auto mb-1.5 opacity-40" />
            <p className="text-xs break-all line-clamp-2 leading-relaxed opacity-70">
              {url.replace(/^https?:\/\//, "")}
            </p>
          </div>
          <button
            onClick={handleOpen}
            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 hover:bg-orange-500 flex items-center justify-center transition-colors border border-white/10"
          >
            <ExternalLink size={13} className="text-white" />
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/75 truncate" title={item.request_name}>
          {item.request_name}
        </p>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
            copied
              ? "bg-green-500/15 text-green-400 border border-green-500/25"
              : "bg-white/5 hover:bg-orange-500 text-white/45 hover:text-white border border-white/8 hover:border-orange-500"
          }`}
        >
          {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy URL</>}
        </button>
      </div>
    </div>
  );
});

/* ─────────── Debounce hook ─────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─────────── Main Page ─────────── */
export default function BannersPage() {
  const [region, setRegion]         = useState("IND");
  const [activeTab, setActiveTab]   = useState<Tab>("banners");
  const [regionOpen, setRegionOpen] = useState(false);
  const [searchRaw, setSearchRaw]   = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [, startTransition]         = useTransition();

  const search = useDebounce(searchRaw, 250);

  const selectedRegion = REGIONS.find((r) => r.code === region) ?? REGIONS[0];
  const quickFilters   = REGION_FILTERS[region] ?? [];

  /* Reset filter when region changes */
  useEffect(() => {
    setActiveFilter(null);
    setSearchRaw("");
  }, [region]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["banners", region],
    queryFn:  () => fetchBanners(region),
    staleTime: 5 * 60 * 1000,
  });

  /* All items: merge categories, filter junk, sort recent-first (high slno first) */
  const allItems = useMemo((): BannerItem[] => {
    if (!data?.categories) return [];
    const { backgrounds, booyahpass, loading, html, others } = data.categories;
    return [
      ...(loading?.items    ?? []),
      ...(backgrounds?.items ?? []),
      ...(booyahpass?.items  ?? []),
      ...(html?.items        ?? []),
      ...(others?.items      ?? []),
    ]
      .filter((item) => !isJunk(item))
      .sort((a, b) => b.slno - a.slno);
  }, [data]);

  /* Apply text search + active quick-filter chip */
  const filteredItems = useMemo(() => {
    let items = allItems;

    if (activeFilter) {
      const af = activeFilter.toLowerCase();
      items = items.filter(
        (i) =>
          i.request_name.toLowerCase().includes(af) ||
          cleanUrl(i.url).toLowerCase().includes(af)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.request_name.toLowerCase().includes(q) ||
          cleanUrl(i.url).toLowerCase().includes(q)
      );
    }

    return items;
  }, [allItems, search, activeFilter]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => setSearchRaw(e.target.value));
  }, []);

  const handleClearSearch = useCallback(() => {
    startTransition(() => setSearchRaw(""));
  }, []);

  const handleFilterChip = useCallback((chip: string) => {
    startTransition(() => {
      setActiveFilter((prev) => (prev === chip ? null : chip));
      setSearchRaw("");
    });
  }, []);

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      <div className="max-w-2xl mx-auto px-4 pb-16">

        {/* ── Sticky header ── */}
        <header className="sticky top-0 z-20 bg-[#0d0f14] pt-4 pb-2">

          {/* Logo row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <FFLogo />
              <div>
                <h1 className="text-base font-bold text-white leading-none tracking-wide">FF Login Banners</h1>
                <p className="text-[10px] text-orange-500/70 font-medium tracking-widest uppercase mt-0.5">Free Fire Asset Viewer</p>
              </div>
            </div>

            {/* Region selector */}
            <div className="relative">
              <button
                onClick={() => setRegionOpen((p) => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/8 text-white/70 hover:text-white border border-white/8 hover:border-orange-500/40 transition-colors"
              >
                <span className="text-xs font-mono text-orange-400 font-bold">{selectedRegion.code}</span>
                <span className="text-white/30">|</span>
                <span className="text-xs">{selectedRegion.name}</span>
                <ChevronDown size={12} className={`text-white/35 transition-transform ${regionOpen ? "rotate-180" : ""}`} />
              </button>

              {regionOpen && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-[#161920] border border-white/8 rounded-xl shadow-2xl z-30 overflow-hidden">
                  <div className="py-1.5 max-h-72 overflow-y-auto">
                    {REGIONS.map((r) => (
                      <button
                        key={r.code}
                        onClick={() => { setRegion(r.code); setRegionOpen(false); }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                          r.code === region
                            ? "bg-orange-500/15 text-orange-400 font-semibold"
                            : "text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{r.name}</span>
                        <span className={`text-xs font-mono ${r.code === region ? "text-orange-400" : "text-white/25"}`}>{r.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-3">
            {(["banners", "store"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                  activeTab === t
                    ? "bg-orange-500 text-white"
                    : "bg-white/5 text-white/45 hover:bg-white/8 hover:text-white border border-white/6"
                }`}
              >
                {t === "banners" ? <LayoutGrid size={13} /> : <ShoppingBag size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Search + quick filters — only on banners tab */}
          {activeTab === "banners" && (
            <>
              {/* Search input */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  value={searchRaw}
                  onChange={handleSearchChange}
                  placeholder="Search banners…"
                  className="w-full bg-white/[0.05] border border-white/8 focus:border-orange-500/50 rounded-xl pl-8.5 pr-8 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                />
                {searchRaw && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Quick filter chips */}
              {quickFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {quickFilters.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleFilterChip(chip)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                        activeFilter === chip
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white/5 text-white/45 border-white/8 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                  {activeFilter && (
                    <button
                      onClick={() => setActiveFilter(null)}
                      className="px-2 py-1 rounded-lg text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                    >
                      <X size={10} /> Clear
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-2 h-px bg-gradient-to-r from-orange-500/20 via-white/5 to-transparent" />
        </header>

        {/* Overlay to close region dropdown */}
        {regionOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setRegionOpen(false)} />
        )}

        {/* ── Content ── */}
        <main className="mt-4">
          {activeTab === "store" ? (
            <StoreComing />
          ) : isLoading ? (
            <StatusView icon={<Loader2 size={28} className="text-orange-500 animate-spin" />}
                        text={`Loading banners for ${selectedRegion.name}…`} />
          ) : isError ? (
            <StatusView icon={<AlertCircle size={28} className="text-red-500/60" />}
                        text="Failed to load banners. Try a different region." />
          ) : filteredItems.length === 0 ? (
            <StatusView icon={<Search size={26} className="text-white/20" />}
                        text={activeFilter || search ? `No results for "${activeFilter ?? search}"` : "No banners available for this region."} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-white/20 font-medium">
                {filteredItems.length} banner{filteredItems.length !== 1 ? "s" : ""}
                {(activeFilter || search) ? ` — "${activeFilter ?? search}"` : ""}
              </p>
              {filteredItems.map((item, idx) => (
                <BannerCard key={`${region}-${idx}-${item.slno}-${item.request_name.slice(0, 12)}`} item={item} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */
function StoreComing() {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-5">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-700/10 border border-orange-500/20 flex items-center justify-center">
          <ShoppingBag size={38} className="text-orange-500/55" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white/85 tracking-tight">Coming Soon</h3>
        <p className="text-white/35 text-sm max-w-xs leading-relaxed">
          The Store section is under construction. 252x256 &amp; 1500x750 Link Appear Soon.
        </p>
      </div>
      <div className="flex gap-1.5 mt-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500/45 animate-bounce"
               style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

function StatusView({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      {icon}
      <p className="text-white/25 text-sm text-center max-w-xs">{text}</p>
    </div>
  );
}
