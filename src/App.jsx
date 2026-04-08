import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ComposedChart,
} from "recharts";

const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1KA0mswUxULOvwUdyfnd67k1dKbCUh1-9USOL2cDJC9A/edit?usp=sharing";

const currency = (v) => (v ? `$${v.toLocaleString()}` : "$0");
const percent = (v) => (v ? `${(v * 100).toFixed(1)}%` : "0%");
const compactNumber = (v) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v;

export default function App() {
  const [data, setData] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    fetch(GOOGLE_SHEET_URL)
      .then((res) => res.text())
      .then((text) => {
        const rows = text.split("\n").map((r) => r.split(","));
        const headers = rows[0];

        const parsed = rows.slice(1).map((r) => {
          let obj = {};
          headers.forEach((h, i) => {
            obj[h] = r[i];
          });
          return obj;
        });

        setData(parsed);
      });
  }, []);

  // ===== Monthly Sales =====
  const monthlySalesChartData = monthly.map((row) => ({
    month: row.month,
    sales: Number(row.sales || 0),
    profit: row.profit ? Number(row.profit) : null,
  }));

  // ===== Revenue by Brand (30 day sales) =====
  const revenueByBrand = Object.values(
    data.reduce((acc, row) => {
      const brand = row.brand || "Unknown";
      const sales = Number(row.sales || 0);

      if (!acc[brand]) acc[brand] = { brand, sales: 0 };
      acc[brand].sales += sales;
      return acc;
    }, {})
  ).sort((a, b) => b.sales - a.sales);

  // ===== Revenue by Category =====
  const revenueByCategory = Object.values(
    data.reduce((acc, row) => {
      const cat = row.category || "Unknown";
      const sales = Number(row.sales || 0);

      if (!acc[cat]) acc[cat] = { cat, sales: 0 };
      acc[cat].sales += sales;
      return acc;
    }, {})
  ).sort((a, b) => b.sales - a.sales);

  // ===== Top Products =====
  const topProducts = data
    .map((row) => ({
      asin: row.asin,
      name: row.title,
      sales: Number(row.sales || 0),
      units: Number(row.units || 0),
      image: row.image,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return (
    <div className="p-6 text-white bg-[#020617] min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        Five Star Napkins Dashboard
      </h1>

      {/* ===== Monthly Chart ===== */}
      <div className="bg-[#020617] border border-slate-800 p-6 rounded-xl mb-6">
        <h2 className="mb-4 text-lg font-semibold">
          Monthly Sales & Profit Trend
        </h2>

        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={monthlySalesChartData}>
              <CartesianGrid stroke="#172033" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis
                stroke="#64748b"
                tickFormatter={(v) => `$${compactNumber(v)}`}
              />
              <Tooltip
                formatter={(v, name) =>
                  name === "profit"
                    ? v === null
                      ? "Pending"
                      : currency(v)
                    : currency(v)
                }
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Line dataKey="profit" stroke="#22c55e" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Top Products ===== */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-[#020617] border border-slate-800 p-6 rounded-xl">
          <h2 className="mb-4 text-lg font-semibold">Top Products</h2>

          {topProducts.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={p.image}
                  className="w-10 h-10 rounded"
                />
                <div>
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {p.units} units
                  </div>
                </div>
              </div>

              <div>{currency(p.sales)}</div>
            </div>
          ))}
        </div>

        {/* ===== Advertising Summary Placeholder ===== */}
        <div className="bg-[#020617] border border-slate-800 p-6 rounded-xl">
          <h2 className="mb-4 text-lg font-semibold">Advertising</h2>
          <div className="text-slate-400 text-sm">
            (Hook your ad data here next)
          </div>
        </div>
      </div>

      {/* ===== Bottom Section ===== */}
      <div className="grid grid-cols-2 gap-6">
        {/* Brand */}
        <div className="bg-[#020617] border border-slate-800 p-6 rounded-xl">
          <h2 className="mb-4 text-lg font-semibold">
            Revenue by Brand
          </h2>

          {revenueByBrand.slice(0, 8).map((b, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between text-sm">
                <span>{b.brand}</span>
                <span>{currency(b.sales)}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded">
                <div
                  className="h-2 bg-blue-500 rounded"
                  style={{
                    width: `${(b.sales /
                      revenueByBrand[0].sales) *
                      100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Category */}
        <div className="bg-[#020617] border border-slate-800 p-6 rounded-xl">
          <h2 className="mb-4 text-lg font-semibold">
            Revenue by Category
          </h2>

          {revenueByCategory.slice(0, 8).map((c, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between text-sm">
                <span>{c.cat}</span>
                <span>{currency(c.sales)}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded">
                <div
                  className="h-2 bg-green-500 rounded"
                  style={{
                    width: `${(c.sales /
                      revenueByCategory[0].sales) *
                      100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
