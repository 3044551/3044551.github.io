/**********************************
 * Block 1: Config (Token/Style/Tileset) + Field mapping
 * This is a tileset-based map (no fetch GeoJSON).
 *******************************************************/

// === Mapbox credentials ===
mapboxgl.accessToken = "pk.eyJ1IjoiMzA0NDU1MWMiLCJhIjoiY21rY2hzM3gwMDEwazNncXljMmtkYXp1diJ9.tii63XPxMq2pdG9lKSn1QA";

// Published style URL
const STYLE_URL = "mapbox://styles/3044551c/cmlomc4jn001501s4hbz8792e";

// Tileset source URL 
const TILESET_URL = "mapbox://3044551c.8algotvt";

// The source-layer name
const SOURCE_LAYER = "London_UHI-2jo4a5";

// Field names aligned to properties
const FIELDS = {
  id: "OBJECTID",
  name: "neighborhood",
  temp: "mean_temp",
  green: "pct_blue_green",

  income: "pct_income_deprived",
  tree: "pct_tree",
  pm25: "pm25_conc",
  no2: "no2_conc",
  flood: "pct_flood_risk",
  noOpen: "pct_no_open_space",
  under5: "pct_under5",
  over75: "pct_over75",
  notEnglish: "pct_not_english",
  social: "pct_social_housing",
  bame: "pct_bame"
};

// Initial view (London)
const INITIAL_VIEW = { center: [-0.1276, 51.5072], zoom: 9.7 };

// Choropleth palettes (5-class)
const HEAT_COLORS  = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
const GREEN_COLORS = ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"];

// Colour-blind friendly alternatives
const HEAT_COLORS_CB  = ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"];
const GREEN_COLORS_CB = ["#f7fcf5", "#c7e9c0", "#74c476", "#238b45", "#00441b"];

let useColourBlind = false;

function getHeatColors(){ return useColourBlind ? HEAT_COLORS_CB : HEAT_COLORS; }

function getGreenColors(){ return useColourBlind ? GREEN_COLORS_CB : GREEN_COLORS; }


// Class breaks
const HEAT_BREAKS  = [17.17, 17.72, 18.26, 18.81, 19.35]; // mean_temp (°C)
const GREEN_BREAKS = [1.41, 20, 40, 60, 93.11];           // pct_blue_green (%)

// Defaults (computed in ArcGIS Pro)
const DEFAULT_THRESHOLDS = {
  heatP80: 18.23194475143927,   // P80 mean_temp
  greenP20: 24.84709329228423   // P20 pct_blue_green
};

/*******************************************************
 * Block 2: Map init + Vector source + Choropleth layers + Legend
 *******************************************************/
const map = new mapboxgl.Map({
  container: "map",
  style: STYLE_URL,
  center: INITIAL_VIEW.center,
  zoom: INITIAL_VIEW.zoom,
  minZoom: 8,
  maxZoom: 15
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

const tooltipEl = document.getElementById("hoverTooltip");

let currentMode = "temp";      // temp | green
let currentFilter = "none";    // none | hot | hotLowGreen
let hoverOID = null;           // OBJECTID of hovered feature

map.on("load", () => {
  // Add vector tileset source
  map.addSource("uhi", {
    type: "vector",
    url: TILESET_URL
  });

  // Base fill choropleth
  map.addLayer({
    id: "uhi-fill",
    type: "fill",
    source: "uhi",
    "source-layer": SOURCE_LAYER,
    paint: {
      "fill-color": heatColorExpr(),
      "fill-opacity": 0.70
    }
  });

  // Thin boundary line (subtle)
  map.addLayer({
    id: "uhi-outline",
    type: "line",
    source: "uhi",
    "source-layer": SOURCE_LAYER,
    paint: {
      "line-color": "rgba(0,0,0,0.25)",
      "line-width": 0.6
    }
  });

  // Hover highlight line layer (filter updated on mousemove)
  map.addLayer({
    id: "uhi-hover",
    type: "line",
    source: "uhi",
    "source-layer": SOURCE_LAYER,
    paint: {
      "line-color": "#00FFFF",
      "line-width": 2
    },
    filter: ["==", ["get", FIELDS.id], -999999] // no match initially
  });
  
  
  // Hotspot outline layer (only shown when hotspot mode is active)
map.addLayer({
  id: "hotspot-outline",
  type: "line",
  source: "uhi",
  "source-layer": SOURCE_LAYER,
  paint: {
    "line-color": "#ffbf00",
    "line-width": 2.5,
    "line-opacity": 0.95
  },
  layout: { "visibility": "none" },
  filter: ["==", ["get", FIELDS.id], -999999]
});
  
  
  // --- Borough boundary (thick black outlines) ---
  map.addSource("borough", {
    type: "vector",
    url: "mapbox://3044551c.7fwxnfl2"
  });

  map.addLayer({
    id: "borough-boundary",
    type: "line",
    source: "borough",
    "source-layer": "London_Boroughs-79qglv",
    paint: {
      "line-color": "#000",
      "line-width": 1.0,
      "line-opacity": 0.8
    }
  });
  
  
  // Init UI + interactions
  initSliders();
  updateLegend();
  bindUI();
  bindMapInteractions();

  // Build initial search list from rendered features
  refreshNeighborhoodList();
});

/** Color expression for heat choropleth (5-class step) */
function heatColorExpr() {
  const [b0,b1,b2,b3,b4] = HEAT_BREAKS;
  const C = getHeatColors();
  return [
    "step",
    ["to-number", ["get", FIELDS.temp]],
    C[0],
    b1, C[1],
    b2, C[2],
    b3, C[3],
    b4, C[4]
  ];
}

/** Color expression for green choropleth (5-class step) */
function greenColorExpr() {
  const [b0,b1,b2,b3,b4] = GREEN_BREAKS;
  const C = getGreenColors();
  return [
    "step",
    ["to-number", ["get", FIELDS.green]],
    C[0],
    b1, C[1],
    b2, C[2],
    b3, C[3],
    b4, C[4]
  ];
}

function updateLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  const isHeat = currentMode === "temp";
  const title = isHeat ? "Heat (°C)" : "Green/Blue (%)";
  const colors = isHeat ? getHeatColors() : getGreenColors();
  const breaks = isHeat ? HEAT_BREAKS : GREEN_BREAKS;

  const labels = [
    `< ${breaks[1].toFixed(2)}`,
    `${breaks[1].toFixed(2)}–${breaks[2].toFixed(2)}`,
    `${breaks[2].toFixed(2)}–${breaks[3].toFixed(2)}`,
    `${breaks[3].toFixed(2)}–${breaks[4].toFixed(2)}`,
    `≥ ${breaks[4].toFixed(2)}`
  ];

  for (let i = 0; i < 5; i++) {
    const item = document.createElement("div");
    item.className = "legend-item";

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = colors[i];

    const txt = document.createElement("div");
    txt.innerHTML = `<span style="opacity:.8">${title}</span>: ${labels[i]}`;

    item.appendChild(sw);
    item.appendChild(txt);
    legend.appendChild(item);
  }
}


/*******************************************************
 * Block 3: Hover highlight + Tooltip + Click popup
 *******************************************************/
function bindMapInteractions() {
  map.on("mousemove", "uhi-fill", (e) => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features && e.features[0];
    if (!f) return;

    const p = f.properties || {};
    const oid = Number(p[FIELDS.id]);
    hoverOID = Number.isFinite(oid) ? oid : null;

    // Update hover highlight
    if (hoverOID != null) {
      map.setFilter("uhi-hover", ["==", ["get", FIELDS.id], hoverOID]);
    }

    // Tooltip content (depends on current mode)
    const name = p[FIELDS.name] ?? `ID ${p[FIELDS.id] ?? "N/A"}`;
    const value = currentMode === "temp"
      ? num(p[FIELDS.temp])
      : num(p[FIELDS.green]);

    const label = currentMode === "temp" ? "Temp (°C)" : "Green/Blue (%)";

    tooltipEl.style.display = "block";
    tooltipEl.style.left = (e.point.x + 12) + "px";
    tooltipEl.style.top  = (e.point.y + 12) + "px";
    tooltipEl.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(name)}</div>
      <div>${label}: <b>${value == null ? "N/A" : value.toFixed(2)}</b></div>
      <div style="opacity:.75; margin-top:4px;">Click for details</div>
    `;
  });

  map.on("mouseleave", "uhi-fill", () => {
    map.getCanvas().style.cursor = "";
    tooltipEl.style.display = "none";
    hoverOID = null;
    map.setFilter("uhi-hover", ["==", ["get", FIELDS.id], -999999]);
  });

  map.on("click", "uhi-fill", (e) => {
    const f = e.features && e.features[0];
    if (!f) return;

    const p = f.properties || {};
    const name = p[FIELDS.name] ?? "(unknown)";
    const oid  = p[FIELDS.id];

    const html = `
      <div style="font-weight:800; font-size:14px; margin-bottom:6px;">
        ${escapeHtml(name)} <span style="opacity:.65;">(ID: ${escapeHtml(oid ?? "N/A")})</span>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        ${row("Mean temp", num(p[FIELDS.temp]), "°C")}
        ${row("Blue/Green cover", num(p[FIELDS.green]), "%")}
        ${row("Tree canopy", num(p[FIELDS.tree]), "%")}
        ${row("Income deprived", num(p[FIELDS.income]), "%")}
        ${row("PM2.5", num(p[FIELDS.pm25]), "µg/m³")}
        ${row("NO2", num(p[FIELDS.no2]), "µg/m³")}
        ${row("Flood risk", num(p[FIELDS.flood]), "%")}
        ${row("No open space access", num(p[FIELDS.noOpen]), "%")}
        ${row("Under 5", num(p[FIELDS.under5]), "%")}
        ${row("Over 75", num(p[FIELDS.over75]), "%")}
        ${row("Not proficient in English", num(p[FIELDS.notEnglish]), "%")}
        ${row("Social housing", num(p[FIELDS.social]), "%")}
        ${row("BAME", num(p[FIELDS.bame]), "%")}
      </table>
    `;

    new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function row(label, value, unit) {
  const v = value == null ? "N/A" : value.toFixed(2);
  const u = (value == null || !unit) ? "" : ` ${escapeHtml(unit)}`;
  return `
    <tr>
      <td style="padding:4px 6px; border-bottom:1px solid rgba(0,0,0,.08); opacity:.8;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:4px 6px; border-bottom:1px solid rgba(0,0,0,.08); text-align:right; font-weight:700;">
        ${v}${u}
      </td>
    </tr>
  `;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


/*******************************************************
 * Block 4: Layer toggle + Filters + Sliders + Buttons
 *******************************************************/
function initSliders() {
  const heatSlider = document.getElementById("heatSlider");
  const greenSlider = document.getElementById("greenSlider");
  const heatVal = document.getElementById("heatVal");
  const greenVal = document.getElementById("greenVal");
  
// Default thresholds set to P80 / P20 (users can still adjust)
  heatSlider.value = String(DEFAULT_THRESHOLDS.heatP80);   // approx hot threshold
  greenSlider.value = String(DEFAULT_THRESHOLDS.greenP20);   // approx low-green threshold

  heatVal.textContent = Number(heatSlider.value).toFixed(2);
  greenVal.textContent = Number(greenSlider.value).toFixed(2);

  heatSlider.addEventListener("input", () => {
    heatVal.textContent = Number(heatSlider.value).toFixed(2);
    applyFilter();
  });

  greenSlider.addEventListener("input", () => {
    greenVal.textContent = Number(greenSlider.value).toFixed(2);
    applyFilter();
  });
  
  // apply immediately so map starts consistent with defaults
  applyFilter();
}

function bindUI() {
  // Layer toggle
  document.querySelectorAll('input[name="layerMode"]').forEach((el) => {
    el.addEventListener("change", (e) => {
      currentMode = e.target.value;

      // Switch choropleth color expression
      map.setPaintProperty(
        "uhi-fill",
        "fill-color",
        currentMode === "temp" ? heatColorExpr() : greenColorExpr()
      );

      updateLegend();
      applyFilter(); // keep filter coherent
    });
  });

  // Filter dropdown
  document.getElementById("filterSelect").addEventListener("change", (e) => {
    currentFilter = e.target.value;
    applyFilter();
  });

  // Reset view button
  document.getElementById("resetBtn").addEventListener("click", () => {
    map.easeTo({ center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom, duration: 900 });
  });

  // Clear filter button
  document.getElementById("clearFilterBtn").addEventListener("click", () => {
    currentFilter = "none";
    document.getElementById("filterSelect").value = "none";
    applyFilter();
  });
  
  
  // Colour-blind mode toggle
document.getElementById("cbMode").addEventListener("change", (e) => {
  useColourBlind = e.target.checked;

  // Refresh choropleth paint
  map.setPaintProperty(
    "uhi-fill",
    "fill-color",
    currentMode === "temp" ? heatColorExpr() : greenColorExpr()
  );

  // Refresh legend
  updateLegend();
});

// One-click hotspots (P80/P20) button
document.getElementById("hotspotBtn").addEventListener("click", () => {

  // 1) Force filter dropdown to hotspot mode
  currentFilter = "hotLowGreen";
  document.getElementById("filterSelect").value = "hotLowGreen";

  // 2) Reset sliders to recommended defaults (P80 / P20)
  const heatSlider = document.getElementById("heatSlider");
  const greenSlider = document.getElementById("greenSlider");

  heatSlider.value = String(DEFAULT_THRESHOLDS.heatP80);
  greenSlider.value = String(DEFAULT_THRESHOLDS.greenP20);

  document.getElementById("heatVal").textContent =
    Number(heatSlider.value).toFixed(2);

  document.getElementById("greenVal").textContent =
    Number(greenSlider.value).toFixed(2);

  // 3) Apply filter (reuses your existing logic)
  applyFilter();

  // 4) Turn on hotspot outline
  map.setLayoutProperty("hotspot-outline", "visibility", "visible");
});

  
  // Search
  document.getElementById("searchBtn").addEventListener("click", () => {
    const q = document.getElementById("searchInput").value.trim();
    if (!q) return;
    zoomToNeighborhood(q);
  });

  document.getElementById("refreshListBtn").addEventListener("click", () => {
    refreshNeighborhoodList();
  });

  // Refresh search list after map stops moving (so list is always relevant)
  map.on("moveend", () => {
    refreshNeighborhoodList();
  });
}

function applyFilter() {
  const heatT = Number(document.getElementById("heatSlider").value);
  const greenT = Number(document.getElementById("greenSlider").value);

  let filter = null;

  if (currentFilter === "hot") {
    filter = [">=", ["to-number", ["get", FIELDS.temp]], heatT];
  } else if (currentFilter === "hotLowGreen") {
    filter = [
      "all",
      [">=", ["to-number", ["get", FIELDS.temp]], heatT],
      ["<=", ["to-number", ["get", FIELDS.green]], greenT]
    ];
  } else {
    filter = null;
  }

  map.setFilter("uhi-fill", filter);
  map.setFilter("uhi-outline", filter);

  // Clear hover highlight when filter changes
  map.setFilter("uhi-hover", ["==", ["get", FIELDS.id], -999999]);
  
  // Keep hotspot outline in sync 
  if (currentFilter === "hotLowGreen") {
    map.setFilter("hotspot-outline", filter);
    map.setLayoutProperty("hotspot-outline", "visibility", "visible");
  } else {
    map.setLayoutProperty("hotspot-outline", "visibility", "none");
    map.setFilter("hotspot-outline", ["==", ["get", FIELDS.id], -999999]);
  }
  
};

/*******************************************************
 * Block 5: Neighborhood search (built from rendered features)
 * Note: Vector tiles do not give a full dataset client-side,
 * so index what is currently rendered.
 *******************************************************/
function refreshNeighborhoodList() {
  const dl = document.getElementById("nbList");
  dl.innerHTML = "";

  // Query what is currently rendered in the fill layer
  const feats = map.queryRenderedFeatures({ layers: ["uhi-fill"] }) || [];
  const set = new Set();

  for (const f of feats) {
    const n = f.properties?.[FIELDS.name];
    if (n) set.add(String(n));
  }

  // Populate datalist
  [...set].sort().slice(0, 2000).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    dl.appendChild(opt);
  });
}

function zoomToNeighborhood(name) {
  // Try to find a matching feature among rendered features
  const feats = map.queryRenderedFeatures({ layers: ["uhi-fill"] }) || [];
  const target = feats.find(f => String(f.properties?.[FIELDS.name] ?? "").toLowerCase() === name.toLowerCase());

  if (!target) {
    alert("Not found in current view. Tip: zoom out and click 'Refresh list', then try again.");
    return;
  }

  const oid = Number(target.properties?.[FIELDS.id]);
  if (Number.isFinite(oid)) {
    map.setFilter("uhi-hover", ["==", ["get", FIELDS.id], oid]);
  }

  // Zoom to the clicked point
  map.flyTo({ center: target.geometry.coordinates?.[0]?.[0] ?? map.getCenter(), zoom: Math.max(map.getZoom(), 12), speed: 1.2 });
}


console.log("token head:", mapboxgl.accessToken?.slice(0, 3));

console.log(STYLE_URL);

map.on("error", (e) => {
  const err = e?.error;
  console.log("MAP ERROR message:", err?.message);
  console.log("MAP ERROR stack:", err?.stack);
  console.log("MAP ERROR resource:", e?.resource);
});