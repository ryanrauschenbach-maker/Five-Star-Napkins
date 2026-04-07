import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  DollarSign,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const SHEET_ID = "1KA0mswUxULOvwUdyfnd67k1dKbCUh1-9USOL2cDJC9A";
const LOGO_URL = "/logo.png"; // Put your client logo in /public/logo.png

const TAB_NAMES = {
  campaigns: "Sponsored Products Campaigns",
  productAds: "Products_Ad_Report",
  itemRef: "item_data_reference",
  inventoryFba: "inventory_fba",
  inventoryAwd: "inventory_awd",
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

function StatCard({ label, value, suffix, icon: Icon }) {
  const formatted =
    suffix === "%"
      ? pct(value)
      : suffix === "x"
      ? `${Number(value || 0).toFixed(2)}x`
      : currency(value);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatted}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
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

function Table({ columns, rows, rowKey }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={rowKey ? row[rowKey] || idx : idx}
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

function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adView, setAdView] = useState("Campaign");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [campaignSheet, setCampaignSheet] = useState([]);
  const [productSheet, setProductSheet] = useState([]);
  const [referenceSheet, setReferenceSheet] = useState([]);
  const [inventoryFbaSheet, setInventoryFbaSheet] = useState([]);
  const [inventoryAwdSheet, setInventoryAwdSheet] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [campaigns, products, reference, fba, awd] = await Promise.all([
          fetchSheet(TAB_NAMES.campaigns),
          fetchSheet(TAB_NAMES.productAds),
          fetchSheet(TAB_NAMES.itemRef),
          fetchSheet(TAB_NAMES.inventoryFba),
          fetchSheet(TAB_NAMES.inventoryAwd),
        ]);

        setCampaignSheet(campaigns);
        setProductSheet(products);
        setReferenceSheet(reference);
        setInventoryFbaSheet(fba);
        setInventoryAwdSheet(awd);
        setError("");
      } catch (err) {
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
        sku: normalizeText(pick(row, ["sku", "SKU"])),
        parentAsin: normalizeText(
          pick(row, ["parent asin", "Parent ASIN", "parent_asin"], "")
        ),
        title: normalizeText(pick(row, ["Title", "title"], "")),
        shortTitle: normalizeText(
          pick(row, ["short title", "Short Title", "short_title"], "")
        ),
        imageUrl: inferImageUrl(row),
        brand: normalizeText(pick(row, ["brand", "Brand"], "")),
        type: normalizeText(pick(row, ["type", "Type", "item type", "Item Type"], "")),
      });
    });

    return map;
  }, [referenceSheet]);

  const cleanCampaignRows = useMemo(() => {
    return campaignSheet
      .filter((row) => {
        const entity = normalizeText(pick(row, ["Entity", "entity"])).toLowerCase();
        return entity === "campaign";
      })
      .map((row) => {
        const spend = normalizeNumber(
          pick(row, ["Spend", "Spend(USD)", "Spend USD", "Cost"])
        );
        const sales = normalizeNumber(
          pick(row, ["Sales", "Sales(USD)", "Attributed Sales", "Sales 7 Day Total Sales"])
        );
        const clicks = normalizeNumber(pick(row, ["Clicks", "clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions", "impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders", "orders"]));

        return {
          campaignName: normalizeText(
            pick(row, ["Campaign Name", "campaign_name", "Campaign"])
          ),
          state: normalizeText(pick(row, ["State", "state", "Status"], "—")),
          campaignType: normalizeText(
            pick(row, ["Campaign Type", "campaign type", "Ad Type"], "SP")
          ),
          impressions,
          clicks,
          spend,
          sales,
          orders,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
        };
      })
      .filter((row) =>
        !query ||
        `${row.campaignName} ${row.state} ${row.campaignType}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
      .sort((a, b) => b.spend - a.spend);
  }, [campaignSheet, query]);

  const cleanProductRows = useMemo(() => {
    return productSheet
      .map((row) => {
        const productField = normalizeText(
          pick(row, ["Products", "Product", "products"], "")
        );
        const asin = extractAsin(productField);
        const ref = referenceByAsin.get(asin) || {};

        const spend = normalizeNumber(pick(row, ["Spend(USD)", "Spend", "Cost"]));
        const sales = normalizeNumber(
          pick(row, ["Sales(USD)", "Sales", "Attributed Sales"])
        );
        const clicks = normalizeNumber(pick(row, ["Clicks", "clicks"]));
        const impressions = normalizeNumber(pick(row, ["Impressions", "impressions"]));
        const orders = normalizeNumber(pick(row, ["Orders", "orders"]));
        const ctr =
          normalizeNumber(pick(row, ["CTR", "Ctr"])) || (impressions ? (clicks / impressions) * 100 : 0);
        const cvr =
          normalizeNumber(
            pick(row, ["Conversion rate", "Conversion Rate", "CVR", "cvr"])
          ) || (clicks ? (orders / clicks) * 100 : 0);

        return {
          asin,
          parentAsin: ref.parentAsin || "",
          itemType: ref.type || "",
          shortTitle: ref.shortTitle || ref.title || asin || productField,
          imageUrl: ref.imageUrl || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg` : ""),
          brand: ref.brand || "",
          rawProduct: productField,
          spend,
          sales,
          clicks,
          impressions,
          orders,
          ctr,
          cvr,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      })
      .filter((row) => row.asin)
      .filter((row) =>
        !query ||
        `${row.asin} ${row.parentAsin} ${row.shortTitle} ${row.itemType} ${row.brand}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
  }, [productSheet, referenceByAsin, query]);

  const productGrouped = useMemo(() => {
    const map = new Map();

    cleanProductRows.forEach((row) => {
      const key = row.asin;
      const current = map.get(key) || {
        asin: row.asin,
        parentAsin: row.parentAsin,
        itemType: row.itemType,
        shortTitle: row.shortTitle,
        imageUrl: row.imageUrl,
        brand: row.brand,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
      };

      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;

      map.set(key, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        acos: row.sales ? (row.spend / row.sales) * 100 : 0,
        roas: row.spend ? row.sales / row.spend : 0,
        ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0,
        cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [cleanProductRows]);

  const parentGrouped = useMemo(() => {
    const map = new Map();

    cleanProductRows.forEach((row) => {
      const key = row.parentAsin || "Unmapped";
      const current = map.get(key) || {
        parentAsin: key,
        shortTitle: key === "Unmapped" ? "Unmapped Parent" : key,
        itemType: "",
        imageUrl: row.imageUrl,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
      };

      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;

      map.set(key, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        acos: row.sales ? (row.spend / row.sales) * 100 : 0,
        roas: row.spend ? row.sales / row.spend : 0,
        ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0,
        cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [cleanProductRows]);

  const itemTypeGrouped = useMemo(() => {
    const map = new Map();

    cleanProductRows.forEach((row) => {
      const key = row.itemType || "Unmapped";
      const current = map.get(key) || {
        itemType: key,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
      };

      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spend;
      current.sales += row.sales;
      current.orders += row.orders;

      map.set(key, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        acos: row.sales ? (row.spend / row.sales) * 100 : 0,
        roas: row.spend ? row.sales / row.spend : 0,
        ctr: row.impressions ? (row.clicks / row.impressions) * 100 : 0,
        cvr: row.clicks ? (row.orders / row.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [cleanProductRows]);

  const adSummary = useMemo(() => {
    const spend = cleanProductRows.reduce((sum, row) => sum + row.spend, 0);
    const sales = cleanProductRows.reduce((sum, row) => sum + row.sales, 0);
    const clicks = cleanProductRows.reduce((sum, row) => sum + row.clicks, 0);
    const impressions = cleanProductRows.reduce((sum, row) => sum + row.impressions, 0);

    return {
      spend,
      sales,
      acos: sales ? (spend / sales) * 100 : 0,
      roas: spend ? sales / spend : 0,
      clicks,
      impressions,
    };
  }, [cleanProductRows]);

  const adTrend = useMemo(() => {
    const top = productGrouped.slice(0, 10);
    return top.map((row) => ({
      name:
        row.shortTitle.length > 22 ? `${row.shortTitle.slice(0, 22)}…` : row.shortTitle,
      spend: row.spend,
      sales: row.sales,
    }));
  }, [productGrouped]);

  const inventorySummary = useMemo(() => {
    const sumRows = (rows, fields) =>
      rows.reduce((sum, row) => {
        fields.forEach((field) => {
          sum[field] += normalizeNumber(row[field]);
        });
        return sum;
      }, Object.fromEntries(fields.map((f) => [f, 0])));

    const fba = sumRows(inventoryFbaSheet, Object.keys(inventoryFbaSheet[0] || {}));
    const awd = sumRows(inventoryAwdSheet, Object.keys(inventoryAwdSheet[0] || {}));

    const fbaUnits = Object.values(fba).reduce((a, b) => a + normalizeNumber(b), 0);
    const awdUnits = Object.values(awd).reduce((a, b) => a + normalizeNumber(b), 0);

    return {
      fbaUnits,
      awdUnits,
      fbaRows: inventoryFbaSheet.length,
      awdRows: inventoryAwdSheet.length,
    };
  }, [inventoryFbaSheet, inventoryAwdSheet]);

  const overviewCards = [
    { label: "Ad Spend (60D)", value: adSummary.spend, icon: Megaphone },
    { label: "Ad Sales (60D)", value: adSummary.sales, icon: DollarSign },
    { label: "ACOS", value: adSummary.acos, suffix: "%", icon: BarChart3 },
    { label: "ROAS", value: adSummary.roas, suffix: "x", icon: RefreshCw },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: DollarSign },
    { id: "advertising", label: "Advertising", icon: Megaphone },
    { id: "inventory", label: "Inventory", icon: Warehouse },
    { id: "catalog", label: "Catalog", icon: Package },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading Google Sheets data...
      </div>
    );
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
              <SidebarButton
                key={tab.id}
                active={activeTab === tab.id}
                icon={tab.icon}
                label={tab.label}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source</p>
            <p className="mt-3 text-sm leading-6 text-slate-300 break-all">{SHEET_ID}</p>
          </div>
        </aside>

        <main className="p-4 md:p-6 xl:p-8">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Five Star Napkins Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Seller Central only. Live from Google Sheets.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search campaign, ASIN, parent, item type..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:w-80"
                />
              </div>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((item) => (
                  <StatCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    suffix={item.suffix}
                    icon={item.icon}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionCard title="Top Product Ad Sales" subtitle="Top 10 products by ad sales">
                  <div className="h-80 w-full">
                    <ResponsiveContainer>
                      <BarChart data={adTrend}>
                        <CartesianGrid stroke="#172033" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${compactNumber(v)}`} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 16 }}
                          formatter={(v) => currency(v)}
                        />
                        <Bar dataKey="sales" radius={[8, 8, 0, 0]} fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Inventory Snapshot" subtitle="FBA and AWD row counts and totals">
                  <div className="grid grid-cols-2 gap-4">
                    <CountCard label="FBA Units (approx)" value={inventorySummary.fbaUnits} />
                    <CountCard label="AWD Units (approx)" value={inventorySummary.awdUnits} />
                    <CountCard label="FBA Rows" value={inventorySummary.fbaRows} />
                    <CountCard label="AWD Rows" value={inventorySummary.awdRows} />
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

              <SectionCard
                title="Advertising Performance"
                subtitle="Toggle between campaign, product, parent, and item type views"
                right={
                  <TogglePills
                    value={adView}
                    onChange={setAdView}
                    options={["Campaign", "Product", "Parent", "Item Type"]}
                  />
                }
              >
                {adView === "Campaign" && (
                  <Table
                    rowKey="campaignName"
                    columns={[
                      { key: "campaignName", label: "Campaign" },
                      { key: "state", label: "Status" },
                      { key: "campaignType", label: "Type" },
                      { key: "impressions", label: "Impr.", render: (r) => compactNumber(r.impressions) },
                      { key: "clicks", label: "Clicks", render: (r) => compactNumber(r.clicks) },
                      { key: "spend", label: "Spend", render: (r) => currency(r.spend) },
                      { key: "sales", label: "Sales", render: (r) => currency(r.sales) },
                      { key: "acos", label: "ACOS", render: (r) => pct(r.acos) },
                      { key: "roas", label: "ROAS", render: (r) => `${r.roas.toFixed(2)}x` },
                    ]}
                    rows={cleanCampaignRows}
                  />
                )}

                {adView === "Product" && (
                  <Table
                    rowKey="asin"
                    columns={[
                      {
                        key: "asin",
                        label: "Product",
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
                      { key: "itemType", label: "Item Type" },
                      { key: "impressions", label: "Impr.", render: (r) => compactNumber(r.impressions) },
                      { key: "clicks", label: "Clicks", render: (r) => compactNumber(r.clicks) },
                      { key: "spend", label: "Spend", render: (r) => currency(r.spend) },
                      { key: "sales", label: "Sales", render: (r) => currency(r.sales) },
                      { key: "orders", label: "Orders", render: (r) => numberFmt(r.orders) },
                      { key: "acos", label: "ACOS", render: (r) => pct(r.acos) },
                      { key: "roas", label: "ROAS", render: (r) => `${r.roas.toFixed(2)}x` },
                    ]}
                    rows={productGrouped}
                  />
                )}

                {adView === "Parent" && (
                  <Table
                    rowKey="parentAsin"
                    columns={[
                      {
                        key: "parentAsin",
                        label: "Parent ASIN",
                        render: (r) => (
                          <div className="flex items-center gap-3">
                            <AsinImage src={r.imageUrl} title={r.parentAsin} />
                            <div className="font-medium text-cyan-300">{r.parentAsin}</div>
                          </div>
                        ),
                      },
                      { key: "impressions", label: "Impr.", render: (r) => compactNumber(r.impressions) },
                      { key: "clicks", label: "Clicks", render: (r) => compactNumber(r.clicks) },
                      { key: "spend", label: "Spend", render: (r) => currency(r.spend) },
                      { key: "sales", label: "Sales", render: (r) => currency(r.sales) },
                      { key: "orders", label: "Orders", render: (r) => numberFmt(r.orders) },
                      { key: "acos", label: "ACOS", render: (r) => pct(r.acos) },
                      { key: "roas", label: "ROAS", render: (r) => `${r.roas.toFixed(2)}x` },
                    ]}
                    rows={parentGrouped}
                  />
                )}

                {adView === "Item Type" && (
                  <Table
                    rowKey="itemType"
                    columns={[
                      { key: "itemType", label: "Item Type" },
                      { key: "impressions", label: "Impr.", render: (r) => compactNumber(r.impressions) },
                      { key: "clicks", label: "Clicks", render: (r) => compactNumber(r.clicks) },
                      { key: "spend", label: "Spend", render: (r) => currency(r.spend) },
                      { key: "sales", label: "Sales", render: (r) => currency(r.sales) },
                      { key: "orders", label: "Orders", render: (r) => numberFmt(r.orders) },
                      { key: "acos", label: "ACOS", render: (r) => pct(r.acos) },
                      { key: "roas", label: "ROAS", render: (r) => `${r.roas.toFixed(2)}x` },
                    ]}
                    rows={itemTypeGrouped}
                  />
                )}
              </SectionCard>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CountCard label="FBA Rows" value={inventorySummary.fbaRows} />
                <CountCard label="AWD Rows" value={inventorySummary.awdRows} />
                <CountCard label="FBA Units (approx)" value={inventorySummary.fbaUnits} />
                <CountCard label="AWD Units (approx)" value={inventorySummary.awdUnits} />
              </div>

              <SectionCard title="FBA Inventory" subtitle="Raw sheet preview">
                <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-300">
                  {JSON.stringify(inventoryFbaSheet.slice(0, 10), null, 2)}
                </pre>
              </SectionCard>

              <SectionCard title="AWD Inventory" subtitle="Raw sheet preview">
                <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-300">
                  {JSON.stringify(inventoryAwdSheet.slice(0, 10), null, 2)}
                </pre>
              </SectionCard>
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

              <SectionCard title="Catalog Preview" subtitle="Using short title from item_data_reference">
                <Table
                  rowKey="asin"
                  columns={[
                    {
                      key: "asin",
                      label: "Product",
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
                    { key: "parentAsin", label: "Parent" },
                    { key: "itemType", label: "Item Type" },
                    { key: "brand", label: "Brand" },
                    { key: "spend", label: "Ad Spend", render: (r) => currency(r.spend) },
                    { key: "sales", label: "Ad Sales", render: (r) => currency(r.sales) },
                  ]}
                  rows={productGrouped.slice(0, 50)}
                />
              </SectionCard>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
