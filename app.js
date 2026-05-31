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

window.addEventListener("DOMContentLoaded", async () => {
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
  } catch (error) {
    console.error(error);
    document.getElementById("productTitle").textContent =
      "Unable to load market data";
  }
});

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
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
    `${SUPABASE_URL}/rest/v1/${tableName}?select=*&order=fecha.desc`,
    { headers: headers() }
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
          backgroundColor: "rgba(255,255,255,0.98)",
          titleColor: "#111827",
          bodyColor: "#374151",
          borderColor: "rgba(0,0,0,0.06)",
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
            color: "#9ca3af",
            autoSkip: false,
            callback: function(value, index) {
              return index % 60 === 0
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
            color: "rgba(0,0,0,0.05)"
          },
          border: {
            display: false
          },
          ticks: {
            color: "#6b7280",
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
            color: "rgba(17,24,39,0.25)",
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
              <span>${cleanName(ticker.name)}</span>
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
          <td><span class="variant-product">${cleanName(ticker.name)}</span></td>
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
    `${product.title} · ${cleanName(ticker.name)}`;

  document.getElementById("productPrice").textContent =
    formatNumber(stats.value);

  const changeEl = document.getElementById("productChange");
  changeEl.textContent = `${formatPercent(stats.day)} 1 day`;
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
      backgroundColor: "rgba(17,24,39,0.06)",
      borderWidth: 0,
      order: 3
    });
  }

  chart.data.datasets.push({
    label: ticker.short || cleanName(ticker.name),
    data: rawValues,
    borderColor: ticker.color,
    borderWidth: 2.4,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 12,
    tension: 0,
    fill: false,
    order: 1
  });

  chart.data.datasets.push({
    label: "Moving Average",
    data: movingAverage,
    borderColor: "rgba(17,24,39,0.24)",
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

  chart.update();
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
