// ==============================
// CONFIG
// ==============================
const SUPABASE_URL = "https://pqtbmnqsftqyvkhoszyy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdGJtbnFzZnRxeXZraG9zenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NjEyMDgsImV4cCI6MjA4MTIzNzIwOH0.fS2Wp0lp-GEJXVUpfhcaFRQzxtOY7nhJNjTlpkRxQtA";
const TABLE = "pistachio1";

// ==============================
// HITOS (MILESTONES)
// ==============================
const hitos = [
  { fecha: '2023-10-02', texto: 'Op. C23' },
  { fecha: '2024-09-30', texto: 'Op. C24' },
  { fecha: '2025-09-29', texto: 'Op. C25' }
];

// ==============================
// STATE
// ==============================
let globalData = [];
let activeColumns = ["usdlb_std"];
let chart = null;
let resizeObserver = null;
let resizeTimeout = null;

// ==============================
// DEBOUNCE UTILITY
// ==============================
function debounce(func, delay) {
  return function (...args) {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof Chart === "undefined") {
    console.error("Chart.js no cargado");
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
  updateUI();
});

// ==============================
// CLEANUP ON UNLOAD
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

// ==============================
// FETCH DATA
// ==============================
async function fetchData() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=fecha.desc&limit=5000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Supabase error:", data);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.error("Empty dataset");
      return;
    }

    globalData = data
      .filter(d => d.fecha)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// ==============================
// UI LOADING STATE
// ==============================
function showLoadingState() {
  document.getElementById("productTitle").textContent = "Loading...";
  document.getElementById("productPrice").textContent = "-";
  document.getElementById("productChange").textContent = "";
}

// ==============================
// SETUP TICKERS
// ==============================
function setupTickers() {
  const tickers = document.querySelectorAll(".ticker");

  tickers.forEach((t, index) => {
    const labelEl = t.querySelector(".label");

    if (labelEl && t.dataset.name) {
      labelEl.textContent = t.dataset.name;
    }

    // Keyboard navigation
    t.addEventListener("keydown", (e) => {
      let nextIndex = index;
      
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (index + 1) % tickers.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (index - 1 + tickers.length) % tickers.length;
      }
      
      if (nextIndex !== index) {
        tickers[nextIndex].focus();
      }
    });

    // Click handler
    t.addEventListener("click", () => toggleTicker(t));
    t.addEventListener("keypress", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggleTicker(t);
      }
    });
  });
}

// ==============================
// TOGGLE TICKER
// ==============================
function toggleTicker(ticker) {
  const col = ticker.dataset.column;

  if (activeColumns.includes(col)) {
    activeColumns = activeColumns.filter(c => c !== col);
    ticker.classList.remove("active");
  } else {
    activeColumns.push(col);
    ticker.classList.add("active");
  }

  if (activeColumns.length === 0) {
    activeColumns = [col];
    ticker.classList.add("active");
  }

  updateUI();
}

// ==============================
// CALCULATE SMA (SIMPLE MOVING AVERAGE)
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
      const v = values[i - j];
      if (v !== null && !isNaN(v)) {
        sum += v;
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
  const ctx = document.getElementById("currencyChart").getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        annotation: { annotations: {} },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
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
          grid: { display: false }
        },
        y: {
          position: "right",
          grace: "30%",
          ticks: {
            stepSize: 0.10,
            callback: v => Number(v).toFixed(2)
          }
        },
        yLeft: {
          position: "left",
          min: 0,
          max: 1500000,
          grace: 0,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            stepSize: 100000,
            callback: value => value.toLocaleString('es-ES') + " MT"
          }
        }
      }
    }
  });
}

// ==============================
// SETUP RESIZE OBSERVER
// ==============================
function setupResizeObserver() {
  const chartWrapper = document.querySelector('.chart-wrapper');
  
  const debouncedUpdate = debounce(() => {
    if (chart) {
      chart.resize();
    }
  }, 250);

  resizeObserver = new ResizeObserver(debouncedUpdate);
  resizeObserver.observe(chartWrapper);
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart() {
  if (!chart || !globalData.length) return;

  const sorted = [...globalData].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const lastDate = new Date(sorted[sorted.length - 1].fecha);
  const minDate = new Date(lastDate);
  minDate.setFullYear(minDate.getFullYear() - 4);

  let filtered = sorted.filter(d => {
    const date = new Date(d.fecha);
    return !isNaN(date) && date >= minDate;
  });

  filtered = filtered.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const lastDataPoint = sorted[sorted.length - 1];

  if (lastDataPoint && !filtered.find(d => d.fecha === lastDataPoint.fecha)) {
    filtered.push(lastDataPoint);
  }

  filtered = filtered.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  chart.data.labels = filtered.map(d => d.fecha);
  chart.data.datasets = [];

  // STOCK DATA
  const stockValues = filtered.map(d => {
    const v = Number(d.stock_MT);
    return isNaN(v) ? null : v;
  });

  chart.data.datasets.push({
    type: "bar",
    label: "Stock MT",
    data: stockValues,
    yAxisID: "yLeft",
    backgroundColor: "rgba(18,21,28,0.015)",
    borderColor: "rgba(18,21,28,0.10)",
    borderWidth: 1.2,
    barPercentage: 0.5,
    categoryPercentage: 0.7,
    order: 2
  });

  // ACTIVE COLUMNS
  activeColumns.forEach((col, i) => {
    const ticker = document.querySelector(`.ticker[data-column="${col}"]`);
    const label = ticker ? ticker.dataset.name : col;

    const values = filtered.map(d => {
      const v = Number(d[col]);
      return isNaN(v) ? null : v;
    });

    chart.data.datasets.push({
      label: label,
      data: values,
      borderWidth: 1.5,
      tension: 0.2,
      pointRadius: 0,
      borderColor: i === 0 ? "#12151c" : "#dc2626"
    });

    const sma = calculateSMA(values, 90);

    chart.data.datasets.push({
      label: label + " SMA(3M)",
      data: sma,
      borderWidth: 1,
      borderDash: [5, 5],
      tension: 0.2,
      pointRadius: 0,
      borderColor: "rgba(0,0,0,0.35)"
    });
  });

  // ANNOTATIONS (MILESTONES)
  const annotations = {};

  hitos.forEach((h, i) => {
    const point = sorted.find(d => d.fecha === h.fecha);
    if (!point) return;

    const y = Number(point[activeColumns[0]]);
    if (isNaN(y)) return;

    annotations[`line_${i}`] = {
      type: "line",
      xMin: h.fecha,
      xMax: h.fecha,
      borderColor: "rgba(220,38,38,0.25)",
      borderWidth: 1
    };

    annotations[`point_${i}`] = {
      type: "point",
      xValue: h.fecha,
      yValue: y,
      backgroundColor: "#dc2626",
      radius: 4
    };

    annotations[`label_${i}`] = {
      type: "label",
      xValue: h.fecha,
      yValue: y,
      content: `${h.texto} · ${y.toFixed(2)}`,
      backgroundColor: "rgba(255,255,255,0)",
      borderWidth: 0,
      color: "#dc2626",
      font: { size: 10 },
      padding: 4,
      yAdjust: -12
    };
  });

  chart.options.plugins.annotation = {
    annotations: annotations,
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
  const prevValue = prev ? Number(prev[col]) : value;

  const ticker = document.querySelector(`.ticker[data-column="${col}"]`);
  const label = ticker ? ticker.dataset.name : col;

  document.getElementById("productTitle").textContent = label;
  document.getElementById("productPrice").textContent = value.toFixed(2);

  const change = ((value - prevValue) / prevValue) * 100;
  const isPositive = change >= 0;

  const changeEl = document.getElementById("productChange");
  changeEl.textContent = `${isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`;
  changeEl.className = `change ${isPositive ? "down" : "up"}`;
}

// ==============================
// KEYBOARD SHORTCUTS
// ==============================
document.addEventListener("keydown", (e) => {
  // Reset zoom on 'r' key
  if (e.key === "r" && e.ctrlKey === false && e.metaKey === false && chart) {
    chart.resetZoom();
  }
});
