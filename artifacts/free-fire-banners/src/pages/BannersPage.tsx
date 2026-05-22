import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, ChevronDown, Loader2, AlertCircle, Clock, Flame, Shield, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REGIONS = [
  { code: "SG", name: "Singapore" },
  { code: "BD", name: "Bangladesh" },
  { code: "IND", name: "India" },
  { code: "CIS", name: "CIS" },
  { code: "EU", name: "Europe" },
  { code: "NA", name: "North America" },
  { code: "PK", name: "Pakistan" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "ME", name: "Middle East" },
  { code: "BR", name: "Brazil" },
  { code: "LATAM", name: "Latin America" },
  { code: "VN", name: "Vietnam" },
  { code: "TW", name: "Taiwan" },
];

type Tab = "most-recent" | "ending-soon" | "standard" | "coming-soon";

interface BannerItem {
  slno: number;
  filename: string;
  request_name: string;
  url: string;
}

function cleanUrl(raw: string): string {
  const match = raw.match(/^(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|svg|mp4|mp3|html))/i);
  if (match) return match[1];
  const atIdx = raw.search(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/);
  if (atIdx > 0) return raw.slice(0, atIdx);
  return raw;
}

interface ApiResponse {
  success: boolean;
  server: string;
  categories: {
    backgrounds?: { total: number; items: BannerItem[] };
    booyahpass?: { total: number; items: BannerItem[] };
    loading?: { total: number; items: BannerItem[] };
    html?: { total: number; items: BannerItem[] };
    others?: { total: number; items: BannerItem[] };
  };
}

function fetchBanners(region: string): Promise<ApiResponse> {
  return fetch(`/api/banners?server=${region}`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch banners");
    return r.json();
  });
}

function BannerCard({ item }: { item: BannerItem }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const url = cleanUrl(item.url);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        toast({ description: "URL copied to clipboard!" });
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [url, toast]
  );

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const isImageUrl = !url.endsWith(".html") && !url.endsWith(".mp4") && !url.endsWith(".mp3");

  return (
    <div className="relative overflow-hidden rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,14%,11%)] group transition-all duration-200 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10">
      {isImageUrl && !imgError ? (
        <div className="relative w-full aspect-[16/7] bg-[hsl(220,15%,8%)] overflow-hidden">
          <img
            src={url}
            alt={item.request_name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <button
            onClick={handleOpen}
            className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/50 hover:bg-orange-500 backdrop-blur-sm flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100"
            title="Open in new tab"
          >
            <ExternalLink size={13} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-[16/7] bg-[hsl(220,15%,8%)] flex items-center justify-center">
          <div className="text-center text-[hsl(220,8%,45%)]">
            <ExternalLink size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs px-4 break-all opacity-60">{item.url.split("/").pop()}</p>
          </div>
          <button
            onClick={handleOpen}
            className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/50 hover:bg-orange-500 flex items-center justify-center transition-all duration-150"
            title="Open link"
          >
            <ExternalLink size={13} className="text-white" />
          </button>
        </div>
      )}

      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <p
          className="text-sm font-medium text-[hsl(0,0%,88%)] truncate leading-tight"
          title={item.request_name}
        >
          {item.request_name}
        </p>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[hsl(220,12%,16%)] hover:bg-orange-500 text-[hsl(0,0%,70%)] hover:text-white transition-all duration-150 border border-[hsl(220,10%,22%)] hover:border-orange-500"
          title="Copy URL"
        >
          {copied ? (
            <><Check size={11} />Copied</>
          ) : (
            <><Copy size={11} />Copy URL</>
          )}
        </button>
      </div>
    </div>
  );
}

function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span className="text-orange-500">{icon}</span>}
      <h2 className="text-lg font-bold text-orange-500 tracking-wide uppercase text-sm">{children}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-orange-500/40 to-transparent" />
    </div>
  );
}

export default function BannersPage() {
  const [region, setRegion] = useState("IND");
  const [activeTab, setActiveTab] = useState<Tab>("most-recent");
  const [regionOpen, setRegionOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["banners", region],
    queryFn: () => fetchBanners(region),
    staleTime: 5 * 60 * 1000,
  });

  const selectedRegion = REGIONS.find((r) => r.code === region) ?? REGIONS[0];

  const loadingItems: BannerItem[] = data?.categories?.loading?.items ?? [];
  const backgroundItems: BannerItem[] = data?.categories?.backgrounds?.items ?? [];
  const allItems: BannerItem[] = [
    ...loadingItems,
    ...(data?.categories?.booyahpass?.items ?? []),
    ...(data?.categories?.html?.items ?? []),
  ];

  const mostRecentItems = [...loadingItems].sort((a, b) => b.slno - a.slno);
  const endingSoonItems = [...allItems].sort((a, b) => a.slno - b.slno).slice(0, 30);
  const standardItems = [...backgroundItems].sort((a, b) => b.slno - a.slno);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "most-recent", label: "Most Recent", icon: <Flame size={14} /> },
    { id: "ending-soon", label: "Ending Soon", icon: <Clock size={14} /> },
    { id: "standard", label: "Standard Banners", icon: <Shield size={14} /> },
    { id: "coming-soon", label: "Coming Soon", icon: <Sparkles size={14} /> },
  ];

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="text-orange-500 animate-spin" />
          <p className="text-[hsl(220,8%,55%)] text-sm">Fetching banners for {selectedRegion.name}...</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={32} className="text-red-500" />
          <p className="text-[hsl(220,8%,55%)] text-sm">Failed to load banners. Try another region.</p>
        </div>
      );
    }

    if (activeTab === "coming-soon") {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-full bg-[hsl(220,14%,14%)] border-2 border-orange-500/30 flex items-center justify-center">
            <Sparkles size={36} className="text-orange-500/60" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-[hsl(0,0%,80%)] mb-1">Coming Soon</h3>
            <p className="text-[hsl(220,8%,50%)] text-sm max-w-xs">
              This section is under construction. New banners will appear here soon.
            </p>
          </div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-orange-500/50 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      );
    }

    const items =
      activeTab === "most-recent"
        ? mostRecentItems
        : activeTab === "ending-soon"
        ? endingSoonItems
        : standardItems;

    const sectionTitle =
      activeTab === "most-recent"
        ? "Recent Banners"
        : activeTab === "ending-soon"
        ? "Ending Soon"
        : "Standard Banners";

    const sectionIcon =
      activeTab === "most-recent" ? (
        <Flame size={16} />
      ) : activeTab === "ending-soon" ? (
        <Clock size={16} />
      ) : (
        <Shield size={16} />
      );

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-full bg-[hsl(220,14%,14%)] flex items-center justify-center">
            <AlertCircle size={24} className="text-[hsl(220,8%,45%)]" />
          </div>
          <p className="text-[hsl(220,8%,55%)] text-sm">No banners available for this region/tab.</p>
        </div>
      );
    }

    return (
      <div>
        <SectionHeading icon={sectionIcon}>{sectionTitle}</SectionHeading>
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => (
            <BannerCard key={`${item.slno}-${item.request_name}`} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,15%,8%)] text-[hsl(0,0%,92%)]">
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <header className="sticky top-0 z-20 bg-[hsl(220,15%,8%)] pt-4 pb-3 border-b border-[hsl(220,10%,14%)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <Flame size={16} className="text-white" />
              </div>
              <span className="text-base font-bold tracking-wide text-white">FF Login Banners</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            {tabs.slice(0, 2).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-[hsl(220,12%,16%)] text-[hsl(0,0%,65%)] hover:bg-[hsl(220,12%,20%)] hover:text-white border border-[hsl(220,10%,20%)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {tabs.slice(2, 3).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-[hsl(220,12%,16%)] text-[hsl(0,0%,65%)] hover:bg-[hsl(220,12%,20%)] hover:text-white border border-[hsl(220,10%,20%)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            <div className="relative">
              <button
                onClick={() => setRegionOpen((p) => !p)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-[hsl(220,12%,16%)] text-[hsl(0,0%,65%)] hover:bg-[hsl(220,12%,20%)] hover:text-white border border-[hsl(220,10%,20%)] transition-all duration-150"
              >
                <span>Region: {selectedRegion.name}</span>
                <ChevronDown size={14} className={`transition-transform ${regionOpen ? "rotate-180" : ""}`} />
              </button>
              {regionOpen && (
                <div className="absolute top-full mt-1 right-0 w-52 bg-[hsl(220,14%,13%)] border border-[hsl(220,10%,20%)] rounded-xl shadow-2xl z-30 overflow-hidden">
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {REGIONS.map((r) => (
                      <button
                        key={r.code}
                        onClick={() => { setRegion(r.code); setRegionOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                          r.code === region
                            ? "bg-orange-500/20 text-orange-400 font-semibold"
                            : "text-[hsl(0,0%,75%)] hover:bg-[hsl(220,12%,18%)] hover:text-white"
                        }`}
                      >
                        <span>{r.name}</span>
                        <span className="text-xs text-[hsl(220,8%,50%)] font-mono">{r.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 mt-2">
            {tabs.slice(3).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-[hsl(220,12%,16%)] text-[hsl(0,0%,65%)] hover:bg-[hsl(220,12%,20%)] hover:text-white border border-[hsl(220,10%,20%)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="mt-5">
          {regionOpen && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setRegionOpen(false)}
            />
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
