import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  Truck,
  Warehouse,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Boxes,
  Clock3,
  ShieldMinus,
  BadgeDollarSign,
  Ban,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const SHEET_ID = "1KA0mswUxULOvwUdyfnd67k1dKbCUh1-9USOL2cDJC9A";
const LOGO_URL = "/logo.png";

const TAB_NAMES = {
  spCampaigns: "Sponsored Products Campaigns",
  spProducts: "Products_Ad_Report",
  sbCampaigns: "Sponsored Brands Campaigns",
  sdCampaigns: "Sponsored Display Campaigns",
  spSearchTerms: "SP Search Term Report",
  sbSearchTerms: "SB Search Term Report",
  itemRef: "item_data_reference",
  inventoryFba: "inventory_fba",
  inventoryAwd: "inventory_awd",
  products30d: "products_30d",
};

const DAYS_TO_SHIP_TARGET = 60;
const DAYS_URGENT = 14;
const NEGATIVE_CLICK_THRESHOLD = 10;

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getSheetUrl(tabName, query = "select *") {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    tabName
  )}&headers=1&tq=${encodeURIComponent(query)}`;
}

function parseGviz(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  const json = JSON.parse(text.slice(start + 1, end));
  const cols = json.table.cols.map((c, i) => c.label || c.id || `col_${i}`);
  return json.table.rows.map((row) => {
    const out = {};
    cols.forEach((col, i) => {
      out[col] = row.c?.[i]?.v ?? null;
    });
    return out;
  });
}

async function fetchSheet(tabName) {
  const res = await fetch(getSheetUrl(tabName));
  if (!res.ok) throw new Error(`Failed to load sheet tab: ${tabName}`);
  const text = await res.text();
  return parseGviz(text);
}

function pick(obj, keys, fallback = null) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return fallback;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/[$,%\s,]/g, "")) || 0;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function numberFmt(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function compactNumber(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function daysLabel(days) {
  if (!Number.isFinite(days)) return "—";
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  if (days >= 30) return `${(days / 30).toFixed(1)}mo`;
  return `${Math.round(days)}d`;
}

function extractAsin(text) {
  const normalized = normalizeText(text).toUpperCase();
  const match = normalized.match(/([A-Z0-9]{10})/);
  return match ? match[1] : "";
}

function extractAsins(text) {
  const normalized = normalizeText(text).toUpperCase();
  const matches = normalized.match(/[A-Z0-9]{10}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function inferImageUrl(row) {
  const explicit = normalizeText(
    pick(row, ["image url", "Image URL", "image_url", "Image Url"], "")
  );
  if (explicit) return explicit;
  const asin = normalizeText(pick(row, ["asin", "ASIN"], ""));
  return asin
    ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg`
    : "";
}

function AsinImage({ src, title }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        N/A
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || "Product"}
      className="h-10 w-10 shrink-0 rounded-2xl border border-slate-800 bg-white object-contain p-1"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}

function sortRows(rows, sortConfig) {
  if (!sortConfig?.key) return rows;
  const { key, direction, type = "text", accessor } = sortConfig;
  const dir = direction === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    const av = accessor ? accessor(a) : a[key];
    const bv = accessor ? accessor(b) : b[key];

    if (type === "number") {
      return (normalizeNumber(av) - normalizeNumber(bv)) * dir;
    }

    return (
      String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * dir
    );
  });
}

function SortableHeader({ column, sortConfig, onSort }) {
  const active = sortConfig?.key === column.key;
  const icon = !active ? (
    <ChevronsUpDown className="h-3.5 w-3.5" />
  ) : sortConfig.direction === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );

  if (column.sortable === false) return <span>{column.label}</span>;

  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "inline-flex items-center gap-1 transition",
        active ? "text-cyan-300" : "text-slate-300 hover:text-white"
      )}
    >
      <span>{column.label}</span>
      {icon}
    </button>
  );
}

function SortableTable({ columns, rows, rowKey, sortConfig, onSort }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium whitespace-nowrap">
                <SortableHeader column={col} sortConfig={sortConfig} onSort={onSort} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={typeof rowKey === "function" ? rowKey(row, idx) : row[rowKey] || idx}
              className="border-b border-slate-900 text-slate-200"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-4 align-middle">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useSortableRows(rows, defaultConfig) {
  const [sortConfig, setSortConfig] = useState(defaultConfig || null);
  const sortedRows = useMemo(() => sortRows(rows, sortConfig), [rows, sortConfig]);

  function handleSort(column) {
    const type = column.type || "text";
    const accessor = column.sortAccessor;
    setSortConfig((current) => {
      if (current?.key === column.key) {
        return {
          key: column.key,
          type,
          accessor,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: column.key,
        type,
        accessor,
        direction: type === "text" ? "asc" : "desc",
      };
    });
  }

  return { sortedRows, sortConfig, handleSort };
}

function SidebarButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
        active
          ? "bg-slate-800 text-white shadow-lg shadow-cyan-500/10"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, suffix, icon: Icon, tone = "cyan" }) {
  const formatted =
    suffix === "%"
      ? pct(value)
      : suffix === "x"
      ? `${Number(value || 0).toFixed(2)}x`
      : suffix === "count"
      ? numberFmt(value)
      : currency(value);

  const toneMap = {
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatted}</p>
        </div>
        <div className={cn("rounded-2xl border border-slate-800 bg-slate-900 p-3", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function CountCard({ label, value, suffix = "count", icon: Icon, tone = "cyan" }) {
  return <StatCard label={label} value={value} suffix={suffix} icon={Icon} tone={tone} />;
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function TogglePills({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition",
            value === option
              ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function urgencyPill(days) {
  if (!Number.isFinite(days)) {
    return (
      <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
        No sales
      </span>
    );
  }
  if (days < DAYS_URGENT) {
    return (
      <span className="rounded-full border border-rose-900 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
        Urgent
      </span>
    );
  }
  if (days < DAYS_TO_SHIP_TARGET) {
    return (
      <span className="rounded-full border border-amber-900 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
        Replenish
      </span>
    );
  }
  return (
    <span className="rounded-full border border-emerald-900 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
      Healthy
    </span>
  );
}

function recommendationPill(row) {
  if (row.alreadyBlocked) {
    return (
      <span className="rounded-full border border-cyan-900 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300">
        Already blocked elsewhere
      </span>
    );
  }
  return (
    <span className="rounded-full border border-amber-900 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
      Add negative
    </span>
  );
}

function parseInventoryRows(rows, referenceByAsin, channel) {
  return rows
    .map((row) => {
      const asin = normalizeText(
        pick(row, ["asin", "ASIN", "fnsku", "FNSKU", "msku", "MSKU"], "")
      ).toUpperCase();

      const ref = referenceByAsin.get(asin) || {};

      let units = 0;
      if (channel === "fba") {
        units = normalizeNumber(pick(row, ["afn-total-quantity", "AFN Total Quantity"], 0));
      } else if (channel === "awd") {
        const available = normalizeNumber(pick(row, ["Available in AWD (units)", "available in awd (units)"], 0));
        const inbound = normalizeNumber(pick(row, ["Inbound to AWD (units)", "inbound to awd (units)"], 0));
        units = available + inbound;
      }

      return {
        asin,
        shortTitle:
          ref.shortTitle ||
          asin ||
          normalizeText(pick(row, ["product-name", "Product Name", "title", "Title"], "Unknown")),
        brand: ref.brand || "",
        parentAsin: ref.parentAsin || "",
        itemType: ref.type || "",
        imageUrl:
          ref.imageUrl ||
          (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg` : ""),
        units,
      };
    })
    .filter((row) => row.asin || row.units > 0);
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adView, setAdView] = useState("Campaign");
  const [adType, setAdType] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [parentFilter, setParentFilter] = useState("All");
  const [inventoryFilter, setInventoryFilter] = useState("All");
  const [searchView, setSearchView] = useState("Recommended");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [spCampaignSheet, setSpCampaignSheet] = useState([]);
  const [spProductSheet, setSpProductSheet] = useState([]);
  const [sbCampaignSheet, setSbCampaignSheet] = useState([]);
  const [sdCampaignSheet, setSdCampaignSheet] = useState([]);
  const [spSearchTermsSheet, setSpSearchTermsSheet] = useState([]);
  const [sbSearchTermsSheet, setSbSearchTermsSheet] = useState([]);
  const [referenceSheet, setReferenceSheet] = useState([]);
  const [inventoryFbaSheet, setInventoryFbaSheet] = useState([]);
  const [inventoryAwdSheet, setInventoryAwdSheet] = useState([]);
  const [products30dSheet, setProducts30dSheet] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [
          spCampaigns,
          spProducts,
          sbCampaigns,
          sdCampaigns,
          spSearchTerms,
          sbSearchTerms,
          reference,
          fba,
          awd,
          products30d,
        ] = await Promise.all([
          fetchSheet(TAB_NAMES.spCampaigns),
          fetchSheet(TAB_NAMES.spProducts),
          fetchSheet(TAB_NAMES.sbCampaigns),
          fetchSheet(TAB_NAMES.sdCampaigns),
          fetchSheet(TAB_NAMES.spSearchTerms),
          fetchSheet(TAB_NAMES.sbSearchTerms),
          fetchSheet(TAB_NAMES.itemRef),
          fetchSheet(TAB_NAMES.inventoryFba),
          fetchSheet(TAB_NAMES.inventoryAwd),
          fetchSheet(TAB_NAMES.products30d),
        ]);

        setSpCampaignSheet(spCampaigns);
        setSpProductSheet(spProducts);
        setSbCampaignSheet(sbCampaigns);
        setSdCampaignSheet(sdCampaigns);
        setSpSearchTermsSheet(spSearchTerms);
        setSbSearchTermsSheet(sbSearchTerms);
        setReferenceSheet(reference);
        setInventoryFbaSheet(fba);
        setInventoryAwdSheet(awd);
        setProducts30dSheet(products30d);
        setError("");
      } catch {
        setError(
          "Could not load Google Sheets data. Make sure the sheet is shared to 'Anyone with the link can view' and the tab names match exactly."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const referenceByAsin = useMemo(() => {
    const map = new Map();
    referenceSheet.forEach((row) => {
      const asin = normalizeText(pick(row, ["asin", "ASIN"])).toUpperCase();
      if (!asin) return;
      map.set(asin, {
        asin,
        parentAsin: normalizeText(pick(row, ["parent asin", "Parent ASIN"], "")),
        shortTitle: normalizeText(pick(row, ["short title", "Short Title"], "")),
        brand: normalizeText(pick(row, ["brand", "Brand"], "")),
        type: normalizeText(pick(row, ["type", "Type", "item type", "Item Type"], "")),
        imageUrl: inferImageUrl(row),
      });
    });
    return map;
  }, [referenceSheet]);

  const adTypeOptions = ["All", "Sponsored Products", "Sponsored Brands", "Sponsored Display"];

  const unifiedCampaignRows = useMemo(() => {
    const sp = spCampaignSheet
      .filter((row) => normalizeText(pick(row, ["Entity", "entity"])).toLowerCase() === "campaign")
      .map((row) => {
        const spend = normalizeNumber(pick(row, ["Spend", "Spend(USD)", "Cost"]));
        const sales = normalizeNumber(pick(row, ["Sales", "Sales(USD)", "Attributed Sales", "Sales 7 Day Total Sales"]));
        const clicks = normalizeNumber(pick(row, ["Clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders"]));
        return {
          adType: "Sponsored Products",
          campaignName: normalizeText(pick(row, ["Campaign Name", "Campaign"])),
          state: normalizeText(pick(row, ["State", "Status"], "—")),
          campaignType: normalizeText(pick(row, ["Campaign Type", "Ad Type"], "SP")),
          impressions,
          clicks,
          spend,
          sales,
          orders,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      });

    const sb = sbCampaignSheet
      .filter((row) => normalizeText(pick(row, ["Entity", "entity"])).toLowerCase() === "campaign")
      .map((row) => {
        const spend = normalizeNumber(pick(row, ["Spend", "Spend(USD)", "Cost"]));
        const sales = normalizeNumber(pick(row, ["Sales", "Sales(USD)", "Attributed Sales", "14 Day Total Sales"]));
        const clicks = normalizeNumber(pick(row, ["Clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders", "Orders (#)"]));
        return {
          adType: "Sponsored Brands",
          campaignName: normalizeText(pick(row, ["Campaign Name", "Campaign"])),
          state: normalizeText(pick(row, ["State", "Status"], "—")),
          campaignType: "SB",
          impressions,
          clicks,
          spend,
          sales,
          orders,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      });

    const sd = sdCampaignSheet
      .filter((row) => normalizeText(pick(row, ["Entity", "entity"])).toLowerCase() === "campaign")
      .map((row) => {
        const spend = normalizeNumber(pick(row, ["Spend", "Spend(USD)", "Cost"]));
        const sales = normalizeNumber(pick(row, ["Sales", "Sales(USD)", "Attributed Sales", "Sales 14 Day Total Sales"]));
        const clicks = normalizeNumber(pick(row, ["Clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders"]));
        return {
          adType: "Sponsored Display",
          campaignName: normalizeText(pick(row, ["Campaign Name", "Campaign"])),
          state: normalizeText(pick(row, ["State", "Status"], "—")),
          campaignType: "SD",
          impressions,
          clicks,
          spend,
          sales,
          orders,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      });

    return [...sp, ...sb, ...sd]
      .filter((row) => adType === "All" || row.adType === adType)
      .filter((row) => !query || `${row.campaignName} ${row.state} ${row.campaignType} ${row.adType}`.toLowerCase().includes(query.toLowerCase()));
  }, [spCampaignSheet, sbCampaignSheet, sdCampaignSheet, adType, query]);

  const spProductRows = useMemo(() => {
    return spProductSheet
      .map((row) => {
        const asin = extractAsin(pick(row, ["Products", "Product", "products"], ""));
        const ref = referenceByAsin.get(asin) || {};
        const spend = normalizeNumber(pick(row, ["Spend(USD)", "Spend", "Cost"]));
        const sales = normalizeNumber(pick(row, ["Sales(USD)", "Sales", "Attributed Sales"]));
        const clicks = normalizeNumber(pick(row, ["Clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders"]));
        return {
          adType: "Sponsored Products",
          asin,
          parentAsin: ref.parentAsin || "",
          itemType: ref.type || "",
          brand: ref.brand || "",
          shortTitle: ref.shortTitle || asin,
          imageUrl: ref.imageUrl || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg` : ""),
          impressions,
          clicks,
          spend,
          sales,
          orders,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          cvr: clicks ? (orders / clicks) * 100 : 0,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      })
      .filter((row) => row.asin);
  }, [spProductSheet, referenceByAsin]);

  const sbProductRows = useMemo(() => {
    const rows = [];
    sbCampaignSheet
      .filter((row) => normalizeText(pick(row, ["Entity", "entity"])).toLowerCase() === "campaign")
      .forEach((row) => {
        const spend = normalizeNumber(pick(row, ["Spend", "Spend(USD)", "Cost"]));
        const sales = normalizeNumber(pick(row, ["Sales", "Sales(USD)", "Attributed Sales", "14 Day Total Sales"]));
        const clicks = normalizeNumber(pick(row, ["Clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders", "Orders (#)"]));
        const asins = [
          ...extractAsins(pick(row, ["Creative ASINs"], "")),
          ...extractAsins(pick(row, ["Landing Page URL"], "")),
        ];
        const uniqueAsins = Array.from(new Set(asins)).filter(Boolean);
        if (!uniqueAsins.length) return;
        const divisor = uniqueAsins.length;
        uniqueAsins.forEach((asin) => {
          const ref = referenceByAsin.get(asin) || {};
          rows.push({
            adType: "Sponsored Brands",
            asin,
            parentAsin: ref.parentAsin || "",
            itemType: ref.type || "",
            brand: ref.brand || "",
            shortTitle: ref.shortTitle || asin,
            imageUrl: ref.imageUrl || `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg`,
            impressions: impressions / divisor,
            clicks: clicks / divisor,
            spend: spend / divisor,
            sales: sales / divisor,
            orders: orders / divisor,
            ctr: impressions ? (clicks / impressions) * 100 : 0,
            cvr: clicks ? (orders / clicks) * 100 : 0,
            acos: sales ? (spend / sales) * 100 : 0,
            roas: spend ? sales / spend : 0,
          });
        });
      });
    return rows;
  }, [sbCampaignSheet, referenceByAsin]);

  const sdProductRows = useMemo(() => {
    return sdCampaignSheet
      .filter((row) => normalizeText(pick(row, ["Entity", "entity"])).toLowerCase() === "campaign")
      .map((row) => {
        const asin = extractAsin(pick(row, ["Promoted ASIN", "ASIN", "Advertised ASIN", "Product"], ""));
        const ref = referenceByAsin.get(asin) || {};
        const spend = normalizeNumber(pick(row, ["Spend", "Spend(USD)", "Cost"]));
        const sales = normalizeNumber(pick(row, ["Sales", "Sales(USD)", "Attributed Sales", "Sales 14 Day Total Sales"]));
        const clicks = normalizeNumber(pick(row, ["Clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders"]));
        return {
          adType: "Sponsored Display",
          asin,
          parentAsin: ref.parentAsin || "",
          itemType: ref.type || "",
          brand: ref.brand || "",
          shortTitle: ref.shortTitle || asin || normalizeText(pick(row, ["Campaign Name"], "Display Campaign")),
          imageUrl: ref.imageUrl || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg` : ""),
          impressions,
          clicks,
          spend,
          sales,
          orders,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          cvr: clicks ? (orders / clicks) * 100 : 0,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      })
      .filter((row) => row.asin);
  }, [sdCampaignSheet, referenceByAsin]);

  const unifiedProductRows = useMemo(() => {
    return [...spProductRows, ...sbProductRows, ...sdProductRows]
      .filter((row) => adType === "All" || row.adType === adType)
      .filter((row) => brandFilter === "All" || row.brand === brandFilter)
      .filter((row) => itemTypeFilter === "All" || row.itemType === itemTypeFilter)
      .filter((row) => parentFilter === "All" || row.parentAsin === parentFilter)
      .filter((row) => !query || `${row.asin} ${row.parentAsin} ${row.shortTitle} ${row.brand} ${row.itemType} ${row.adType}`.toLowerCase().includes(query.toLowerCase()));
  }, [spProductRows, sbProductRows, sdProductRows, adType, brandFilter, itemTypeFilter, parentFilter, query]);

  const brandOptions = useMemo(() => ["All", ...Array.from(new Set(unifiedProductRows.map((r) => r.brand).filter(Boolean))).sort()], [unifiedProductRows]);
  const itemTypeOptions = useMemo(() => ["All", ...Array.from(new Set(unifiedProductRows.map((r) => r.itemType).filter(Boolean))).sort()], [unifiedProductRows]);
  const parentOptions = useMemo(() => ["All", ...Array.from(new Set(unifiedProductRows.map((r) => r.parentAsin).filter(Boolean))).sort()], [unifiedProductRows]);

  const productGrouped = useMemo(() => {
    const map = new Map();
    unifiedProductRows.forEach((row) => {
      const key = `${row.adType}||${row.asin}`;
      const current = map.get(key) || { ...row, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({
      ...row,
      ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0,
      cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0,
      acos: row.sales ? (row.spend / row.sales) * 100 : 0,
      roas: row.spend ? row.sales / row.spend : 0,
    }));
  }, [unifiedProductRows]);

  const parentGrouped = useMemo(() => {
    const map = new Map();
    unifiedProductRows.forEach((row) => {
      const key = `${row.adType}||${row.parentAsin || "Unmapped"}`;
      const current = map.get(key) || { adType: row.adType, parentAsin: row.parentAsin || "Unmapped", imageUrl: row.imageUrl, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({
      ...row,
      ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0,
      cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0,
      acos: row.sales ? (row.spend / row.sales) * 100 : 0,
      roas: row.spend ? row.sales / row.spend : 0,
    }));
  }, [unifiedProductRows]);

  const itemTypeGrouped = useMemo(() => {
    const map = new Map();
    unifiedProductRows.forEach((row) => {
      const key = `${row.adType}||${row.itemType || "Unmapped"}`;
      const current = map.get(key) || { adType: row.adType, itemType: row.itemType || "Unmapped", impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({
      ...row,
      ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0,
      cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0,
      acos: row.sales ? (row.spend / row.sales) * 100 : 0,
      roas: row.spend ? row.sales / row.spend : 0,
    }));
  }, [unifiedProductRows]);

  const adSummary = useMemo(() => {
    const spend = unifiedProductRows.reduce((sum, row) => sum + row.spend, 0);
    const sales = unifiedProductRows.reduce((sum, row) => sum + row.sales, 0);
    return { spend, sales, acos: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0 };
  }, [unifiedProductRows]);

  const adTrend = useMemo(() => {
    const top = [...productGrouped].sort((a, b) => b.sales - a.sales).slice(0, 10);
    return top.map((row) => ({ name: row.shortTitle.length > 22 ? `${row.shortTitle.slice(0, 22)}…` : row.shortTitle, sales: row.sales }));
  }, [productGrouped]);

  const salesByAsin30d = useMemo(() => {
    const map = new Map();
    products30dSheet.forEach((row) => {
      const asin = normalizeText(
        pick(row, ["(Child) ASIN", "Child ASIN", "child asin", "ASIN", "asin"], "")
      ).toUpperCase();
      if (!asin) return;
      const ref = referenceByAsin.get(asin) || {};
      const unitsOrdered = normalizeNumber(pick(row, ["Units Ordered", "units ordered", "Ordered Product Sales Units"], 0));
      const current = map.get(asin) || {
        asin,
        shortTitle: ref.shortTitle || asin,
        brand: ref.brand || "",
        parentAsin: ref.parentAsin || "",
        itemType: ref.type || "",
        imageUrl: ref.imageUrl || `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg`,
        units30d: 0,
      };
      current.units30d += unitsOrdered;
      map.set(asin, current);
    });
    return map;
  }, [products30dSheet, referenceByAsin]);

  const fbaInventoryRows = useMemo(() => parseInventoryRows(inventoryFbaSheet, referenceByAsin, "fba"), [inventoryFbaSheet, referenceByAsin]);
  const awdInventoryRows = useMemo(() => parseInventoryRows(inventoryAwdSheet, referenceByAsin, "awd"), [inventoryAwdSheet, referenceByAsin]);

  const inventoryByAsin = useMemo(() => {
    const map = new Map();
    const upsert = (rows, channel) => {
      rows.forEach((row) => {
        if (!row.asin) return;
        const current = map.get(row.asin) || {
          asin: row.asin,
          shortTitle: row.shortTitle,
          brand: row.brand,
          parentAsin: row.parentAsin,
          itemType: row.itemType,
          imageUrl: row.imageUrl,
          fbaUnits: 0,
          awdUnits: 0,
        };
        if (channel === "fba") current.fbaUnits += row.units;
        if (channel === "awd") current.awdUnits += row.units;
        map.set(row.asin, current);
      });
    };
    upsert(fbaInventoryRows, "fba");
    upsert(awdInventoryRows, "awd");

    return [...map.values()].map((row) => {
      const salesRef = salesByAsin30d.get(row.asin) || {};
      const units30d = normalizeNumber(salesRef.units30d);
      const unitsPerDay = units30d / 30;
      const totalUnits = row.fbaUnits + row.awdUnits;
      const daysOfCover = unitsPerDay > 0 ? totalUnits / unitsPerDay : Number.POSITIVE_INFINITY;
      return {
        ...row,
        units30d,
        unitsPerDay,
        totalUnits,
        daysOfCover,
        urgency: !Number.isFinite(daysOfCover) ? "no_sales" : daysOfCover < DAYS_URGENT ? "urgent" : daysOfCover < DAYS_TO_SHIP_TARGET ? "replenish" : "healthy",
      };
    });
  }, [fbaInventoryRows, awdInventoryRows, salesByAsin30d]);

  const inventoryFiltered = useMemo(() => {
    return inventoryByAsin
      .filter((row) => inventoryFilter === "All" || row.urgency === inventoryFilter)
      .filter((row) => !query || `${row.asin} ${row.shortTitle} ${row.brand} ${row.parentAsin} ${row.itemType}`.toLowerCase().includes(query.toLowerCase()));
  }, [inventoryByAsin, inventoryFilter, query]);

  const urgentInventory = useMemo(() => inventoryByAsin.filter((row) => row.urgency === "urgent").sort((a, b) => a.daysOfCover - b.daysOfCover), [inventoryByAsin]);
  const replenishInventory = useMemo(() => inventoryByAsin.filter((row) => row.urgency === "replenish").sort((a, b) => a.daysOfCover - b.daysOfCover), [inventoryByAsin]);

  const inventorySummary = useMemo(() => {
    const totalFba = inventoryByAsin.reduce((sum, row) => sum + row.fbaUnits, 0);
    const totalAwd = inventoryByAsin.reduce((sum, row) => sum + row.awdUnits, 0);
    const atRisk = inventoryByAsin.filter((row) => row.daysOfCover < DAYS_TO_SHIP_TARGET).length;
    const urgent = inventoryByAsin.filter((row) => row.daysOfCover < DAYS_URGENT).length;
    const totalDailySales = inventoryByAsin.reduce((sum, row) => sum + row.unitsPerDay, 0);
    const blendedDays = totalDailySales > 0 ? (totalFba + totalAwd) / totalDailySales : Number.POSITIVE_INFINITY;
    return { totalFba, totalAwd, atRisk, urgent, blendedDays };
  }, [inventoryByAsin]);

  const riskChartData = useMemo(() => {
    return [...inventoryByAsin]
      .filter((row) => Number.isFinite(row.daysOfCover))
      .sort((a, b) => a.daysOfCover - b.daysOfCover)
      .slice(0, 12)
      .map((row) => ({ name: row.shortTitle.length > 18 ? `${row.shortTitle.slice(0, 18)}…` : row.shortTitle, days: row.daysOfCover }));
  }, [inventoryByAsin]);

  const spExistingNegatives = useMemo(() => {
    return spCampaignSheet
      .filter((row) => {
        const entity = normalizeText(pick(row, ["Entity", "entity"])).toLowerCase();
        const matchType = normalizeText(pick(row, ["Match Type"])).toLowerCase();
        return entity.includes("negative") || matchType.includes("negative");
      })
      .map((row) => ({
        adType: "Sponsored Products",
        entity: normalizeText(pick(row, ["Entity"])),
        campaign: normalizeText(pick(row, ["Campaign Name (Informational only)", "Campaign Name"], "—")),
        adGroup: normalizeText(pick(row, ["Ad Group Name (Informational only)", "Ad Group Name"], "—")),
        term: normalizeText(pick(row, ["Keyword Text", "Product Targeting Expression"], "")),
        matchType: normalizeText(pick(row, ["Match Type"], "—")),
        state: normalizeText(pick(row, ["State"], "—")),
      }))
      .filter((row) => row.term);
  }, [spCampaignSheet]);

  const sbExistingNegatives = useMemo(() => {
    return sbCampaignSheet
      .filter((row) => {
        const entity = normalizeText(pick(row, ["Entity", "entity"])).toLowerCase();
        const matchType = normalizeText(pick(row, ["Match Type"])).toLowerCase();
        return entity.includes("negative") || matchType.includes("negative");
      })
      .map((row) => ({
        adType: "Sponsored Brands",
        entity: normalizeText(pick(row, ["Entity"])),
        campaign: normalizeText(pick(row, ["Campaign Name (Informational only)", "Campaign Name"], "—")),
        adGroup: normalizeText(pick(row, ["Ad Group Name (Informational only)", "Ad Group Name"], "—")),
        term: normalizeText(pick(row, ["Keyword Text", "Product Targeting Expression"], "")),
        matchType: normalizeText(pick(row, ["Match Type"], "—")),
        state: normalizeText(pick(row, ["State"], "—")),
      }))
      .filter((row) => row.term);
  }, [sbCampaignSheet]);

  const existingNegatives = useMemo(() => {
    return [...spExistingNegatives, ...sbExistingNegatives]
      .filter((row) => adType === "All" || row.adType === adType)
      .filter((row) => !query || `${row.term} ${row.campaign} ${row.adGroup} ${row.matchType} ${row.adType}`.toLowerCase().includes(query.toLowerCase()));
  }, [spExistingNegatives, sbExistingNegatives, adType, query]);

  const existingNegativeSet = useMemo(() => {
    return new Set(existingNegatives.map((row) => `${row.adType}||${row.term.toLowerCase()}`));
  }, [existingNegatives]);

  const unifiedSearchTerms = useMemo(() => {
    const sp = spSearchTermsSheet.map((row) => ({
      adType: "Sponsored Products",
      campaign: normalizeText(pick(row, ["Campaign Name (Informational only)"], "—")),
      adGroup: normalizeText(pick(row, ["Ad Group Name (Informational only)"], "—")),
      state: normalizeText(pick(row, ["State"], "—")),
      keywordText: normalizeText(pick(row, ["Keyword Text"], "")),
      matchType: normalizeText(pick(row, ["Match Type"], "—")),
      searchTerm: normalizeText(pick(row, ["Customer Search Term"], "")),
      clicks: normalizeNumber(pick(row, ["Clicks"], 0)),
      spend: normalizeNumber(pick(row, ["Spend"], 0)),
      orders: normalizeNumber(pick(row, ["Orders"], 0)),
      units: normalizeNumber(pick(row, ["Units"], 0)),
      sales: normalizeNumber(pick(row, ["Sales"], 0)),
      impressions: normalizeNumber(pick(row, ["Impressions"], 0)),
      ctr: normalizeNumber(pick(row, ["Click-through Rate"], 0)) * 100,
      cvr: normalizeNumber(pick(row, ["Conversion Rate"], 0)) * 100,
    }));

    const sb = sbSearchTermsSheet.map((row) => ({
      adType: "Sponsored Brands",
      campaign: normalizeText(pick(row, ["Campaign Name (Informational only)"], "—")),
      adGroup: normalizeText(pick(row, ["Ad Group Name (Informational only)"], "—")),
      state: normalizeText(pick(row, ["State"], "—")),
      keywordText: normalizeText(pick(row, ["Keyword Text"], "")),
      matchType: normalizeText(pick(row, ["Match Type"], "—")),
      searchTerm: normalizeText(pick(row, ["Customer Search Term"], "")),
      clicks: normalizeNumber(pick(row, ["Clicks"], 0)),
      spend: normalizeNumber(pick(row, ["Spend"], 0)),
      orders: normalizeNumber(pick(row, ["Orders"], 0)),
      units: normalizeNumber(pick(row, ["Units"], 0)),
      sales: normalizeNumber(pick(row, ["Sales"], 0)),
      impressions: normalizeNumber(pick(row, ["Impressions"], 0)),
      ctr: normalizeNumber(pick(row, ["Click-through Rate"], 0)) * 100,
      cvr: normalizeNumber(pick(row, ["Conversion Rate"], 0)) * 100,
    }));

    return [...sp, ...sb]
      .filter((row) => row.searchTerm)
      .filter((row) => adType === "All" || row.adType === adType)
      .filter((row) => !query || `${row.searchTerm} ${row.campaign} ${row.adGroup} ${row.keywordText} ${row.adType}`.toLowerCase().includes(query.toLowerCase()));
  }, [spSearchTermsSheet, sbSearchTermsSheet, adType, query]);

  const recommendedNegatives = useMemo(() => {
    return unifiedSearchTerms
      .filter((row) => row.clicks >= NEGATIVE_CLICK_THRESHOLD && row.orders === 0 && row.units === 0)
      .map((row) => ({
        ...row,
        suggestedNegativeType: row.matchType && row.matchType.toLowerCase().includes("broad") ? "Negative Phrase" : "Negative Exact",
        alreadyBlocked: existingNegativeSet.has(`${row.adType}||${row.searchTerm.toLowerCase()}`),
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [unifiedSearchTerms, existingNegativeSet]);

  const wastedSpendSummary = useMemo(() => {
    const totalWaste = recommendedNegatives.reduce((sum, row) => sum + row.spend, 0);
    const alreadyBlockedCount = recommendedNegatives.filter((row) => row.alreadyBlocked).length;
    const openCount = recommendedNegatives.filter((row) => !row.alreadyBlocked).length;
    const protectedSpend = recommendedNegatives.filter((row) => row.alreadyBlocked).reduce((sum, row) => sum + row.spend, 0);
    return { totalWaste, alreadyBlockedCount, openCount, protectedSpend };
  }, [recommendedNegatives]);

  const wasteChartData = useMemo(() => {
    return recommendedNegatives
      .filter((row) => !row.alreadyBlocked)
      .slice(0, 12)
      .map((row) => ({
        name: row.searchTerm.length > 18 ? `${row.searchTerm.slice(0, 18)}…` : row.searchTerm,
        spend: row.spend,
      }));
  }, [recommendedNegatives]);

  const campaignColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    { key: "campaignName", label: "Campaign", type: "text" },
    { key: "state", label: "Status", type: "text" },
    { key: "campaignType", label: "Type", type: "text" },
    { key: "impressions", label: "Impr.", type: "number", render: (r) => compactNumber(r.impressions) },
    { key: "clicks", label: "Clicks", type: "number", render: (r) => compactNumber(r.clicks) },
    { key: "spend", label: "Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "sales", label: "Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "orders", label: "Orders", type: "number", render: (r) => numberFmt(r.orders) },
    { key: "ctr", label: "CTR", type: "number", render: (r) => pct(r.ctr) },
    { key: "acos", label: "ACOS", type: "number", render: (r) => pct(r.acos) },
    { key: "roas", label: "ROAS", type: "number", render: (r) => `${r.roas.toFixed(2)}x` },
  ];

  const productColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    {
      key: "asin",
      label: "Product",
      type: "text",
      sortAccessor: (r) => `${r.asin} ${r.shortTitle}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <AsinImage src={r.imageUrl} title={r.shortTitle} />
          <div>
            <div className="font-medium text-cyan-300">{r.asin}</div>
            <div className="text-xs text-slate-400">{r.shortTitle}</div>
          </div>
        </div>
      ),
    },
    { key: "parentAsin", label: "Parent", type: "text" },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "brand", label: "Brand", type: "text" },
    { key: "impressions", label: "Impr.", type: "number", render: (r) => compactNumber(r.impressions) },
    { key: "clicks", label: "Clicks", type: "number", render: (r) => compactNumber(r.clicks) },
    { key: "spend", label: "Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "sales", label: "Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "orders", label: "Orders", type: "number", render: (r) => numberFmt(r.orders) },
    { key: "ctr", label: "CTR", type: "number", render: (r) => pct(r.ctr) },
    { key: "cvr", label: "CVR", type: "number", render: (r) => pct(r.cvr) },
    { key: "acos", label: "ACOS", type: "number", render: (r) => pct(r.acos) },
    { key: "roas", label: "ROAS", type: "number", render: (r) => `${r.roas.toFixed(2)}x` },
  ];

  const parentColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    {
      key: "parentAsin",
      label: "Parent ASIN",
      type: "text",
      render: (r) => (
        <div className="flex items-center gap-3">
          <AsinImage src={r.imageUrl} title={r.parentAsin} />
          <div className="font-medium text-cyan-300">{r.parentAsin}</div>
        </div>
      ),
    },
    { key: "impressions", label: "Impr.", type: "number", render: (r) => compactNumber(r.impressions) },
    { key: "clicks", label: "Clicks", type: "number", render: (r) => compactNumber(r.clicks) },
    { key: "spend", label: "Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "sales", label: "Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "orders", label: "Orders", type: "number", render: (r) => numberFmt(r.orders) },
    { key: "ctr", label: "CTR", type: "number", render: (r) => pct(r.ctr) },
    { key: "cvr", label: "CVR", type: "number", render: (r) => pct(r.cvr) },
    { key: "acos", label: "ACOS", type: "number", render: (r) => pct(r.acos) },
    { key: "roas", label: "ROAS", type: "number", render: (r) => `${r.roas.toFixed(2)}x` },
  ];

  const itemTypeColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "impressions", label: "Impr.", type: "number", render: (r) => compactNumber(r.impressions) },
    { key: "clicks", label: "Clicks", type: "number", render: (r) => compactNumber(r.clicks) },
    { key: "spend", label: "Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "sales", label: "Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "orders", label: "Orders", type: "number", render: (r) => numberFmt(r.orders) },
    { key: "ctr", label: "CTR", type: "number", render: (r) => pct(r.ctr) },
    { key: "cvr", label: "CVR", type: "number", render: (r) => pct(r.cvr) },
    { key: "acos", label: "ACOS", type: "number", render: (r) => pct(r.acos) },
    { key: "roas", label: "ROAS", type: "number", render: (r) => `${r.roas.toFixed(2)}x` },
  ];

  const catalogColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    {
      key: "asin",
      label: "Product",
      type: "text",
      sortAccessor: (r) => `${r.asin} ${r.shortTitle}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <AsinImage src={r.imageUrl} title={r.shortTitle} />
          <div>
            <div className="font-medium text-cyan-300">{r.asin}</div>
            <div className="text-xs text-slate-400">{r.shortTitle}</div>
          </div>
        </div>
      ),
    },
    { key: "parentAsin", label: "Parent", type: "text" },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "brand", label: "Brand", type: "text" },
    { key: "spend", label: "Ad Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "sales", label: "Ad Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "acos", label: "ACOS", type: "number", render: (r) => pct(r.acos) },
    { key: "roas", label: "ROAS", type: "number", render: (r) => `${r.roas.toFixed(2)}x` },
  ];

  const inventoryColumns = [
    {
      key: "asin",
      label: "Product",
      type: "text",
      sortAccessor: (r) => `${r.asin} ${r.shortTitle}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <AsinImage src={r.imageUrl} title={r.shortTitle} />
          <div>
            <div className="font-medium text-cyan-300">{r.asin}</div>
            <div className="text-xs text-slate-400">{r.shortTitle}</div>
          </div>
        </div>
      ),
    },
    { key: "brand", label: "Brand", type: "text" },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "fbaUnits", label: "FBA", type: "number", render: (r) => numberFmt(r.fbaUnits) },
    { key: "awdUnits", label: "AWD", type: "number", render: (r) => numberFmt(r.awdUnits) },
    { key: "totalUnits", label: "Total", type: "number", render: (r) => numberFmt(r.totalUnits) },
    { key: "units30d", label: "Units 30D", type: "number", render: (r) => numberFmt(r.units30d) },
    { key: "unitsPerDay", label: "Units/Day", type: "number", render: (r) => (r.unitsPerDay ? r.unitsPerDay.toFixed(2) : "—") },
    { key: "daysOfCover", label: "Cover", type: "number", render: (r) => daysLabel(r.daysOfCover) },
    { key: "urgency", label: "Status", type: "text", render: (r) => urgencyPill(r.daysOfCover) },
  ];

  const recommendedColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    { key: "searchTerm", label: "Search Term", type: "text" },
    { key: "campaign", label: "Campaign", type: "text" },
    { key: "adGroup", label: "Ad Group", type: "text" },
    { key: "keywordText", label: "Keyword", type: "text" },
    { key: "clicks", label: "Clicks", type: "number", render: (r) => numberFmt(r.clicks) },
    { key: "spend", label: "Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "orders", label: "Orders", type: "number", render: (r) => numberFmt(r.orders) },
    { key: "units", label: "Units", type: "number", render: (r) => numberFmt(r.units) },
    { key: "sales", label: "Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "suggestedNegativeType", label: "Suggested Type", type: "text" },
    { key: "alreadyBlocked", label: "Action", type: "text", render: (r) => recommendationPill(r), sortAccessor: (r) => (r.alreadyBlocked ? "z" : "a") },
  ];

  const existingNegativeColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    { key: "entity", label: "Entity", type: "text" },
    { key: "term", label: "Negative Term", type: "text" },
    { key: "matchType", label: "Match Type", type: "text" },
    { key: "campaign", label: "Campaign", type: "text" },
    { key: "adGroup", label: "Ad Group", type: "text" },
    { key: "state", label: "State", type: "text" },
  ];

  const allSearchTermColumns = [
    { key: "adType", label: "Ad Type", type: "text" },
    { key: "searchTerm", label: "Search Term", type: "text" },
    { key: "campaign", label: "Campaign", type: "text" },
    { key: "adGroup", label: "Ad Group", type: "text" },
    { key: "clicks", label: "Clicks", type: "number", render: (r) => numberFmt(r.clicks) },
    { key: "spend", label: "Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "orders", label: "Orders", type: "number", render: (r) => numberFmt(r.orders) },
    { key: "units", label: "Units", type: "number", render: (r) => numberFmt(r.units) },
    { key: "sales", label: "Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "ctr", label: "CTR", type: "number", render: (r) => pct(r.ctr) },
    { key: "cvr", label: "CVR", type: "number", render: (r) => pct(r.cvr) },
  ];

  const campaignSort = useSortableRows(unifiedCampaignRows, { key: "spend", type: "number", direction: "desc" });
  const productSort = useSortableRows(productGrouped, { key: "spend", type: "number", direction: "desc" });
  const parentSort = useSortableRows(parentGrouped, { key: "spend", type: "number", direction: "desc" });
  const itemTypeSort = useSortableRows(itemTypeGrouped, { key: "spend", type: "number", direction: "desc" });
  const catalogSort = useSortableRows(productGrouped.slice(0, 500), { key: "sales", type: "number", direction: "desc" });
  const inventorySort = useSortableRows(inventoryFiltered, { key: "daysOfCover", type: "number", direction: "asc" });
  const urgentSort = useSortableRows(urgentInventory, { key: "daysOfCover", type: "number", direction: "asc" });
  const replenishSort = useSortableRows(replenishInventory, { key: "daysOfCover", type: "number", direction: "asc" });
  const recommendedSort = useSortableRows(recommendedNegatives, { key: "spend", type: "number", direction: "desc" });
  const existingNegativeSort = useSortableRows(existingNegatives, { key: "term", type: "text", direction: "asc" });
  const allSearchTermSort = useSortableRows(unifiedSearchTerms, { key: "spend", type: "number", direction: "desc" });

  const tabs = [
    { id: "overview", label: "Overview", icon: DollarSign },
    { id: "advertising", label: "Advertising", icon: Megaphone },
    { id: "searchTerms", label: "Search Terms", icon: ShieldMinus },
    { id: "inventory", label: "Inventory", icon: Warehouse },
    { id: "catalog", label: "Catalog", icon: Package },
  ];

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading Google Sheets data...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-slate-900 bg-slate-950/80 p-5 backdrop-blur xl:sticky xl:top-0 xl:h-screen">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-white p-1.5">
                <img src={LOGO_URL} alt="Client Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Five Star Napkins</p>
                <p className="text-sm text-slate-400">Seller Central Dashboard</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {tabs.map((tab) => (
              <SidebarButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
            ))}
          </div>
        </aside>

        <main className="p-4 md:p-6 xl:p-8">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Five Star Napkins Dashboard</h1>
              <p className="mt-2 text-sm text-slate-400">Seller Central only. Live from Google Sheets.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search campaign, ASIN, parent, item type..." className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:w-80" />
              </div>

              <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>

          {error ? <div className="mb-6 rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Ad Spend" value={adSummary.spend} icon={Megaphone} />
                <StatCard label="Ad Sales" value={adSummary.sales} icon={DollarSign} />
                <StatCard label="ACOS" value={adSummary.acos} suffix="%" icon={BarChart3} />
                <StatCard label="ROAS" value={adSummary.roas} suffix="x" icon={RefreshCw} />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionCard title="Top Product Ad Sales" subtitle="Top 10 products by ad sales">
                  <div className="h-80 w-full">
                    <ResponsiveContainer>
                      <BarChart data={adTrend}>
                        <CartesianGrid stroke="#172033" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${compactNumber(v)}`} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 16 }} formatter={(v) => currency(v)} />
                        <Bar dataKey="sales" radius={[8, 8, 0, 0]} fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Inventory Snapshot" subtitle="High-level stock health based on 30 day unit velocity">
                  <div className="grid grid-cols-2 gap-4">
                    <CountCard label="At Risk < 2 Months" value={inventorySummary.atRisk} icon={Boxes} tone="amber" />
                    <CountCard label="Urgent < 2 Weeks" value={inventorySummary.urgent} icon={AlertTriangle} tone="rose" />
                    <CountCard label="FBA Units" value={inventorySummary.totalFba} icon={Warehouse} tone="cyan" />
                    <CountCard label="AWD Units" value={inventorySummary.totalAwd} icon={Truck} tone="emerald" />
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {activeTab === "advertising" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Spend" value={adSummary.spend} icon={Megaphone} />
                <StatCard label="Sales" value={adSummary.sales} icon={DollarSign} />
                <StatCard label="ACOS" value={adSummary.acos} suffix="%" icon={BarChart3} />
                <StatCard label="ROAS" value={adSummary.roas} suffix="x" icon={RefreshCw} />
              </div>

              <SectionCard title="Advertising Performance" subtitle="Now supports Sponsored Products, Sponsored Brands, and Sponsored Display" right={<TogglePills value={adView} onChange={setAdView} options={["Campaign", "Product", "Parent", "Item Type"]} />}>
                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <FilterSelect label="Ad Type" value={adType} onChange={setAdType} options={adTypeOptions} />
                  <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} />
                  <FilterSelect label="Item Type" value={itemTypeFilter} onChange={setItemTypeFilter} options={itemTypeOptions} />
                  <FilterSelect label="Parent ASIN" value={parentFilter} onChange={setParentFilter} options={parentOptions} />
                  <div className="flex items-end">
                    <button onClick={() => { setAdType("All"); setBrandFilter("All"); setItemTypeFilter("All"); setParentFilter("All"); }} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800">Clear filters</button>
                  </div>
                </div>

                {adView === "Campaign" && <SortableTable rowKey="campaignName" columns={campaignColumns} rows={campaignSort.sortedRows} sortConfig={campaignSort.sortConfig} onSort={campaignSort.handleSort} />}
                {adView === "Product" && <SortableTable rowKey={(row) => `${row.adType}-${row.asin}`} columns={productColumns} rows={productSort.sortedRows} sortConfig={productSort.sortConfig} onSort={productSort.handleSort} />}
                {adView === "Parent" && <SortableTable rowKey={(row) => `${row.adType}-${row.parentAsin}`} columns={parentColumns} rows={parentSort.sortedRows} sortConfig={parentSort.sortConfig} onSort={parentSort.handleSort} />}
                {adView === "Item Type" && <SortableTable rowKey={(row) => `${row.adType}-${row.itemType}`} columns={itemTypeColumns} rows={itemTypeSort.sortedRows} sortConfig={itemTypeSort.sortConfig} onSort={itemTypeSort.handleSort} />}
              </SectionCard>
            </div>
          )}

          {activeTab === "searchTerms" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CountCard label="Recommended Negatives" value={wastedSpendSummary.openCount} icon={ShieldMinus} tone="amber" />
                <CountCard label="Existing Negatives" value={existingNegatives.length} icon={Ban} tone="cyan" />
                <StatCard label="Wasted Spend 60D" value={wastedSpendSummary.totalWaste} icon={BadgeDollarSign} tone="rose" />
                <StatCard label="Spend Already Protected" value={wastedSpendSummary.protectedSpend} icon={ShieldMinus} tone="emerald" />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
                <SectionCard title="Search Term Intelligence" subtitle="Shows existing negatives plus search terms with 10+ clicks and no conversions" right={<TogglePills value={searchView} onChange={setSearchView} options={["Recommended", "Existing Negatives", "All Terms"]} />}>
                  <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <FilterSelect label="Ad Type" value={adType} onChange={setAdType} options={adTypeOptions} />
                    <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} />
                    <FilterSelect label="Item Type" value={itemTypeFilter} onChange={setItemTypeFilter} options={itemTypeOptions} />
                    <FilterSelect label="Parent ASIN" value={parentFilter} onChange={setParentFilter} options={parentOptions} />
                  </div>

                  {searchView === "Recommended" && <SortableTable rowKey={(row, i) => `${row.adType}-${row.searchTerm}-${i}`} columns={recommendedColumns} rows={recommendedSort.sortedRows} sortConfig={recommendedSort.sortConfig} onSort={recommendedSort.handleSort} />}
                  {searchView === "Existing Negatives" && <SortableTable rowKey={(row, i) => `${row.adType}-${row.term}-${i}`} columns={existingNegativeColumns} rows={existingNegativeSort.sortedRows} sortConfig={existingNegativeSort.sortConfig} onSort={existingNegativeSort.handleSort} />}
                  {searchView === "All Terms" && <SortableTable rowKey={(row, i) => `${row.adType}-${row.searchTerm}-${i}`} columns={allSearchTermColumns} rows={allSearchTermSort.sortedRows} sortConfig={allSearchTermSort.sortConfig} onSort={allSearchTermSort.handleSort} />}
                </SectionCard>

                <SectionCard title="Top Waste Terms" subtitle="Highest-spend search terms still recommended for negative matching">
                  <div className="h-96 w-full">
                    <ResponsiveContainer>
                      <BarChart data={wasteChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid stroke="#172033" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={120} stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 16 }} formatter={(v) => currency(v)} />
                        <Bar dataKey="spend" radius={[0, 8, 8, 0]} fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <CountCard label="Blended Cover" value={inventorySummary.blendedDays} suffix="count" icon={Clock3} tone="cyan" />
                <CountCard label="At Risk < 60d" value={inventorySummary.atRisk} icon={Boxes} tone="amber" />
                <CountCard label="Urgent < 14d" value={inventorySummary.urgent} icon={AlertTriangle} tone="rose" />
                <CountCard label="FBA Units" value={inventorySummary.totalFba} icon={Warehouse} tone="cyan" />
                <CountCard label="AWD Units" value={inventorySummary.totalAwd} icon={Truck} tone="emerald" />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionCard title="Urgent Block" subtitle="ASINs below 2 weeks of cover need immediate attention">
                  {urgentInventory.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-900 bg-emerald-500/10 p-5 text-sm text-emerald-300">No ASINs are below 2 weeks of cover.</div>
                  ) : (
                    <SortableTable rowKey="asin" columns={inventoryColumns} rows={urgentSort.sortedRows.slice(0, 25)} sortConfig={urgentSort.sortConfig} onSort={urgentSort.handleSort} />
                  )}
                </SectionCard>

                <SectionCard title="Replenishment Watch" subtitle="ASINs below 2 months of cover but above urgent threshold">
                  {replenishInventory.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-900 bg-emerald-500/10 p-5 text-sm text-emerald-300">Nothing currently falls into the watch window.</div>
                  ) : (
                    <SortableTable rowKey="asin" columns={inventoryColumns} rows={replenishSort.sortedRows.slice(0, 25)} sortConfig={replenishSort.sortConfig} onSort={replenishSort.handleSort} />
                  )}
                </SectionCard>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_1fr]">
                <SectionCard title="Inventory Risk by ASIN" subtitle="All tracked ASINs, sortable by cover, stock, and sales">
                  <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <FilterSelect label="Inventory View" value={inventoryFilter} onChange={setInventoryFilter} options={["All", "urgent", "replenish", "healthy", "no_sales"]} />
                    <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} />
                    <FilterSelect label="Item Type" value={itemTypeFilter} onChange={setItemTypeFilter} options={itemTypeOptions} />
                    <FilterSelect label="Parent ASIN" value={parentFilter} onChange={setParentFilter} options={parentOptions} />
                  </div>
                  <SortableTable rowKey="asin" columns={inventoryColumns} rows={inventorySort.sortedRows} sortConfig={inventorySort.sortConfig} onSort={inventorySort.handleSort} />
                </SectionCard>

                <SectionCard title="Lowest Cover ASINs" subtitle="Quick visual for the 12 tightest stock positions">
                  <div className="h-96 w-full">
                    <ResponsiveContainer>
                      <BarChart data={riskChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid stroke="#172033" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={120} stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 16 }} formatter={(v) => daysLabel(v)} />
                        <Bar dataKey="days" radius={[0, 8, 8, 0]} fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {activeTab === "catalog" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CountCard label="Reference Rows" value={referenceSheet.length} icon={Package} tone="cyan" />
                <CountCard label="Products in Ad Report" value={productGrouped.length} icon={Boxes} tone="cyan" />
                <CountCard label="Mapped Parents" value={parentGrouped.length} icon={Package} tone="emerald" />
                <CountCard label="Item Types" value={itemTypeGrouped.length} icon={Package} tone="amber" />
              </div>

              <SectionCard title="Catalog Preview" subtitle="Sortable and filter-aware">
                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FilterSelect label="Ad Type" value={adType} onChange={setAdType} options={adTypeOptions} />
                  <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} />
                  <FilterSelect label="Item Type" value={itemTypeFilter} onChange={setItemTypeFilter} options={itemTypeOptions} />
                  <FilterSelect label="Parent ASIN" value={parentFilter} onChange={setParentFilter} options={parentOptions} />
                </div>
                <SortableTable rowKey={(row) => `${row.adType}-${row.asin}`} columns={catalogColumns} rows={catalogSort.sortedRows} sortConfig={catalogSort.sortConfig} onSort={catalogSort.handleSort} />
              </SectionCard>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
