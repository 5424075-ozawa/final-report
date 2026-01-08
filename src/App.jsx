import { useMemo, useState } from "react";
import { weapons } from "./data/weapons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function calcDps(bodyDamage, fireRate) {
  return Math.round(bodyDamage * fireRate);
}

const CATEGORY_COLORS = {
  Sidearm: "#9e9e9e",
  SMG: "#4caf50",
  Shotgun: "#ff9800",
  Rifle: "#2196f3",
  Sniper: "#9c27b0",
  Heavy: "#f44336",
};

export default function App() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  // ヘッダクリック用
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  // 比較用（最大2つ）
  const [compareIds, setCompareIds] = useState([]);

  // グラフの表示件数（多いと見づらいので上位だけ）
  const [chartTopN, setChartTopN] = useState(10);

  const categories = useMemo(() => {
    const set = new Set(weapons.map((w) => w.category));
    return ["All", ...Array.from(set)];
  }, []);

  const compareWeapons = useMemo(() => {
    const map = new Map(weapons.map((w) => [w.id, w]));
    return compareIds.map((id) => map.get(id)).filter(Boolean);
  }, [compareIds]);

  const list = useMemo(() => {
    // 1) カテゴリ絞り込み
    let filtered =
      category === "All"
        ? weapons
        : weapons.filter((w) => w.category === category);

    // 2) 検索（武器名）
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((w) => w.name.toLowerCase().includes(q));
    }

    // 3) ソート（ヘッダクリック）
    const sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let av, bv;

        switch (sortColumn) {
          case "cost":
            av = a.cost;
            bv = b.cost;
            break;
          case "fireRate":
            av = a.fireRate;
            bv = b.fireRate;
            break;
          case "magazine":
            av = a.magazine;
            bv = b.magazine;
            break;
          case "dps":
            av = calcDps(a.damage.body, a.fireRate);
            bv = calcDps(b.damage.body, b.fireRate);
            break;

          case "headDamage":
            av = a.damage.head;
            bv = b.damage.head;
            break;
          case "bodyDamage":
            av = a.damage.body;
            bv = b.damage.body;
            break;
          case "legDamage":
            av = a.damage.leg;
            bv = b.damage.leg;
            break;

          default:
            return 0;
        }

        return sortOrder === "asc" ? av - bv : bv - av;
      });
    }

    return sorted;
  }, [category, query, sortColumn, sortOrder]);

  // グラフ用データ：いま表示中のリストからDPSを作って、DPS順上位N件を表示
  const chartData = useMemo(() => {
    const data = list.map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      dps: calcDps(w.damage.body, w.fireRate),
    }));

    // 見やすさ優先：DPS降順で上位Nだけ
    data.sort((a, b) => b.dps - a.dps);
    return data.slice(0, Math.max(1, Math.min(chartTopN, data.length)));
  }, [list, chartTopN]);

  function handleHeaderClick(column) {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  }

  function arrow(column) {
    if (sortColumn !== column) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  }

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // 3つ目は不可
      return [...prev, id];
    });
  }

  function clearCompare() {
    setCompareIds([]);
  }

  const compareHint =
    compareIds.length < 2
      ? `比較は最大2つまで選べます（残り ${2 - compareIds.length}）`
      : "比較は2つ選択中です";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>VALORANT 武器性能一覧</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        検索・カテゴリ絞り込み・ヘッダクリックソート・2つ比較・DPSグラフに対応。DPSは「胴体ダメージ × 連射」の簡易値です。
      </p>

      {/* DPSグラフ */}
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>DPS 上位グラフ</strong>
          <span style={{ color: "#555" }}>
            （現在の表示条件に基づく上位 {Math.min(chartTopN, chartData.length)} 件）
          </span>

          <label style={{ marginLeft: "auto" }}>
            表示件数：
            <select
              value={chartTopN}
              onChange={(e) => setChartTopN(Number(e.target.value))}
              style={{ marginLeft: 6 }}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ height: 280, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="dps" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 比較パネル */}
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>比較</strong>
          <span style={{ color: "#555" }}>{compareHint}</span>
          <button
            onClick={clearCompare}
            disabled={compareIds.length === 0}
            style={{
              marginLeft: "auto",
              padding: "6px 10px",
              cursor: compareIds.length === 0 ? "not-allowed" : "pointer",
              opacity: compareIds.length === 0 ? 0.5 : 1,
            }}
          >
            比較解除
          </button>
        </div>

        {compareWeapons.length > 0 ? (
          <div style={compareGrid}>
            <CompareCard weapon={compareWeapons[0]} />
            <CompareCard weapon={compareWeapons[1]} />
          </div>
        ) : (
          <p style={{ margin: "10px 0 0", color: "#555" }}>
            表の「比較」チェックを入れると、ここに横並びで表示されます。
          </p>
        )}
      </div>

      {/* フィルタ */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          margin: "16px 0",
          flexWrap: "wrap",
        }}
      >
        <label>
          カテゴリ：
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          検索：
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: vandal / phantom / op"
            style={{ marginLeft: 6, padding: "4px 8px" }}
          />
        </label>

        <button onClick={() => setQuery("")} style={btnStyle}>
          検索クリア
        </button>

        <button
          onClick={() => {
            setSortColumn(null);
            setSortOrder("asc");
          }}
          style={btnStyle}
        >
          ソート解除
        </button>

        <span style={{ marginLeft: "auto", color: "#555" }}>
          表示数：{list.length}
        </span>
      </div>

      {/* 表 */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>比較</th>
              <th style={thStyle}>武器</th>
              <th style={thStyle}>カテゴリ</th>

              <th style={thClickable} onClick={() => handleHeaderClick("cost")}>
                価格{arrow("cost")}
              </th>

              <th style={thClickable} onClick={() => handleHeaderClick("headDamage")}>
                頭{arrow("headDamage")}
              </th>
              <th style={thClickable} onClick={() => handleHeaderClick("bodyDamage")}>
                胴{arrow("bodyDamage")}
              </th>
              <th style={thClickable} onClick={() => handleHeaderClick("legDamage")}>
                脚{arrow("legDamage")}
              </th>

              <th style={thClickable} onClick={() => handleHeaderClick("fireRate")}>
                連射{arrow("fireRate")}
              </th>

              <th style={thClickable} onClick={() => handleHeaderClick("magazine")}>
                マガジン{arrow("magazine")}
              </th>

              <th style={thClickable} onClick={() => handleHeaderClick("dps")}>
                DPS{arrow("dps")}
              </th>
            </tr>
          </thead>

          <tbody>
            {list.map((w) => {
              const dps = calcDps(w.damage.body, w.fireRate);
              const checked = compareIds.includes(w.id);
              const disabled = !checked && compareIds.length >= 2;

              return (
                <tr key={w.id}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleCompare(w.id)}
                      title={disabled ? "比較は2つまでです" : "比較に追加"}
                    />
                  </td>

                  <td style={tdStyle}>
                    <strong>{w.name}</strong>
                  </td>

                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "white",
                        backgroundColor: CATEGORY_COLORS[w.category] ?? "#777",
                      }}
                    >
                      {w.category}
                    </span>
                  </td>

                  <td style={tdStyle}>{w.cost}</td>

                  <td style={tdStyle}>{w.damage.head}</td>
                  <td style={tdStyle}>{w.damage.body}</td>
                  <td style={tdStyle}>{w.damage.leg}</td>

                  <td style={tdStyle}>{w.fireRate}</td>
                  <td style={tdStyle}>{w.magazine}</td>
                  <td style={tdStyle}>{dps}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- 比較表示 --- */
function CompareCard({ weapon }) {
  if (!weapon) {
    return (
      <div style={{ ...cardStyle, color: "#777" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>（未選択）</div>
        <div>表から武器を選んでください</div>
      </div>
    );
  }

  const dps = calcDps(weapon.damage.body, weapon.fireRate);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{weapon.name}</div>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 12,
            fontSize: 12,
            color: "white",
            backgroundColor: CATEGORY_COLORS[weapon.category] ?? "#777",
          }}
        >
          {weapon.category}
        </span>
      </div>

      <div style={kvGrid}>
        <KV label="価格" value={weapon.cost} />
        <KV label="DPS" value={dps} />
        <KV label="連射" value={weapon.fireRate} />
        <KV label="マガジン" value={weapon.magazine} />
        <KV label="頭" value={weapon.damage.head} />
        <KV label="胴" value={weapon.damage.body} />
        <KV label="脚" value={weapon.damage.leg} />
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#555" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* --- styles --- */
const panelStyle = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 12,
  background: "#fafafa",
  marginBottom: 12,
};

const compareGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 12,
};

const cardStyle = {
  border: "1px solid #e2e2e2",
  borderRadius: 10,
  padding: 12,
  background: "white",
  minHeight: 140,
};

const kvGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 6,
  marginTop: 10,
};

const btnStyle = { padding: "6px 10px", cursor: "pointer" };

const thStyle = {
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  padding: "10px 8px",
  whiteSpace: "nowrap",
};

const thClickable = {
  ...thStyle,
  cursor: "pointer",
  userSelect: "none",
};

const tdStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};
