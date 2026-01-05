import React, { useMemo, useRef, useState } from "react";
import { findValidPaths, Point, PathResult } from "../services/pathFinder";

const DEFAULT_POINTS_TEXT = `1,2
3,4
5,6
2,1
4,3`;

type ViewMode = "split" | "inputs" | "results";

function parsePointLine(line: string): Point | null {
  const parts = line
    .trim()
    .split(/[,\s;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function parseCSVCoordinates(csvText: string): { points: Point[] | null; error?: string } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { points: null, error: "CSV is empty." };

  // Drop header if it contains letters
  let startIdx = 0;
  if (/[a-zA-Z]/.test(lines[0])) startIdx = 1;

  const pts: Point[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const p = parsePointLine(lines[i]);
    if (!p) return { points: null, error: `Bad row at line ${i + 1}: "${lines[i]}"` };
    pts.push(p);
  }

  if (pts.length === 0) return { points: null, error: "No coordinate rows found." };
  return { points: pts };
}

function pointsToText(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join("\n");
}

function pointsToCSV(points: Point[]): string {
  const header = "x,y";
  const rows = points.map((p) => `${p.x},${p.y}`);
  return [header, ...rows].join("\n");
}

/**
 * length,points
 * 12.34,"(sx,sy)->(x1,y1)->...->(ex,ey)"
 */
function pathsToCSV(paths: Array<{ length: number; fullPath: Point[] }>): string {
  const header = "length,points";
  const rows = paths.map((p) => {
    const chain = p.fullPath.map((q) => `(${q.x},${q.y})`).join("->");
    return `${p.length},"${chain}"`;
  });
  return [header, ...rows].join("\n");
}

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeNumber(text: string): number | null {
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export default function PathFinder(): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // view switching
  const [view, setView] = useState<ViewMode>("split");

  // points input
  const [pointsText, setPointsText] = useState<string>(DEFAULT_POINTS_TEXT);

  // Start/End
  const [startX, setStartX] = useState<string>("0");
  const [startY, setStartY] = useState<string>("0");
  const [endX, setEndX] = useState<string>("6");
  const [endY, setEndY] = useState<string>("6");

  // Constraints
  const [minLen, setMinLen] = useState<string>("10");
  const [maxLen, setMaxLen] = useState<string>("25");
  const [k, setK] = useState<string>("3");

  // Results
  const [results, setResults] = useState<PathResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => {
    const lines = pointsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const points: Point[] = [];
    for (const line of lines) {
      const p = parsePointLine(line);
      if (!p) return { ok: false as const, points: [] as Point[], error: `Bad point line: "${line}"` };
      points.push(p);
    }

    const sx = safeNumber(startX);
    const sy = safeNumber(startY);
    const ex = safeNumber(endX);
    const ey = safeNumber(endY);
    const min = safeNumber(minLen);
    const max = safeNumber(maxLen);
    const kk = safeNumber(k);

    if (sx === null || sy === null) return { ok: false as const, points, error: "Start must be numeric (x,y)." };
    if (ex === null || ey === null) return { ok: false as const, points, error: "End must be numeric (x,y)." };
    if (min === null || max === null) return { ok: false as const, points, error: "minLen/maxLen must be numeric." };
    if (kk === null || !Number.isInteger(kk)) return { ok: false as const, points, error: "k must be an integer." };

    if (points.length === 0) return { ok: false as const, points, error: "Add at least 1 point." };
    if (kk < 1 || kk > points.length) return { ok: false as const, points, error: `k must be between 1 and ${points.length}.` };
    if (min > max) return { ok: false as const, points, error: "minLen must be ≤ maxLen." };

    return {
      ok: true as const,
      points,
      start: { x: sx, y: sy } as Point,
      end: { x: ex, y: ey } as Point,
      min,
      max,
      k: kk,
    };
  }, [pointsText, startX, startY, endX, endY, minLen, maxLen, k]);

  const stats = useMemo(() => {
    const total = results.length;
    const sel = selected.size;
    const min = total ? Math.min(...results.map((r) => r.length)) : null;
    const max = total ? Math.max(...results.map((r) => r.length)) : null;
    return { total, sel, min, max };
  }, [results, selected]);

  async function compute() {
    setError(null);

    if (!parsed.ok) {
      setError(parsed.error);
      setResults([]);
      setSelected(new Set());
      return;
    }

    setBusy(true);
    await new Promise((r) => setTimeout(r, 40));

    try {
      const res = findValidPaths(parsed.points, parsed.start, parsed.end, parsed.min, parsed.max, parsed.k);
      setResults(res);
      setSelected(new Set());
      // after compute, auto-switch to results if user is in "inputs"
      if (view === "inputs") setView("results");
    } catch (e: any) {
      setError(e?.message || String(e));
      setResults([]);
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(() => {
      const next = new Set<number>();
      const limit = Math.min(200, results.length);
      for (let i = 0; i < limit; i++) next.add(i);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function exportSelected() {
    if (selected.size === 0) return;
    const indices = Array.from(selected).sort((a, b) => a - b);
    const chosen = indices.map((i) => results[i]).filter(Boolean);
    downloadTextFile("selected_paths.csv", pathsToCSV(chosen), "text/csv");
  }

  function exportAll() {
    if (results.length === 0) return;
    downloadTextFile("paths.csv", pathsToCSV(results), "text/csv");
  }

  function exportPointsCSV() {
    if (!parsed.ok) return;
    downloadTextFile("points.csv", pointsToCSV(parsed.points), "text/csv");
  }

  async function importCSV(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const { points, error: csvErr } = parseCSVCoordinates(text);
      if (!points) {
        setError(csvErr || "Failed to parse CSV.");
        return;
      }
      setPointsText(pointsToText(points));

      // auto-fix k if needed
      const kk = Number(k);
      if (!Number.isFinite(kk) || kk < 1) setK("1");
      else if (kk > points.length) setK(String(points.length));
    } catch {
      setError("Failed to read CSV file.");
    }
  }

  const showInputs = view === "split" || view === "inputs";
  const showResults = view === "split" || view === "results";

  return (
    <div className="pfRoot">
      <style>{css}</style>

      <header className="pfHeader">
        <div className="pfHeaderLeft">
          <div className="pfKicker">TOOL</div>
          <h1 className="pfTitle">Path Finder</h1>
          <p className="pfSubtitle">
            Import points from CSV, compute paths (exact k), select multiple results, and export selected/all paths.
          </p>

          <div className="pfSegment">
            <button
              className={`pfSegBtn ${view === "inputs" ? "isActive" : ""}`}
              onClick={() => setView("inputs")}
              type="button"
            >
              Inputs
            </button>
            <button
              className={`pfSegBtn ${view === "results" ? "isActive" : ""}`}
              onClick={() => setView("results")}
              type="button"
            >
              Results
            </button>
            <button
              className={`pfSegBtn ${view === "split" ? "isActive" : ""}`}
              onClick={() => setView("split")}
              type="button"
            >
              Split
            </button>
          </div>
        </div>

        <div className="pfHeaderRight">
          <div className="pfStatPill">
            <div className="pfStatLabel">Points</div>
            <div className="pfStatValue">{parsed.ok ? parsed.points.length : "—"}</div>
          </div>
          <div className="pfStatPill">
            <div className="pfStatLabel">Results</div>
            <div className="pfStatValue">{stats.total}</div>
          </div>
          <div className="pfStatPill">
            <div className="pfStatLabel">Selected</div>
            <div className="pfStatValue">{stats.sel}</div>
          </div>
        </div>
      </header>

      <main className={`pfGrid ${view !== "split" ? "single" : ""}`}>
        {/* INPUTS */}
        {showInputs && (
          <section className="pfCard">
            <div className="pfCardTop">
              <div>
                <div className="pfCardTitle">Inputs</div>
                <div className="pfCardHint">Points are “x,y” per line. CSV import supports optional header.</div>
              </div>

              <div className="pfActions">
                <button className="pfBtn" onClick={() => fileInputRef.current?.click()} type="button">
                  Import CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importCSV(f);
                    e.currentTarget.value = "";
                  }}
                />
                <button className="pfBtn pfBtnGhost" onClick={exportPointsCSV} disabled={!parsed.ok} type="button">
                  Export Points
                </button>
              </div>
            </div>

            <div className="pfCardBody">
              <label className="pfLabel">Points (x,y per line)</label>
              <textarea
                className="pfTextarea"
                value={pointsText}
                onChange={(e) => setPointsText(e.target.value)}
                spellCheck={false}
              />

              <div className="pfRowBetween">
                <button className="pfLink" onClick={() => setPointsText(DEFAULT_POINTS_TEXT)} type="button">
                  Reset sample
                </button>
                <div className="pfMuted">
                  Tip: paste coordinates separated by comma / space / semicolon.
                </div>
              </div>

              <div className="pfTwoCol">
                <div>
                  <div className="pfGroupLabel">Start</div>
                  <div className="pfInline2">
                    <div className="pfField">
                      <div className="pfFieldLabel">X</div>
                      <input className="pfInput" value={startX} onChange={(e) => setStartX(e.target.value)} />
                    </div>
                    <div className="pfField">
                      <div className="pfFieldLabel">Y</div>
                      <input className="pfInput" value={startY} onChange={(e) => setStartY(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="pfGroupLabel">End</div>
                  <div className="pfInline2">
                    <div className="pfField">
                      <div className="pfFieldLabel">X</div>
                      <input className="pfInput" value={endX} onChange={(e) => setEndX(e.target.value)} />
                    </div>
                    <div className="pfField">
                      <div className="pfFieldLabel">Y</div>
                      <input className="pfInput" value={endY} onChange={(e) => setEndY(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pfThreeCol">
                <div className="pfField">
                  <div className="pfFieldLabel">Min Length</div>
                  <input className="pfInput" value={minLen} onChange={(e) => setMinLen(e.target.value)} />
                </div>
                <div className="pfField">
                  <div className="pfFieldLabel">Max Length</div>
                  <input className="pfInput" value={maxLen} onChange={(e) => setMaxLen(e.target.value)} />
                </div>
                <div className="pfField">
                  <div className="pfFieldLabel">k (points to traverse)</div>
                  <input className="pfInput" value={k} onChange={(e) => setK(e.target.value)} />
                </div>
              </div>

              {error && (
                <div className="pfAlert">
                  <div className="pfAlertTitle">Error</div>
                  <div className="pfAlertBody">{error}</div>
                </div>
              )}

              {!parsed.ok && !error && (
                <div className="pfWarn">
                  <span className="pfWarnDot" />
                  <span>{parsed.error}</span>
                </div>
              )}

              <div className="pfRowBetween" style={{ marginTop: 12 }}>
                <button className="pfBtn pfBtnPrimary" disabled={busy || !parsed.ok} onClick={() => void compute()}>
                  {busy ? "Computing…" : "Find Paths"}
                </button>
                <div className="pfMutedSmall">
                  Brute force permutations grow fast — keep N and k reasonable.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RESULTS */}
        {showResults && (
          <section className="pfCard">
            <div className="pfCardTop">
              <div>
                <div className="pfCardTitle">Results</div>
                <div className="pfCardHint">Select multiple paths and export them as CSV.</div>
              </div>

              <div className="pfActions">
                <button className="pfBtn" onClick={exportSelected} disabled={selected.size === 0} type="button">
                  Export Selected ({selected.size})
                </button>
                <button className="pfBtn pfBtnGhost" onClick={exportAll} disabled={results.length === 0} type="button">
                  Export All
                </button>
                <button className="pfBtn pfBtnGhost" onClick={selectAllVisible} disabled={results.length === 0} type="button">
                  Select All (200)
                </button>
                <button className="pfBtn pfBtnGhost" onClick={clearSelection} disabled={selected.size === 0} type="button">
                  Clear
                </button>
              </div>
            </div>

            <div className="pfCardBody">
              {results.length === 0 ? (
                <div className="pfEmpty">
                  <div className="pfEmptyTitle">No results</div>
                  <div className="pfEmptySub">Run “Find Paths” to generate matches.</div>
                </div>
              ) : (
                <>
                  <div className="pfMiniStats">
                    <div className="pfMiniStat">
                      <div className="pfMiniLabel">Shortest</div>
                      <div className="pfMiniValue">{stats.min?.toFixed(2) ?? "—"}</div>
                    </div>
                    <div className="pfMiniStat">
                      <div className="pfMiniLabel">Longest</div>
                      <div className="pfMiniValue">{stats.max?.toFixed(2) ?? "—"}</div>
                    </div>
                    <div className="pfMiniStat">
                      <div className="pfMiniLabel">Showing</div>
                      <div className="pfMiniValue">{Math.min(200, results.length)}</div>
                    </div>
                  </div>

                  <div className="pfTableWrap">
                    <table className="pfTable">
                      <thead>
                        <tr>
                          <th style={{ width: 52 }}>Sel</th>
                          <th style={{ width: 64 }}>#</th>
                          <th style={{ width: 120 }}>Length</th>
                          <th>Path (START → … → END)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.slice(0, 200).map((r, idx) => {
                          const checked = selected.has(idx);
                          const chain = r.fullPath
                            .map((p, i) => {
                              const tag = i === 0 ? "START " : i === r.fullPath.length - 1 ? "END " : "";
                              return `${tag}(${p.x},${p.y})`;
                            })
                            .join(" → ");

                          return (
                            <tr key={idx} className={checked ? "isSelected" : ""}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(idx)}
                                  aria-label={`Select path ${idx + 1}`}
                                />
                              </td>
                              <td className="pfMono">{idx + 1}</td>
                              <td className="pfMono">{r.length.toFixed(2)}</td>
                              <td className="pfPathCell" title={chain}>
                                {chain}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {results.length > 200 && (
                    <div className="pfMutedSmall" style={{ marginTop: 10 }}>
                      Showing first 200 results. (Increase the slice limit in code if needed.)
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/**
 * High-contrast dark theme + LTR
 * (You can tweak the colors here easily)
 */
const css = `
.pfRoot{
  direction: ltr;
  text-align: left;
  padding: 18px;
  color: #EAF0FF;
  background:
    radial-gradient(900px 500px at 15% 10%, rgba(99,102,241,.25), transparent),
    radial-gradient(900px 500px at 80% 20%, rgba(16,185,129,.18), transparent),
    linear-gradient(180deg, #0B1020, #070A14);
  min-height: 100vh;
}

/* HEADER */
.pfHeader{
  display:flex;
  justify-content:space-between;
  gap: 16px;
  align-items:flex-start;
  margin-bottom: 14px;
}
.pfHeaderLeft{ max-width: 880px; }
.pfKicker{
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(234,240,255,.65);
}
.pfTitle{
  font-size: 34px;
  font-weight: 900;
  margin: 6px 0 6px;
  letter-spacing: -0.02em;
}
.pfSubtitle{
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(234,240,255,.72);
}

/* SEGMENT CONTROL */
.pfSegment{
  margin-top: 12px;
  display:inline-flex;
  gap: 6px;
  padding: 6px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
}
.pfSegBtn{
  border: 1px solid transparent;
  background: transparent;
  color: rgba(234,240,255,.85);
  padding: 8px 12px;
  border-radius: 12px;
  font-weight: 900;
  cursor: pointer;
}
.pfSegBtn:hover{ background: rgba(255,255,255,.07); }
.pfSegBtn.isActive{
  background: rgba(99,102,241,.22);
  border-color: rgba(99,102,241,.35);
}

/* STAT PILLS */
.pfHeaderRight{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.pfStatPill{
  min-width: 120px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 14px 40px rgba(0,0,0,.30);
}
.pfStatLabel{
  font-size: 11px;
  color: rgba(234,240,255,.65);
  font-weight: 800;
}
.pfStatValue{
  font-size: 18px;
  font-weight: 950;
  margin-top: 2px;
}

/* GRID */
.pfGrid{
  display:grid;
  grid-template-columns: 1.05fr 1.25fr;
  gap: 14px;
}
.pfGrid.single{
  grid-template-columns: 1fr;
}

/* CARD */
.pfCard{
  border-radius: 18px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 18px 55px rgba(0,0,0,.35);
  overflow: hidden;
  backdrop-filter: blur(10px);
}
.pfCardTop{
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  display:flex;
  justify-content:space-between;
  gap: 12px;
  align-items:flex-start;
}
.pfCardTitle{
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.pfCardHint{
  margin-top: 4px;
  font-size: 12px;
  color: rgba(234,240,255,.65);
}
.pfCardBody{
  padding: 14px;
}

/* BUTTONS */
.pfActions{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content:flex-end;
}
.pfBtn{
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  color: rgba(234,240,255,.92);
  padding: 9px 11px;
  border-radius: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: transform .06s ease, background .12s ease, border-color .12s ease;
}
.pfBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.10); }
.pfBtn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }
.pfBtnGhost{ background: transparent; }
.pfBtnPrimary{
  background: linear-gradient(135deg, rgba(99,102,241,.85), rgba(16,185,129,.55));
  border-color: rgba(255,255,255,.18);
}

/* INPUTS */
.pfLabel{
  display:block;
  font-size: 12px;
  font-weight: 900;
  color: rgba(234,240,255,.78);
  margin-bottom: 6px;
}
.pfTextarea{
  width: 100%;
  min-height: 170px;
  resize: vertical;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.28);
  color: rgba(234,240,255,.94);
  outline: none;
  line-height: 1.5;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
}
.pfInput{
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.28);
  color: rgba(234,240,255,.94);
  outline: none;
  font-size: 13px;
}
.pfInput:focus,
.pfTextarea:focus{
  border-color: rgba(99,102,241,.55);
  box-shadow: 0 0 0 4px rgba(99,102,241,.18);
}
.pfGroupLabel{
  font-size: 12px;
  font-weight: 950;
  margin-bottom: 8px;
  color: rgba(234,240,255,.85);
}
.pfFieldLabel{
  font-size: 11px;
  font-weight: 900;
  color: rgba(234,240,255,.60);
  margin-bottom: 6px;
}
.pfField{ display:flex; flex-direction:column; }
.pfInline2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pfTwoCol{
  margin-top: 12px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.pfThreeCol{
  margin-top: 12px;
  display:grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.pfRowBetween{
  display:flex;
  justify-content:space-between;
  gap: 10px;
  align-items:center;
  margin-top: 10px;
}
.pfLink{
  border: none;
  background: transparent;
  color: rgba(99, 214, 255, .95);
  font-weight: 950;
  cursor: pointer;
  padding: 0;
}
.pfMuted{ color: rgba(234,240,255,.65); font-size: 12px; }
.pfMutedSmall{ color: rgba(234,240,255,.60); font-size: 11px; }

/* ALERTS */
.pfAlert{
  margin-top: 12px;
  border-radius: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.12);
}
.pfAlertTitle{ font-weight: 950; margin-bottom: 4px; }
.pfAlertBody{ color: rgba(234,240,255,.90); font-size: 13px; }

.pfWarn{
  margin-top: 12px;
  display:flex;
  gap: 8px;
  align-items:center;
  font-size: 12px;
  color: rgba(234,240,255,.72);
}
.pfWarnDot{
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(245,158,11,.9);
  box-shadow: 0 0 0 4px rgba(245,158,11,.18);
}

/* RESULTS */
.pfEmpty{
  border-radius: 16px;
  border: 1px dashed rgba(255,255,255,.18);
  background: rgba(0,0,0,.22);
  padding: 16px;
}
.pfEmptyTitle{ font-weight: 950; font-size: 14px; margin-bottom: 6px; }
.pfEmptySub{ color: rgba(234,240,255,.70); font-size: 13px; line-height: 1.4; }

.pfMiniStats{
  display:grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.pfMiniStat{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  padding: 10px 12px;
}
.pfMiniLabel{ font-size: 11px; font-weight: 900; color: rgba(234,240,255,.62); }
.pfMiniValue{ font-size: 16px; font-weight: 950; margin-top: 2px; }

.pfTableWrap{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  overflow: hidden;
  background: rgba(0,0,0,.22);
}
.pfTable{
  width: 100%;
  border-collapse: collapse;
}
.pfTable thead th{
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(8,10,18,.92);
  border-bottom: 1px solid rgba(255,255,255,.08);
  padding: 10px 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 950;
  color: rgba(234,240,255,.90);
}
.pfTable tbody td{
  padding: 10px 10px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  vertical-align: top;
}
.pfTable tbody tr:hover{
  background: rgba(255,255,255,.05);
}
.pfTable tbody tr.isSelected{
  background: rgba(16,185,129,.10);
}
.pfMono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
  font-size: 12px;
}
.pfPathCell{
  font-size: 12px;
  color: rgba(234,240,255,.86);
  line-height: 1.35;
  word-break: break-word;
}

/* RESPONSIVE */
@media (max-width: 980px){
  .pfHeader{ flex-direction: column; }
  .pfHeaderRight{ justify-content: flex-start; }
  .pfTwoCol{ grid-template-columns: 1fr; }
  .pfThreeCol{ grid-template-columns: 1fr; }
  .pfActions{ justify-content: flex-start; }
}
`;
