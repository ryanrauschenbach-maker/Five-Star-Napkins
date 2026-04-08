import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  Warehouse,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
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
  itemRef: "item_data_reference",
  inventoryFba: "inventory_fba",
  inventoryAwd: "inventory_awd",
  // Add these tabs to your Google Sheet when ready:
  // sbCampaigns: "Sponsored Brands Campaigns",
  // sbProducts: "Sponsored Brands Product Report",
  // sdCampaigns: "Sponsored Display Campaigns",
  // sdProducts: "Sponsored Display Product Report",
};

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

function extractAsin(productField) {
  const text = normalizeText(productField).toUpperCase();
  const match = text.match(/^([A-Z0-9]{10})/);
  return match ? match[1] : "";
}

function inferImageUrl(row) {
  const explicit = normalizeText(pick(row, ["image url", "Image URL", "image_url", "Image Url"], ""));
  if (explicit) return explicit;
  const asin = normalizeText(pick(row, ["asin", "ASIN"], ""));
  return asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg` : "";
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
    if (type === "number") return (normalizeNumber(av) - normalizeNumber(bv)) * dir;
    return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" }) * dir;
  });
}

function SortableHeader({ column, sortConfig, onSort }) {
  const active = sortConfig?.key === column.key;
  const icon = !active ? <ChevronsUpDown className="h-3.5 w-3.5" /> : sortConfig.direction === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  if (column.sortable === false) return <span>{column.label}</span>;
  return (
    <button onClick={() => onSort(column)} className={cn("inline-flex items-center gap-1 transition", active ? "text-cyan-300" : "text-slate-300 hover:text-white")}>
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
            <tr key={rowKey ? row[rowKey] || idx : idx} className="border-b border-slate-900 text-slate-200">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-4 align-middle">{col.render ? col.render(row) : row[col.key]}</td>
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
        return { key: column.key, type, accessor, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key: column.key, type, accessor, direction: type === "text" ? "asc" : "desc" };
    });
  }
  return { sortedRows, sortConfig, handleSort };
}

function SidebarButton({ active, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition", active ? "bg-slate-800 text-white shadow-lg shadow-cyan-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200")}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, suffix, icon: Icon }) {
  const formatted = suffix === "%" ? pct(value) : suffix === "x" ? `${Number(value || 0).toFixed(2)}x` : currency(value);
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatted}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-cyan-300"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function CountCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{numberFmt(value)}</p>
    </div>
  );
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
            value === option ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
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
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adView, setAdView] = useState("Campaign");
  const [adType, setAdType] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [parentFilter, setParentFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [spCampaignSheet, setSpCampaignSheet] = useState([]);
  const [spProductSheet, setSpProductSheet] = useState([]);
  const [referenceSheet, setReferenceSheet] = useState([]);
  const [inventoryFbaSheet, setInventoryFbaSheet] = useState([]);
  const [inventoryAwdSheet, setInventoryAwdSheet] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [spCampaigns, spProducts, reference, fba, awd] = await Promise.all([
          fetchSheet(TAB_NAMES.spCampaigns),
          fetchSheet(TAB_NAMES.spProducts),
          fetchSheet(TAB_NAMES.itemRef),
          fetchSheet(TAB_NAMES.inventoryFba),
          fetchSheet(TAB_NAMES.inventoryAwd),
        ]);
        setSpCampaignSheet(spCampaigns);
        setSpProductSheet(spProducts);
        setReferenceSheet(reference);
        setInventoryFbaSheet(fba);
        setInventoryAwdSheet(awd);
        setError("");
      } catch {
        setError("Could not load Google Sheets data. Make sure the sheet is shared to 'Anyone with the link can view' and the tab names match exactly.");
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

    // Future-ready placeholders: when SB/SD tabs are added, append them here.
    return sp
      .filter((row) => adType === "All" || row.adType === adType)
      .filter((row) => !query || `${row.campaignName} ${row.state} ${row.campaignType} ${row.adType}`.toLowerCase().includes(query.toLowerCase()));
  }, [spCampaignSheet, adType, query]);

  const unifiedProductRows = useMemo(() => {
    const sp = spProductSheet
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

    return sp
      .filter((row) => adType === "All" || row.adType === adType)
      .filter((row) => brandFilter === "All" || row.brand === brandFilter)
      .filter((row) => itemTypeFilter === "All" || row.itemType === itemTypeFilter)
      .filter((row) => parentFilter === "All" || row.parentAsin === parentFilter)
      .filter((row) => !query || `${row.asin} ${row.parentAsin} ${row.shortTitle} ${row.brand} ${row.itemType} ${row.adType}`.toLowerCase().includes(query.toLowerCase()));
  }, [spProductSheet, referenceByAsin, adType, brandFilter, itemTypeFilter, parentFilter, query]);

  const brandOptions = useMemo(() => ["All", ...Array.from(new Set(unifiedProductRows.map((r) => r.brand).filter(Boolean))).sort()], [unifiedProductRows]);
  const itemTypeOptions = useMemo(() => ["All", ...Array.from(new Set(unifiedProductRows.map((r) => r.itemType).filter(Boolean))).sort()], [unifiedProductRows]);
  const parentOptions = useMemo(() => ["All", ...Array.from(new Set(unifiedProductRows.map((r) => r.parentAsin).filter(Boolean))).sort()], [unifiedProductRows]);

  const productGrouped = useMemo(() => {
    const map = new Map();
    unifiedProductRows.forEach((row) => {
      const current = map.get(row.asin) || { ...row, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;
      map.set(row.asin, current);
    });
    return [...map.values()].map((row) => ({ ...row, ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0, cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0, acos: row.sales ? (row.spend / row.sales) * 100 : 0, roas: row.spend ? row.sales / row.spend : 0 }));
  }, [unifiedProductRows]);

  const parentGrouped = useMemo(() => {
    const map = new Map();
    unifiedProductRows.forEach((row) => {
      const key = row.parentAsin || "Unmapped";
      const current = map.get(key) || { parentAsin: key, imageUrl: row.imageUrl, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({ ...row, ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0, cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0, acos: row.sales ? (row.spend / row.sales) * 100 : 0, roas: row.spend ? row.sales / row.spend : 0 }));
  }, [unifiedProductRows]);

  const itemTypeGrouped = useMemo(() => {
    const map = new Map();
    unifiedProductRows.forEach((row) => {
      const key = row.itemType || "Unmapped";
      const current = map.get(key) || { itemType: key, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({ ...row, ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0, cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0, acos: row.sales ? (row.spend / row.sales) * 100 : 0, roas: row.spend ? row.sales / row.spend : 0 }));
  }, [unifiedProductRows]);

  const adSummary = useMemo(() => {
    const spend = unifiedProductRows.reduce((sum, row) => sum + row.spend, 0);
    const sales = unifiedProductRows.reduce((sum, row) => sum + row.sales, 0);
    return { spend, sales, acos: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0 };
  }, [unifiedProductRows]);

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
    { key: "asin", label: "Product", type: "text", sortAccessor: (r) => `${r.asin} ${r.shortTitle}`, render: (r) => <div className="flex items-center gap-3"><AsinImage src={r.imageUrl} title={r.shortTitle} /><div><div className="font-medium text-cyan-300">{r.asin}</div><div className="text-xs text-slate-400">{r.shortTitle}</div></div></div> },
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
    { key: "parentAsin", label: "Parent ASIN", type: "text", render: (r) => <div className="flex items-center gap-3"><AsinImage src={r.imageUrl} title={r.parentAsin} /><div className="font-medium text-cyan-300">{r.parentAsin}</div></div> },
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
    { key: "asin", label: "Product", type: "text", sortAccessor: (r) => `${r.asin} ${r.shortTitle}`, render: (r) => <div className="flex items-center gap-3"><AsinImage src={r.imageUrl} title={r.shortTitle} /><div><div className="font-medium text-cyan-300">{r.asin}</div><div className="text-xs text-slate-400">{r.shortTitle}</div></div></div> },
    { key: "parentAsin", label: "Parent", type: "text" },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "brand", label: "Brand", type: "text" },
    { key: "spend", label: "Ad Spend", type: "number", render: (r) => currency(r.spend) },
    { key: "sales", label: "Ad Sales", type: "number", render: (r) => currency(r.sales) },
    { key: "acos", label: "ACOS", type: "number", render: (r) => pct(r.acos) },
    { key: "roas", label: "ROAS", type: "number", render: (r) => `${r.roas.toFixed(2)}x` },
  ];

  const campaignSort = useSortableRows(unifiedCampaignRows, { key: "spend", type: "number", direction: "desc" });
  const productSort = useSortableRows(productGrouped, { key: "spend", type: "number", direction: "desc" });
  const parentSort = useSortableRows(parentGrouped, { key: "spend", type: "number", direction: "desc" });
  const itemTypeSort = useSortableRows(itemTypeGrouped, { key: "spend", type: "number", direction: "desc" });
  const catalogSort = useSortableRows(productGrouped.slice(0, 500), { key: "sales", type: "number", direction: "desc" });

  const tabs = [
    { id: "overview", label: "Overview", icon: DollarSign },
    { id: "advertising", label: "Advertising", icon: Megaphone },
    { id: "inventory", label: "Inventory", icon: Warehouse },
    { id: "catalog", label: "Catalog", icon: Package },
  ];

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading Google Sheets data...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-slate-900 bg-slate-950/80 p-5 backdrop-blur xl:sticky xl:top-0 xl:h-screen">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-white p-1.5"><img src={LOGO_URL} alt="Client Logo" className="h-full w-full object-contain" /></div>
              <div>
                <p className="text-lg font-semibold text-white">Five Star Napkins</p>
                <p className="text-sm text-slate-400">Seller Central Dashboard</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {tabs.map((tab) => <SidebarButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />)}
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
              <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"><RefreshCw className="h-4 w-4" /> Refresh</button>
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

              <SectionCard
                title="Advertising Performance"
                subtitle="Ad type selector supports SP now and is ready for SB/SD once those tabs are added"
                right={<TogglePills value={adView} onChange={setAdView} options={["Campaign", "Product", "Parent", "Item Type"]} />}
              >
                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <FilterSelect label="Ad Type" value={adType} onChange={setAdType} options={adTypeOptions} />
                  <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} />
                  <FilterSelect label="Item Type" value={itemTypeFilter} onChange={setItemTypeFilter} options={itemTypeOptions} />
                  <FilterSelect label="Parent ASIN" value={parentFilter} onChange={setParentFilter} options={parentOptions} />
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setAdType("All");
                        setBrandFilter("All");
                        setItemTypeFilter("All");
                        setParentFilter("All");
                      }}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                {adView === "Campaign" && <SortableTable rowKey="campaignName" columns={campaignColumns} rows={campaignSort.sortedRows} sortConfig={campaignSort.sortConfig} onSort={campaignSort.handleSort} />}
                {adView === "Product" && <SortableTable rowKey="asin" columns={productColumns} rows={productSort.sortedRows} sortConfig={productSort.sortConfig} onSort={productSort.handleSort} />}
                {adView === "Parent" && <SortableTable rowKey="parentAsin" columns={parentColumns} rows={parentSort.sortedRows} sortConfig={parentSort.sortConfig} onSort={parentSort.handleSort} />}
                {adView === "Item Type" && <SortableTable rowKey="itemType" columns={itemTypeColumns} rows={itemTypeSort.sortedRows} sortConfig={itemTypeSort.sortConfig} onSort={itemTypeSort.handleSort} />}
              </SectionCard>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CountCard label="FBA Rows" value={inventoryFbaSheet.length} />
                <CountCard label="AWD Rows" value={inventoryAwdSheet.length} />
              </div>
            </div>
          )}

          {activeTab === "catalog" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CountCard label="Reference Rows" value={referenceSheet.length} />
                <CountCard label="Products in Ad Report" value={productGrouped.length} />
                <CountCard label="Mapped Parents" value={parentGrouped.length} />
                <CountCard label="Item Types" value={itemTypeGrouped.length} />
              </div>

              <SectionCard title="Catalog Preview" subtitle="Sortable and filter-aware">
                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FilterSelect label="Ad Type" value={adType} onChange={setAdType} options={adTypeOptions} />
                  <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} />
                  <FilterSelect label="Item Type" value={itemTypeFilter} onChange={setItemTypeFilter} options={itemTypeOptions} />
                  <FilterSelect label="Parent ASIN" value={parentFilter} onChange={setParentFilter} options={parentOptions} />
                </div>
                <SortableTable rowKey="asin" columns={catalogColumns} rows={catalogSort.sortedRows} sortConfig={catalogSort.sortConfig} onSort={catalogSort.handleSort} />
              </SectionCard>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
