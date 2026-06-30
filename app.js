/* ==========================================
   ALLNUTS.TECH
========================================== */

const SUPABASE_URL =
  "https://pqtbmnqsftqyvkhoszyy.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdGJtbnFzZnRxeXZraG9zenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NjEyMDgsImV4cCI6MjA4MTIzNzIwOH0.fS2Wp0lp-GEJXVUpfhcaFRQzxtOY7nhJNjTlpkRxQtA";

const PRODUCT_HITOS = {
  pistachio: [
    { fecha: "2023-10-02", texto: "Op. C23" },
    { fecha: "2024-09-30", texto: "Op. C24" },
    { fecha: "2025-09-29", texto: "Op. C25" }
  ]
};

let products = {};
let productOrder = [];
let dataByTable = {};
let currentCategory = null;
let activeTicker = null;
let chart = null;
let marketDataLoaded = false;
let pendingEmail = "";
let accessToken = SUPABASE_KEY;

const supabaseClient = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  setupAuth();
});

function setupTheme() {
  const savedTheme = localStorage.getItem("allnuts-theme") || "dark";
  setTheme(savedTheme);

  const toggle = document.getElementById("themeToggle");

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const nextTheme = currentTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("allnuts-theme", nextTheme);

    if (currentCategory && activeTicker && products[currentCategory]) {
      renderSelectedTicker(products[currentCategory], activeTicker);
    } else {
      applyChartTheme();
    }
  });
}

function currentTheme() {
  return document.documentElement.dataset.theme || "dark";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");

  const toggleText = document.getElementById("themeToggleText");

  if (toggleText) {
    toggleText.textContent = theme === "dark" ? "Light" : "Dark";
  }
}

function chartPalette() {
  const dark = currentTheme() === "dark";

  return {
    tooltipBg: dark ? "rgba(29,29,31,0.98)" : "rgba(255,255,255,0.98)",
    tooltipTitle: dark ? "#f5f5f7" : "#111827",
    tooltipBody: dark ? "#c7c7cc" : "#374151",
    tooltipBorder: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
    xTick: dark ? "rgba(245,245,247,0.58)" : "rgba(17,24,39,0.42)",
    yTick: dark ? "rgba(245,245,247,0.62)" : "rgba(17,24,39,0.56)",
    yLeftTick: dark ? "rgba(245,245,247,0.34)" : "rgba(17,24,39,0.28)",
    grid: dark ? "rgba(255,255,255,0.085)" : "rgba(17,24,39,0.055)",
    stock: dark ? "rgba(245,245,247,0.07)" : "rgba(17,24,39,0.065)",
    average: dark ? "rgba(245,245,247,0.38)" : "rgba(17,24,39,0.24)"
  };
}

function applyChartTheme(shouldUpdate = true) {
  if (!chart) return;

  const palette = chartPalette();

  chart.options.plugins.tooltip.backgroundColor = palette.tooltipBg;
  chart.options.plugins.tooltip.titleColor = palette.tooltipTitle;
  chart.options.plugins.tooltip.bodyColor = palette.tooltipBody;
  chart.options.plugins.tooltip.borderColor = palette.tooltipBorder;
  chart.options.scales.x.ticks.color = palette.xTick;
  chart.options.scales.y.grid.color = palette.grid;
  chart.options.scales.y.ticks.color = palette.yTick;
  chart.options.scales.yLeft.ticks.color = palette.yLeftTick;

  chart.data.datasets.forEach((dataset) => {
    if (dataset.type === "bar") {
      dataset.backgroundColor = palette.stock;
    }

    if (dataset.baseColor) {
      dataset.borderColor = chartLineColor(dataset.baseColor);
      dataset.pointHoverBackgroundColor = chartLineColor(dataset.baseColor);
      dataset.pointHoverBorderColor = currentTheme() === "dark"
        ? "#050505"
        : "#ffffff";
    }

    if (dataset.label === "Moving Average") {
      dataset.borderColor = palette.average;
    }
  });

  if (shouldUpdate) {
    chart.update();
  }
}

async function setupAuth() {
  const authScreen = document.getElementById("authScreen");
  const appShell = document.getElementById("appShell");
  const emailForm = document.getElementById("emailForm");
  const codeForm = document.getElementById("codeForm");
  const emailInput = document.getElementById("email");
  const codeInput = document.getElementById("code");

  if (!supabaseClient) {
    setAuthStatus("Unable to load access service. Please refresh the page.", "error");
    return;
  }

  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    accessToken = data.session.access_token;
    showApp(authScreen, appShell);
    await initMarketData();
    return;
  }

  authScreen.hidden = false;
  appShell.hidden = true;

  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    pendingEmail = emailInput.value.trim();
    setAuthStatus("Sending code...");

    const { error } = await supabaseClient.auth.signInWithOtp({
      email: pendingEmail,
      options: {
        shouldCreateUser: true
      }
    });

    if (error) {
      setAuthStatus(error.message, "error");
      return;
    }

    emailForm.hidden = true;
    codeForm.hidden = false;
    codeInput.focus();
    setAuthStatus("Code sent. Check your email.", "ok");
  });

  codeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthStatus("Checking code...");

    const { data: verifyData, error } = await supabaseClient.auth.verifyOtp({
      email: pendingEmail,
      token: codeInput.value.trim(),
      type: "email"
    });

    if (error) {
      setAuthStatus(error.message, "error");
      return;
    }

    accessToken = verifyData.session?.access_token || SUPABASE_KEY;
    showApp(authScreen, appShell);
    await initMarketData();
  });
}

function showApp(authScreen, appShell) {
  authScreen.hidden = true;
  appShell.hidden = false;
}

function setAuthStatus(message, type = "") {
  const status = document.getElementById("authStatus");
  status.textContent = message;
  status.className = `auth-status ${type}`;
}

async function initMarketData() {
  if (marketDataLoaded) return;

  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded");
    return;
  }

  setNextUpdate();
  setupChart();

  try {
    await loadProductsConfig();
    await loadAllPriceTables();
    renderCategories();

    currentCategory = productOrder[0];
    activeTicker = products[currentCategory].tickers[0];
    selectCategory(currentCategory);
    marketDataLoaded = true;
  } catch (error) {
    console.error(error);
    document.getElementById("productTitle").textContent =
      "Unable to load market data";
  }
}

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

async function loadProductsConfig() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products_config?is_active=eq.true&order=category_name.asc,sort_order.asc`,
    { headers: headers() }
  );

  const rows = await response.json();

  if (!response.ok || !Array.isArray(rows)) {
    throw new Error("Could not load products_config");
  }

  products = {};

  rows.forEach((row) => {
    if (!products[row.category_key]) {
      products[row.category_key] = {
        key: row.category_key,
        title: row.category_name,
        table: row.table_name,
        hitos: PRODUCT_HITOS[row.category_key] || [],
        tickers: []
      };
    }

    products[row.category_key].tickers.push({
      column: row.column_name,
      name: row.product_name,
      short: row.short_name,
      unit: row.unit,
      color: row.color || "#111827",
      sortOrder: row.sort_order
    });
  });

  productOrder = Object.keys(products).sort((a, b) =>
    products[a].title.localeCompare(products[b].title)
  );

  if (!productOrder.length) {
    throw new Error("products_config is empty");
  }
}

async function loadAllPriceTables() {
  const uniqueTables = [
    ...new Set(productOrder.map((key) => products[key].table))
  ];

  await Promise.all(uniqueTables.map(fetchPriceTable));
}

async function fetchPriceTable(tableName) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${tableName}?select=*&fecha=gte.2023-07-01&order=fecha.desc`,
    {
      headers: {
        ...headers(),
        Range: "0-5000"
      }
    }
  );

  const rows = await response.json();

  if (!response.ok || !Array.isArray(rows)) {
    throw new Error(`Could not load ${tableName}`);
  }

  dataByTable[tableName] = rows
    .filter((item) => item.fecha)
    .filter((item) => !Number.isNaN(new Date(item.fecha).getTime()));
}

function setupChart() {
  const canvas = document.getElementById("currencyChart");
  const ctx = canvas.getContext("2d");
  const palette = chartPalette();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      animation: {
        duration: 450
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: palette.tooltipBg,
          titleColor: palette.tooltipTitle,
          bodyColor: palette.tooltipBody,
          borderColor: palette.tooltipBorder,
          borderWidth: 0.8,
          padding: 14,
          displayColors: true,
          callbacks: {
            title: (items) => items[0]?.label || "",
            label: (item) =>
              `${item.dataset.label}: ${formatNumber(item.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          reverse: true,
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            color: palette.xTick,
            autoSkip: false,
            callback: function(value, index) {
              return index % 45 === 0
                ? formatAxisDate(this.getLabelForValue(value))
                : "";
            },
            maxRotation: 0,
            minRotation: 0
          }
        },
        y: {
          position: "right",
          grace: "10%",
          grid: {
            color: palette.grid
          },
          border: {
            display: false
          },
          ticks: {
            color: palette.yTick,
            stepSize: 0.05,
            callback: (value) => Number(value).toFixed(2)
          }
        },
        yLeft: {
          position: "left",
          max: 1000000,
          display: true,
          grid: {
            drawOnChartArea: false
          },
          border: {
            display: false
          },
          ticks: {
            color: palette.yLeftTick,
            callback: (value) => `${Number(value) / 1000}k`
          }
        }
      }
    }
  });
}

function renderCategories() {
  const container = document.getElementById("categoryList");

  container.innerHTML = productOrder
    .map((key) => {
      const product = products[key];
      const ticker = product.tickers[0];
      const stats = statsFor(product, ticker);

      return `
        <button class="category-button" type="button" data-category="${key}">
          <span class="product">
            <span class="swatch" style="background:${swatchBackground(ticker.color)}"></span>
            <span>
              <strong>${product.title}</strong>
              <span>${ticker.name}</span>
            </span>
          </span>
          <span class="category-value">
            <strong>${formatNumber(stats.value)}</strong>
            <span class="chip ${chipClass(stats.day)}">${formatPercent(stats.day)}</span>
          </span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".category-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectCategory(button.dataset.category);
    });
  });
}

function selectCategory(categoryKey) {
  currentCategory = categoryKey;
  const product = products[categoryKey];
  activeTicker = product.tickers[0];

  document.querySelectorAll(".category-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === categoryKey);
  });

  renderDetail(product, activeTicker);
}

function renderDetail(product, selectedTicker) {
  const mainStats = statsFor(product, selectedTicker);

  document.getElementById("detailCategory").textContent = product.title;
  document.getElementById("detailPrice").textContent = mainStats.price;
  document.getElementById("detailDay").textContent =
    formatPercent(mainStats.day);
  document.getElementById("detailThreeMonths").textContent =
    formatPercent(mainStats.threeMonths);

  document.getElementById("productRows").innerHTML = product.tickers
    .map((ticker) => {
      const stats = statsFor(product, ticker);
      const active = ticker.column === selectedTicker.column ? "active" : "";

      return `
        <tr class="${active}" data-column="${ticker.column}">
          <td><span class="variant-product">${ticker.name}</span></td>
          <td class="price-cell">${stats.price}</td>
          <td><span class="chip ${chipClass(stats.day)}">${formatPercent(stats.day)}</span></td>
          <td class="price-cell">${formatPercent(stats.threeMonths)}</td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("#productRows tr").forEach((row) => {
    row.addEventListener("click", () => {
      const ticker = product.tickers.find(
        (item) => item.column === row.dataset.column
      );

      activeTicker = ticker;

      document.querySelectorAll("#productRows tr").forEach((item) => {
        item.classList.toggle("active", item === row);
      });

      renderSelectedTicker(product, ticker);
    });
  });

  renderSelectedTicker(product, selectedTicker);
}

function renderSelectedTicker(product, ticker) {
  const stats = statsFor(product, ticker);

  document.getElementById("productTitle").textContent =
    `${product.title} · ${ticker.name}`;

  document.getElementById("productPrice").textContent =
    stats.price;

  const changeEl = document.getElementById("productChange");
  changeEl.textContent = `${formatTopChange(stats.day)} 1 day`;
  changeEl.className = `change ${chipClass(stats.day)}`;

  document.getElementById("detailPrice").textContent = stats.price;
  document.getElementById("detailDay").textContent =
    formatPercent(stats.day);
  document.getElementById("detailThreeMonths").textContent =
    formatPercent(stats.threeMonths);

  updateChart(product, ticker);
}

function updateChart(product, ticker) {
  const data = dataByTable[product.table] || [];
  const palette = chartPalette();

  const labels = data.map((row) => row.fecha);
  const rawValues = data.map((row) => {
    const value = parseFloat(row[ticker.column]);
    return Number.isFinite(value) ? value : null;
  });

  const movingAverage = rawValues.map((_, index) => {
    const windowValues = rawValues
      .slice(Math.max(0, index - 89), index + 1)
      .filter((value) => value !== null);

    return windowValues.length
      ? windowValues.reduce((sum, value) => sum + value, 0) /
          windowValues.length
      : null;
  });

  const stockValues = data.map((row) => {
    const value = Number(row.stock_MT);
    return Number.isFinite(value) ? value : null;
  });

  const hasStock = stockValues.some((value) => value !== null);

  chart.data.labels = labels;
  chart.data.datasets = [];
  chart.options.scales.yLeft.display = hasStock;

  if (hasStock) {
    chart.data.datasets.push({
      type: "bar",
      label: "Stock MT",
      data: stockValues,
      yAxisID: "yLeft",
      backgroundColor: palette.stock,
      borderWidth: 0,
      order: 3
    });
  }

  chart.data.datasets.push({
    label: ticker.short || ticker.name,
    data: rawValues,
    baseColor: ticker.color,
    borderColor: chartLineColor(ticker.color),
    borderWidth: currentTheme() === "dark" ? 2.4 : 2.0,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 12,
    pointHoverBackgroundColor: chartLineColor(ticker.color),
    pointHoverBorderColor: currentTheme() === "dark" ? "#050505" : "#ffffff",
    pointHoverBorderWidth: 2,
    tension: 0,
    fill: false,
    order: 1
  });

  chart.data.datasets.push({
    label: "Moving Average",
    data: movingAverage,
    borderColor: palette.average,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 0,
    tension: 0,
    fill: false,
    borderDash: [6, 6],
    order: 2
  });

  chart.options.plugins.annotation = {
    annotations: buildAnnotations(product, labels, rawValues)
  };

  applyChartTheme(false);
  chart.update();
}

function chartLineColor(color) {
  if (currentTheme() !== "dark") {
    return darkenColor(color || "#111827", 8);
  }

  return lightenColor(color || "#111827", 48);
}

function buildAnnotations(product, labels, rawValues) {
  const annotations = {};
  const validValues = rawValues.filter((value) => value !== null);
  const maxValue = Math.max(...validValues);
  const minValue = Math.min(...validValues);
  const labelY = maxValue + (maxValue - minValue || 1) * 0.08;

  product.hitos?.forEach((hito) => {
    const index = labels.findIndex((label) => label === hito.fecha);

    if (index === -1) return;

    const price = rawValues[index];

    annotations[`line_${hito.fecha}`] = {
      type: "line",
      xMin: index,
      xMax: index,
      borderColor: "rgba(239,68,68,0.14)",
      borderWidth: 1.4,
      drawTime: "beforeDatasetsDraw"
    };

    annotations[`label_${hito.fecha}`] = {
      type: "label",
      xValue: index,
      yValue: labelY,
      content: [
        hito.texto,
        hito.fecha,
        price !== null && price !== undefined ? price.toFixed(2) : "--"
      ],
      backgroundColor: "rgba(239,68,68,0)",
      color: "#ef4444",
      font: {
        size: 11,
        weight: "600"
      },
      textAlign: "left",
      xAdjust: 6,
      yAdjust: 8
    };
  });

  return annotations;
}

function statsFor(product, ticker) {
  const data = dataByTable[product.table] || [];
  const latest = data[0] || {};
  const previous = data[1] || latest;
  const old = data.length ? threeMonthsRow(data, latest.fecha) : latest;
  const value = Number(latest[ticker.column]);
  const previousValue = Number(previous[ticker.column]);
  const oldValue = Number(old[ticker.column]);

  return {
    value,
    day: percentChange(value, previousValue),
    threeMonths: percentChange(value, oldValue),
    price: `${formatNumber(value)} ${ticker.unit}`.trim()
  };
}

function threeMonthsRow(data, latestDate) {
  const target = new Date(latestDate);
  target.setMonth(target.getMonth() - 3);

  return (
    data.reduce((best, row) => {
      const rowTime = new Date(row.fecha).getTime();
      const bestTime = best ? new Date(best.fecha).getTime() : -Infinity;

      return rowTime <= target.getTime() && rowTime > bestTime ? row : best;
    }, null) || data[data.length - 1]
  );
}

function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";

  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded.toFixed(1)}%`;
}

function formatTopChange(value) {
  if (!Number.isFinite(value)) return "--";

  const rounded = Math.abs(value) < 0.05 ? 0 : value;

  if (rounded > 0) {
    return `▲ ${formatPercent(rounded)}`;
  }

  if (rounded < 0) {
    return `▼ ${formatPercent(rounded)}`;
  }

  return formatPercent(rounded);
}

function chipClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
    return "neutral";
  }

  return value < 0 ? "down" : "up";
}

function cleanName(name) {
  return name
    .replace(/\s?(USD\/LB|USD\/KG|USDLB|USDKG|EURKG|EUR\/KG)\b/g, "")
    .replace(/\s?CFR Europe\b/g, "")
    .trim();
}

function formatAxisDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit"
  });
}

function setNextUpdate() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const label =
    formatter.format(now) + " · 23:59 Spanish time";
  const lastUpdateLabel =
    formatter.format(yesterday) + " · 23:59 Spanish time";

  document.getElementById("topUpdate").textContent =
    `Last update: ${lastUpdateLabel}`;
  document.getElementById("nextUpdateBottom").textContent =
    `Next update: ${label}`;
}

function swatchBackground(color) {
  return `linear-gradient(145deg, ${color}, ${lightenColor(color, 38)})`;
}

function lightenColor(hex, percent) {
  const normalized = hex.replace("#", "");
  const number = parseInt(normalized, 16);
  const amount = Math.round(2.55 * percent);
  const r = Math.min(255, (number >> 16) + amount);
  const g = Math.min(255, ((number >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (number & 0x0000ff) + amount);

  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b)
    .toString(16)
    .slice(1)}`;
}

function darkenColor(hex, percent) {
  const normalized = hex.replace("#", "");
  const number = parseInt(normalized, 16);
  const amount = Math.round(2.55 * percent);
  const r = Math.max(0, (number >> 16) - amount);
  const g = Math.max(0, ((number >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (number & 0x0000ff) - amount);

  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b)
    .toString(16)
    .slice(1)}`;
}
