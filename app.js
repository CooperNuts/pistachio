// ==============================
// CONFIG
// ==============================
const SUPABASE_URL = "https://pqtbmnqsftqyvkhoszyy.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJw..." // <- tu key completa aquí

const TABLE = "pistachio1";

// ==============================
// HITOS
// ==============================
const hitos = [
  { fecha: '2023-10-02', texto: 'Op. C23' },
  { fecha: '2024-09-30', texto: 'Op. C24' },
  { fecha: '2025-09-29', texto: 'Op. C25' }
];

// ==============================
// COLORS
// ==============================
const COLORS = {
  usdlb_std: '#111827',
  usdlb_large: '#2563eb',
  usdlb_kernel: '#16a34a',
  eurkg_es2125: '#7c3aed',
  eurkg_eskernel: '#ea580c'
};

// ==============================
// STATE
// ==============================
let globalData = [];
let activeColumns = ['usdlb_std'];

let chart = null;
let resizeObserver = null;
let resizeTimeout = null;

// ==============================
// DEBOUNCE
// ==============================
function debounce(func, delay) {
  return function (...args) {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// ==============================
// INIT
// ==============================
window.addEventListener("DOMContentLoaded", async () => {

  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded");
    return;
  }

  showLoadingState();

  await fetchData();

  if (!globalData.length) {
    console.error("No data loaded");
    return;
  }

  setupTickers();
  setupChart();
  setupResizeObserver();

  updateTickerValues();
  updateUI();
});

// ==============================
// FETCH DATA
// ==============================
async function fetchData() {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=fecha.asc&limit=5000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Supabase error:", data);
      return;
    }

    if (!Array.isArray(data) || !data.length) {
      console.error("Empty dataset");
      return;
    }

    globalData = data
      .filter(item => item.fecha)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// ==============================
// LOADING STATE
// ==============================
function showLoadingState() {

  document.getElementById("productTitle").textContent = "Loading...";
  document.getElementById("productPrice").textContent = "--";
  document.getElementById("productChange").textContent = "";
}

// ==============================
// TICKERS
// ==============================
function setupTickers() {

  const tickers = document.querySelectorAll(".ticker-card");

  tickers.forEach((ticker, index) => {

    ticker.addEventListener("click", () => {
      setActiveTicker(ticker);
    });

    ticker.addEventListener("keydown", (e) => {

      let nextIndex = index;

      if (e.key === "ArrowRight") {
        nextIndex = (index + 1) % tickers.length;
      }

      if (e.key === "ArrowLeft") {
        nextIndex = (index - 1 + tickers.length) % tickers.length;
      }

      if (nextIndex !== index) {
        tickers[nextIndex].focus();
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setActiveTicker(ticker);
      }
    });
  });
}

// ==============================
// SET ACTIVE TICKER
// ==============================
function setActiveTicker(ticker) {

  document.querySelectorAll(".ticker-card").forEach(t => {
    t.classList.remove("active");
  });

  ticker.classList.add("active");

  activeColumns = [ticker.dataset.column];

  updateUI();
}

// ==============================
// UPDATE TICKER VALUES
// ==============================
function updateTickerValues() {

  if (!globalData.length) return;

  const latest = globalData[globalData.length - 1];

  document.querySelectorAll(".ticker-card").forEach(card => {

    const col = card.dataset.column;

    const value = Number(latest[col]);

    const valueEl = card.querySelector(".ticker-value");

    if (!isNaN(value)) {
      valueEl.textContent = value.toFixed(2);
    }
  });
}

// ==============================
// SMA
// ==============================
function calculateSMA(values, period = 90) {

  const result = [];

  for (let i = 0; i < values.length; i++) {

    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    let count = 0;

    for (let j = 0; j < period; j++) {

      const value = values[i - j];

      if (value !== null && !isNaN(value)) {
        sum += value;
        count++;
      }
    }

    result.push(count ? sum / count : null);
  }

  return result;
}

// ==============================
// SETUP CHART
// ==============================
function setupChart() {

  const ctx = document
    .getElementById("currencyChart")
    .getContext("2d");

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
        duration: 500
      },

      layout: {
        padding: {
          top: 24,
          right: 20,
          left: 10,
          bottom: 10
        }
      },

      plugins: {

        legend: {
          display: false
        },

        annotation: {
          annotations: {}
        },

        tooltip: {

          backgroundColor: "rgba(255,255,255,0.98)",

          titleColor: "#111827",
          bodyColor: "#374151",

          borderColor: "rgba(0,0,0,0.06)",
          borderWidth: 1,

          padding: 14,

          displayColors: true,

          titleFont: {
            family: "Manrope",
            size: 13,
            weight: "700"
          },

          bodyFont: {
            family: "Manrope",
            size: 13,
            weight: "600"
          },

          callbacks: {
            label: function(context) {

              let label = context.dataset.label || "";

              if (label) {
                label += ": ";
              }

              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2);
              }

              return label;
            }
          }
        }
      },

      scales: {

        x: {

          grid: {
            display: false
          },

          border: {
            display: false
          },

          ticks: {

            color: "#9ca3af",

            font: {
              family: "Manrope",
              size: 11,
              weight: "600"
            }
          }
        },

        y: {

          position: "right",

          grace: "20%",

          grid: {
            color: "rgba(0,0,0,0.05)",
            drawBorder: false
          },

          border: {
            display: false
          },

          ticks: {

            color: "#6b7280",

            stepSize: 0.10,

            font: {
              family: "Manrope",
              size: 11,
              weight: "600"
            },

            callback: value => Number(value).toFixed(2)
          }
        },

        yLeft: {

          position: "left",

          min: 0,
          max: 1500000,

          grid: {
            drawOnChartArea: false
          },

          border: {
            display: false
          },

          ticks: {

            color: "#d1d5db",

            stepSize: 100000,

            font: {
              family: "Manrope",
              size: 10,
              weight: "600"
            },

            callback: value =>
              value.toLocaleString("es-ES") + " MT"
          }
        }
      }
    }
  });
}

// ==============================
// RESIZE OBSERVER
// ==============================
function setupResizeObserver() {

  const wrapper = document.querySelector(".chart-wrapper");

  const debouncedResize = debounce(() => {

    if (chart) {
      chart.resize();
    }

  }, 250);

  resizeObserver = new ResizeObserver(debouncedResize);

  resizeObserver.observe(wrapper);
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart() {

  if (!chart || !globalData.length) return;

  const sorted = [...globalData]
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  chart.data.labels = sorted.map(d => d.fecha);

  chart.data.datasets = [];

  // ==========================
  // STOCK DATA
  // ==========================
  const stockValues = sorted.map(d => {

    const value = Number(d.stock_MT);

    return isNaN(value) ? null : value;
  });

  chart.data.datasets.push({

    type: "bar",

    label: "Stock MT",

    data: stockValues,

    yAxisID: "yLeft",

    backgroundColor: "rgba(17,24,39,0.02)",

    borderWidth: 0,

    barPercentage: 0.5,

    categoryPercentage: 0.7,

    order: 2
  });

  // ==========================
  // MAIN DATASET
  // ==========================
  activeColumns.forEach(col => {

    const ticker = document.querySelector(
      `.ticker-card[data-column="${col}"]`
    );

    const label = ticker
      ? ticker.dataset.name
      : col;

    const values = sorted.map(d => {

      const value = Number(d[col]);

      return isNaN(value) ? null : value;
    });

    chart.data.datasets.push({

      label,

      data: values,

      borderWidth: 1.8,

      tension: 0.25,

      pointRadius: 0,

      borderColor: COLORS[col],

      fill: false,

      order: 1
    });

    // ========================
    // SMA
    // ========================
    const sma = calculateSMA(values, 90);

    chart.data.datasets.push({

      label: `${label} SMA`,

      data: sma,

      borderWidth: 1,

      borderDash: [5, 5],

      tension: 0.25,

      pointRadius: 0,

      borderColor: "rgba(17,24,39,0.18)",

      order: 1
    });
  });

  // ==========================
  // ANNOTATIONS
  // ==========================
  const annotations = {};

  hitos.forEach((hito, i) => {

    const point = sorted.find(
      d => d.fecha === hito.fecha
    );

    if (!point) return;

    const y = Number(point[activeColumns[0]]);

    if (isNaN(y)) return;

    annotations[`line_${i}`] = {

      type: "line",

      xMin: hito.fecha,
      xMax: hito.fecha,

      borderColor: "rgba(220,38,38,0.12)",

      borderWidth: 1
    };

    annotations[`point_${i}`] = {

      type: "point",

      xValue: hito.fecha,
      yValue: y,

      backgroundColor: "#dc2626",

      radius: 3
    };

    annotations[`label_${i}`] = {

      type: "label",

      xValue: hito.fecha,
      yValue: y,

      content: `${hito.texto} · ${y.toFixed(2)}`,

      backgroundColor: "rgba(255,255,255,0)",

      borderWidth: 0,

      color: "#dc2626",

      font: {
        size: 10,
        family: "Manrope",
        weight: "700"
      },

      padding: 4,

      yAdjust: -12
    };
  });

  chart.options.plugins.annotation = {
    annotations,
    drawTime: "afterDatasetsDraw"
  };

  chart.update();
}

// ==============================
// UPDATE UI
// ==============================
function updateUI() {

  if (!globalData.length) return;

  updateChart();

  const latest = globalData[globalData.length - 1];

  const prev = globalData[globalData.length - 2];

  const col = activeColumns[0];

  const value = Number(latest[col]);

  const prevValue = prev
    ? Number(prev[col])
    : value;

  const ticker = document.querySelector(
    `.ticker-card[data-column="${col}"]`
  );

  const label = ticker
    ? ticker.dataset.name
    : col;

  document.getElementById("productTitle").textContent = label;

  document.getElementById("productPrice").textContent =
    value.toFixed(2);

  const change =
    ((value - prevValue) / prevValue) * 100;

  const isPositive = change >= 0;

  const changeEl =
    document.getElementById("productChange");

  changeEl.textContent =
    `${isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}% today`;

  changeEl.style.color =
    isPositive
      ? "#16a34a"
      : "#dc2626";
}

// ==============================
// CLEANUP
// ==============================
window.addEventListener("unload", () => {

  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  if (chart) {
    chart.destroy();
  }

  clearTimeout(resizeTimeout);
});
