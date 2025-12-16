import "./stats.css";
import { getDefaultGridSize, getGridSizeOptions } from "./grid-config";
import { sanitizeSeedValue, DEFAULT_SEED_VALUE } from "./params";

const parseNumberParam = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const params =
  typeof window === "undefined"
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);

const requestedGrid = parseNumberParam(
  params.get("m"),
  getDefaultGridSize()
);
const gridOptions = getGridSizeOptions();
const gridSize = gridOptions.includes(requestedGrid)
  ? requestedGrid
  : getDefaultGridSize();
const seedValue = sanitizeSeedValue(
  params.get("seed") ?? DEFAULT_SEED_VALUE
);

const maxCubes = gridSize * gridSize;
const moveStats: { count: number; moves: number }[] = [];

if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
  for (let count = 1; count <= maxCubes; count += 1) {
    const storageKey = `${gridSize}:${count}:${seedValue}`;
    const bestSolutionKey = `${storageKey}:bestSolution`;
    const raw = window.localStorage.getItem(bestSolutionKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.moveHistory)) {
        continue;
      }
      moveStats.push({
        count,
        moves: parsed.moveHistory.length,
      });
    } catch {
      // ignore corrupt entries
    }
  }
}

moveStats.sort((a, b) => a.count - b.count);

const root = document.querySelector<HTMLElement>("#stats-root");
if (!root) {
  throw new Error("Missing stats container");
}

document.title = "CubeRoll Stats";

root.innerHTML = "";

const header = document.createElement("header");
header.className = "stats-header";
const heading = document.createElement("h1");
heading.textContent = "Move stats";
const meta = document.createElement("p");
meta.className = "stats-meta";
meta.textContent = `Grid ${gridSize}×${gridSize} · Seed ${seedValue}`;
header.appendChild(heading);
header.appendChild(meta);

const intro = document.createElement("p");
intro.className = "stats-intro";
intro.textContent =
  "Only levels with recorded best solutions will appear below.";

const statsList = document.createElement("div");
statsList.className = "stats-grid";
if (moveStats.length === 0) {
  const empty = document.createElement("p");
  empty.className = "stats-empty";
  empty.textContent =
    "No saved best solutions yet. Finish a level to log your move count.";
  statsList.appendChild(empty);
} else {
  moveStats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "stats-card";
    const label = document.createElement("p");
    label.className = "stats-card-label";
    label.textContent = `Level ${stat.count}`;
    const value = document.createElement("p");
    value.className = "stats-card-value";
    value.textContent = `${stat.moves} moves`;
    card.appendChild(label);
    card.appendChild(value);
    statsList.appendChild(card);
  });
}

const note = document.createElement("p");
note.className = "stats-note";
note.textContent =
  "Each entry shows the move count from the best stored solution.";

const actions = document.createElement("div");
actions.className = "stats-actions";
const backLink = document.createElement("a");
backLink.className = "stats-back-link";
backLink.textContent = "Return to the game";
const backParams = new URLSearchParams();
backParams.set("m", String(gridSize));
backParams.set("seed", seedValue);
backLink.href = `/?${backParams.toString()}`;
actions.appendChild(backLink);

root.append(header, intro, statsList, note, actions);
