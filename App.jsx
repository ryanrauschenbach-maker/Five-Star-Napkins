import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  DollarSign,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
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
} from "recharts";

const SHEET_ID = "10Mt51wijvl-_LzJG7Z-uSLYrn4MRzeUEY9TSkinkGPY";
const LOGO_URL = "https://designhqs.com/wp-content/uploads/2022/01/dh-logi.svg";

const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const numberFmt = (value) => new Intl.NumberFormat("en-US").format(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const weeks = (value) => `${Number(value || 0).toFixed(1)}w`;

function compactCurrency(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function buildSheetUrl(tabName, query = "select *") {
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

async function fetchSheet(tabName, query = "select *") {
  const res = await fetch(buildSheetUrl(tabName, query));
  if (!res.ok) throw new Error(`Failed to load ${tabName}`);
  const text = await res.text();
  return parseGviz(text);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/[$,%\s,]/g, "")) || 0;
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getAsinImageUrl(asin) {
  if (!asin) return "";
  return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL120_.jpg`;
}

function AsinImage({ asin, title, size = "sm" }) {
  const [errored, setErrored] = useState(false);
  const dimension = size === "sm" ? "h-10 w-10" : "h-14 w-14";

  if (!asin || errored) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500",
          dimension
        )}
      >
        N/A
      </div>
    );
  }

  return (
    <img
      src={getAsinImageUrl(asin)}
      alt={title || asin}
      className={cn("shrink-0 rounded-2xl border border-slate-800 bg-white object-contain p-1", dimension)}
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

function StatCard({ label, value, change, suffix, icon: Icon }) {
  const formatted =
    suffix === "%"
      ? pct(value)
      : suffix === "x"
      ? `${Number(value || 0).toFixed(2)}x`
      : suffix === "units"
      ? numberFmt(value)
      : currency(value);

  const positive = Number(change || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/20"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatted}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div
        className={cn(
          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
          positive ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
        )}
      >
        {positive ? "↑" : "↓"} {Math.abs(Number(change || 0)).toFixed(1)}%
      </div>
    </motion.div>
  );
}

function InventoryCard({ label, value, kind }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">
        {kind === "weeks" ? weeks(value) : numberFmt(value)}
      </p>
    </div>
  );
}

function SectionCard({ title, subtitle, children, className }) {
  return (
    <div className={cn("rounded-3xl border border-slate-800 bg-slate-950 p-5", className)}>
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function MiniBarList({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-300">{item.name}</span>
            <span className="font-medium text-white">{currency(item.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesOverview({ data }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Daily Revenue Trend" subtitle="Pulled from the sales_daily sheet tab">
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={data.dailyTrend}>
              <defs>
                <linearGradient id="salesRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#172033" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${compactCurrency(v)}`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 16 }} formatter={(v) => currency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#38bdf8" fill="url(#salesRevenueFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.cards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Revenue by Brand">
          <MiniBarList data={data.byBrand} />
        </SectionCard>
        <SectionCard title="Revenue by Category">
          <MiniBarList data={data.byCategory} />
        </SectionCard>
      </div>

      <SectionCard title="Top Products" subtitle="From products_30d joined to catalog_lookup">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-3 font-medium">ASIN</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((row) => (
                <tr key={row.asin} className="border-b border-slate-900 text-slate-200">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <AsinImage asin={row.asin} title={row.title} size="sm" />
                      <span className="font-medium text-cyan-300">{row.asin}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">{row.title}</td>
                  <td className="px-4 py-4">{numberFmt(row.units_30d)}</td>
                  <td className="px-4 py-4">{currency(row.revenue_30d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function ProductsView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summary.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{numberFmt(item.value)}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Products 30D" subtitle="Live search uses sheet data">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-3 font-medium">ASIN</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.asin} className="border-b border-slate-900 text-slate-200">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <AsinImage asin={row.asin} title={row.title} size="sm" />
                      <span className="font-medium text-cyan-300">{row.asin}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">{row.title}</td>
                  <td className="px-4 py-4">{row.brand || "—"}</td>
                  <td className="px-4 py-4">{row.category || "—"}</td>
                  <td className="px-4 py-4">{numberFmt(row.units_30d)}</td>
                  <td className="px-4 py-4">{currency(row.revenue_30d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function AdvertisingView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summary.map((item) => (
          <StatCard key={item.label} {...item} icon={Megaphone} />
        ))}
      </div>

      <SectionCard title="Vendor Central Campaigns" subtitle="From ads_1p_30d">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Impressions</th>
                <th className="px-4 py-3 font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">Spend</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">ACOS</th>
                <th className="px-4 py-3 font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={`${row.campaign}-${i}`} className="border-b border-slate-900 text-slate-200">
                  <td className="px-4 py-4">{row.campaign}</td>
                  <td className="px-4 py-4">{compactCurrency(row.impressions)}</td>
                  <td className="px-4 py-4">{compactCurrency(row.clicks)}</td>
                  <td className="px-4 py-4 text-amber-300">{currency(row.spend)}</td>
                  <td className="px-4 py-4 text-cyan-300">{currency(row.sales)}</td>
                  <td className="px-4 py-4">{pct(row.acos)}</td>
                  <td className="px-4 py-4">{Number(row.roas || 0).toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function InventoryView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.cards.map((item) => (
          <InventoryCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="1P Inventory" subtitle="From inventory_1p">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="px-4 py-3 font-medium">ASIN</th>
                  <th className="px-4 py-3 font-medium">Sellable</th>
                  <th className="px-4 py-3 font-medium">On Order</th>
                  <th className="px-4 py-3 font-medium">Unsellable</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory1p.map((row) => (
                  <tr key={row.asin} className="border-b border-slate-900 text-slate-200">
                    <td className="px-4 py-4 text-cyan-300">{row.asin}</td>
                    <td className="px-4 py-4">{numberFmt(row.sellable)}</td>
                    <td className="px-4 py-4">{numberFmt(row.on_order)}</td>
                    <td className="px-4 py-4">{numberFmt(row.unsellable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="3P Inventory" subtitle="From inventory_3p">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="px-4 py-3 font-medium">ASIN</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Inbound</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory3p.map((row) => (
                  <tr key={row.asin} className="border-b border-slate-900 text-slate-200">
                    <td className="px-4 py-4 text-cyan-300">{row.asin}</td>
                    <td className="px-4 py-4">{numberFmt(row.available)}</td>
                    <td className="px-4 py-4">{numberFmt(row.inbound)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default function CombinedMarketplaceDashboardGoogleSheetsV2() {
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetData, setSheetData] = useState({
    sales_daily: [],
    products_30d: [],
    ads_1p_30d: [],
    inventory_1p: [],
    inventory_3p: [],
    catalog_lookup: [],
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [sales_daily, products_30d, ads_1p_30d, inventory_1p, inventory_3p, catalog_lookup] =
          await Promise.all([
            fetchSheet("sales_daily"),
            fetchSheet("products_30d"),
            fetchSheet("ads_1p_30d"),
            fetchSheet("inventory_1p"),
            fetchSheet("inventory_3p"),
            fetchSheet("catalog_lookup"),
          ]);

        setSheetData({ sales_daily, products_30d, ads_1p_30d, inventory_1p, inventory_3p, catalog_lookup });
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

  const catalogMap = useMemo(() => {
    const map = new Map();
    sheetData.catalog_lookup.forEach((row) => {
      map.set(String(row.asin || "").trim(), {
        title: row.title || "",
        brand: row.brand || "",
        category: row.category || "",
      });
    });
    return map;
  }, [sheetData.catalog_lookup]);

  const productsRows = useMemo(() => {
    return sheetData.products_30d
      .map((row) => {
        const asin = String(row.asin || "").trim();
        const lookup = catalogMap.get(asin) || {};
        return {
          asin,
          title: row.title || lookup.title || "",
          brand: lookup.brand || row.brand || "",
          category: lookup.category || row.category || "",
          units_30d: normalizeNumber(row.units_30d),
          revenue_30d: normalizeNumber(row.revenue_30d),
        };
      })
      .filter((row) => !query || `${row.asin} ${row.title} ${row.brand} ${row.category}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.revenue_30d - a.revenue_30d);
  }, [sheetData.products_30d, catalogMap, query]);

  const salesDaily = useMemo(
    () =>
      sheetData.sales_daily.map((row) => ({
        date: String(row.date || ""),
        revenue: normalizeNumber(row.revenue),
        units: normalizeNumber(row.units),
      })),
    [sheetData.sales_daily]
  );

  const adsRows = useMemo(() => {
    return sheetData.ads_1p_30d
      .map((row) => {
        const spend = normalizeNumber(row.spend);
        const sales = normalizeNumber(row.sales);
        return {
          campaign: row.campaign || "",
          impressions: normalizeNumber(row.impressions),
          clicks: normalizeNumber(row.clicks),
          spend,
          sales,
          acos: sales ? (spend / sales) * 100 : 0,
          roas: spend ? sales / spend : 0,
        };
      })
      .sort((a, b) => b.spend - a.spend);
  }, [sheetData.ads_1p_30d]);

  const inventory1p = useMemo(
    () =>
      sheetData.inventory_1p.map((row) => ({
        asin: String(row.asin || "").trim(),
        sellable: normalizeNumber(row.sellable),
        on_order: normalizeNumber(row.on_order),
        unsellable: normalizeNumber(row.unsellable),
      })),
    [sheetData.inventory_1p]
  );

  const inventory3p = useMemo(
    () =>
      sheetData.inventory_3p.map((row) => ({
        asin: String(row.asin || "").trim(),
        available: normalizeNumber(row.available),
        inbound: normalizeNumber(row.inbound),
      })),
    [sheetData.inventory_3p]
  );

  const overviewData = useMemo(() => {
    const revenue30d = salesDaily.reduce((sum, row) => sum + row.revenue, 0);
    const units30d = salesDaily.reduce((sum, row) => sum + row.units, 0);
    const adSpend = adsRows.reduce((sum, row) => sum + row.spend, 0);

    const groupedBrand = new Map();
    const groupedCategory = new Map();

    productsRows.forEach((row) => {
      const brand = row.brand || "Unmapped";
      const category = row.category || "Unmapped";
      groupedBrand.set(brand, (groupedBrand.get(brand) || 0) + row.revenue_30d);
      groupedCategory.set(category, (groupedCategory.get(category) || 0) + row.revenue_30d);
    });

    return {
      dailyTrend: salesDaily,
      cards: [
        { label: "Revenue (30D)", value: revenue30d, change: 0, icon: DollarSign },
        { label: "Units Sold (30D)", value: units30d, change: 0, icon: ShoppingCart, suffix: "units" },
        { label: "Ad Spend (1P)", value: adSpend, change: 0, icon: Megaphone },
        { label: "TACOS", value: revenue30d ? (adSpend / revenue30d) * 100 : 0, change: 0, icon: BarChart3, suffix: "%" },
      ],
      byBrand: [...groupedBrand.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      byCategory: [...groupedCategory.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      topProducts: productsRows.slice(0, 15),
    };
  }, [salesDaily, adsRows, productsRows]);

  const productsViewData = useMemo(
    () => ({
      summary: [
        { label: "Active ASINs", value: productsRows.length },
        { label: "Brands", value: new Set(productsRows.map((r) => r.brand).filter(Boolean)).size },
        { label: "Categories", value: new Set(productsRows.map((r) => r.category).filter(Boolean)).size },
        { label: "Catalog Mapped", value: sheetData.catalog_lookup.length },
      ],
      rows: productsRows,
    }),
    [productsRows, sheetData.catalog_lookup.length]
  );

  const advertisingViewData = useMemo(() => {
    const spend = adsRows.reduce((sum, r) => sum + r.spend, 0);
    const sales = adsRows.reduce((sum, r) => sum + r.sales, 0);
    return {
      summary: [
        { label: "Total Spend", value: spend, change: 0 },
        { label: "Ad Sales", value: sales, change: 0 },
        { label: "ACOS", value: sales ? (spend / sales) * 100 : 0, change: 0, suffix: "%" },
        { label: "ROAS", value: spend ? sales / spend : 0, change: 0, suffix: "x" },
      ],
      rows: adsRows,
    };
  }, [adsRows]);

  const inventoryViewData = useMemo(() => {
    const total1PSellable = inventory1p.reduce((sum, row) => sum + row.sellable, 0);
    const total1POnOrder = inventory1p.reduce((sum, row) => sum + row.on_order, 0);
    const total1PUnsellable = inventory1p.reduce((sum, row) => sum + row.unsellable, 0);
    const total3PAvailable = inventory3p.reduce((sum, row) => sum + row.available, 0);
    const total3PInbound = inventory3p.reduce((sum, row) => sum + row.inbound, 0);
    const weeklyVelocity = salesDaily.reduce((sum, row) => sum + row.units, 0) / 4 || 0;
    return {
      cards: [
        { label: "1P Sellable", value: total1PSellable, kind: "number" },
        { label: "1P On Order", value: total1POnOrder, kind: "number" },
        { label: "3P Available", value: total3PAvailable, kind: "number" },
        { label: "3P Inbound", value: total3PInbound, kind: "number" },
        { label: "1P WOS", value: weeklyVelocity ? (total1PSellable + total1POnOrder) / weeklyVelocity : 0, kind: "weeks" },
        { label: "3P WOS", value: weeklyVelocity ? (total3PAvailable + total3PInbound) / weeklyVelocity : 0, kind: "weeks" },
        { label: "1P Unsellable", value: total1PUnsellable, kind: "number" },
        { label: "Tracked 3P ASINs", value: inventory3p.length, kind: "number" },
      ],
      inventory1p: inventory1p.slice(0, 50),
      inventory3p: inventory3p.slice(0, 50),
    };
  }, [inventory1p, inventory3p, salesDaily]);

  const tabs = [
    { id: "overview", label: "Sales Overview", icon: DollarSign },
    { id: "products", label: "Products", icon: Package },
    { id: "advertising", label: "Advertising", icon: Megaphone },
    { id: "inventory", label: "Inventory", icon: Warehouse },
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
                <img src={LOGO_URL} alt="Design Headquarters" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Design Headquarters</p>
                <p className="text-sm text-slate-400">Google Sheets Live Demo</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {tabs.map((tab) => (
              <SidebarButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sheet source</p>
            <p className="mt-3 break-all text-sm leading-6 text-slate-300">{SHEET_ID}</p>
          </div>
        </aside>

        <main className="p-4 md:p-6 xl:p-8">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Combined Vendor Central + Seller Central Dashboard</h1>
              <p className="mt-2 text-sm text-slate-400">Now reading live from your Google Sheet.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ASIN, title, brand..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:w-72"
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

          {error ? <div className="mb-6 rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}

          {activeTab === "overview" && <SalesOverview data={overviewData} />}
          {activeTab === "products" && <ProductsView data={productsViewData} />}
          {activeTab === "advertising" && <AdvertisingView data={advertisingViewData} />}
          {activeTab === "inventory" && <InventoryView data={inventoryViewData} />}
        </main>
      </div>
    </div>
  );
}
