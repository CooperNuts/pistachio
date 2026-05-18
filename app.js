/* ==========================================
   ALLNUTS.TECH
   COMPLETE PRODUCTION JS
========================================== */

/* ==========================================
   SUPABASE CONFIG
========================================== */

const SUPABASE_URL =
  "https://pqtbmnqsftqyvkhoszyy.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdGJtbnFzZnRxeXZraG9zenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NjEyMDgsImV4cCI6MjA4MTIzNzIwOH0.fS2Wp0lp-GEJXVUpfhcaFRQzxtOY7nhJNjTlpkRxQtA";

/* ==========================================
   PRODUCTS CONFIG
========================================== */

const PRODUCTS = {

  /* ========================================
     CASHEW
  ======================================== */

  cashew: {

    table: "cashew1",

    hitos: [],

    tickers: [

      {
        column: "usdlb_ww320",
        name: "WW320 Vietnam USD/LB CFR Europe",
        short: "WW320",
        color: "#111827"
      }

    ]
  },

   /* ========================================
     PECAN
  ======================================== */

  pecan: {

    table: "pecan1",

    hitos: [],

    tickers: [

      {
        column: "usdlb_usfjmh",
        name: "US FJMH USD/LB",
        short: "USFJMH",
        color: "#92400e"
      }

    ]
  },

   
  /* ========================================
     PISTACHIO
  ======================================== */

  pistachio: {

    table: "pistachio1",

    hitos: [

      { fecha: "2023-10-02", texto: "Op. C23" },
      { fecha: "2024-09-30", texto: "Op. C24" },
      { fecha: "2025-09-29", texto: "Op. C25" }

    ],

    tickers: [

      {
        column: "usdlb_std",
        name: "Std. Size USX1 USDLB FAS Calif.",
        short: "Std. Size",
        color: "#111827"
      },

      {
        column: "usdlb_large",
        name: "Large Size USX1 USDLB FAS Calif.",
        short: "Large Size",
        color: "#2563eb"
      },

      {
        column: "usdlb_kernel",
        name: "Kernel W80 USX1 USDLB FAS Calif.",
        short: "Kernel W80",
        color: "#16a34a"
      },

      {
        column: "eurkg_es2125",
        name: "ES 21/25 EURKG EXW Toledo",
        short: "ES 21/25",
        color: "#7c3aed"
      },

      {
        column: "eurkg_eskernel",
        name: "ES Kernel EURKG EXW Toledo",
        short: "ES Kernel",
        color: "#ea580c"
      }

    ]
  }
};

/* ==========================================
   STATE
========================================== */

let currentProduct = "cashew";

let globalData = [];

let activeColumn = null;

let chart = null;

/* ==========================================
   INIT
========================================== */

window.addEventListener(
  "DOMContentLoaded",
  async () => {

    if (typeof Chart === "undefined") {

      console.error("Chart.js not loaded");

      return;
    }

    setupProductButtons();

    setupChart();

    await loadProduct(currentProduct);
  }
);

/* ==========================================
   PRODUCT BUTTONS
========================================== */

function setupProductButtons() {

  const buttons =
    document.querySelectorAll(".product-switch");

  buttons.forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const selectedProduct =
          button.dataset.product;

        if (
          selectedProduct === currentProduct
        ) {
          return;
        }

        buttons.forEach(btn => {
          btn.classList.remove("active");
        });

        button.classList.add("active");

        currentProduct =
          selectedProduct;

        await loadProduct(currentProduct);
      }
    );
  });
}

/* ==========================================
   LOAD PRODUCT
========================================== */

async function loadProduct(productKey) {

  const config =
    PRODUCTS[productKey];

  document.getElementById(
    "productTitle"
  ).textContent = "Loading...";

  document.getElementById(
    "productPrice"
  ).textContent = "--";

  document.getElementById(
    "productChange"
  ).textContent = "";

  globalData = [];

  activeColumn =
    config.tickers[0].column;

  renderTickers(config.tickers);

  await fetchData(config.table);

  if (!globalData.length) {

    console.error(
      "No data returned from:",
      config.table
    );

    return;
  }

  updateTickerValues();

  updateUI();
}

/* ==========================================
   FETCH DATA
========================================== */

async function fetchData(table) {

  try {

    globalData = [];

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=fecha.desc`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        }
      }
    );

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "Supabase error:",
        data
      );

      return;
    }

    if (!Array.isArray(data)) {

      console.error(
        "Invalid dataset"
      );

      return;
    }

    globalData = data

      .filter(item => item.fecha)

      .filter(item =>
        !isNaN(new Date(item.fecha))
      );

    console.log(
      `Loaded ${table}:`,
      globalData.length,
      "rows"
    );

  } catch (err) {

    console.error(
      "Fetch error:",
      err
    );
  }
}

/* ==========================================
   RENDER TICKERS
========================================== */

function renderTickers(tickers) {

  const container =
    document.getElementById(
      "tickerContainer"
    );

  container.innerHTML = "";

  tickers.forEach((ticker, index) => {

    const card =
      document.createElement("div");

    card.className =
      `ticker-card ${
        index === 0
          ? "active"
          : ""
      }`;

    card.dataset.column =
      ticker.column;

    card.innerHTML = `

      <div
        class="ticker-dot"
        style="background:${ticker.color}"
      ></div>

      <div class="ticker-content">

        <span class="ticker-name">
          ${ticker.short}
        </span>

        <span class="ticker-value">
          --
        </span>

      </div>
    `;

    card.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".ticker-card")
          .forEach(c => {
            c.classList.remove("active");
          });

        card.classList.add("active");

        activeColumn =
          ticker.column;

        updateUI();
      }
    );

    container.appendChild(card);
  });
}

/* ==========================================
   UPDATE TICKER VALUES
========================================== */

function updateTickerValues() {

  if (!globalData.length) return;

  const latest =
    globalData[0];

  document
    .querySelectorAll(".ticker-card")

    .forEach(card => {

      const value =
        Number(
          latest[
            card.dataset.column
          ]
        );

      const valueEl =
        card.querySelector(
          ".ticker-value"
        );

      if (!isNaN(value)) {

        valueEl.textContent =
          value.toFixed(2);

      } else {

        valueEl.textContent = "--";
      }
    });
}

/* ==========================================
   CHART SETUP
========================================== */

function setupChart() {

  const canvas =
    document.getElementById(
      "currencyChart"
    );

  const ctx =
    canvas.getContext("2d");

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

          backgroundColor:
            "rgba(255,255,255,0.98)",

          titleColor:
            "#111827",

          bodyColor:
            "#374151",

          borderColor:
            "rgba(0,0,0,0.06)",

          borderWidth: 1,

          padding: 14,

          displayColors: true
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

            color: "#9ca3af"
          }
        },

        y: {

          position: "right",

          grace: "10%",

          grid: {

            color:
              "rgba(0,0,0,0.05)"
          },

          border: {

            display: false
          },

          ticks: {

            color: "#6b7280",

            callback: value =>
              Number(value).toFixed(2)
          }
        },

        yLeft: {

          position: "left",

          display: true,

          grid: {

            drawOnChartArea: false
          },

          border: {

            display: false
          },

          ticks: {

            color:
              "rgba(17,24,39,0.25)"
          }
        }
      }
    }
  });
}

/* ==========================================
   UPDATE CHART
========================================== */

function updateChart() {

  if (
    !chart ||
    !globalData.length
  ) {
    return;
  }

  const labels =
    globalData.map(
      d => d.fecha
    );

  const rawValues =
    globalData.map(d => {

      const raw =
        d[activeColumn];

      if (
        raw === null ||
        raw === undefined ||
        raw === ""
      ) {
        return null;
      }

      const value =
        parseFloat(raw);

      return Number.isFinite(value)
        ? value
        : null;
    });

  const values =
    rawValues.map((_, index) => {

      const window =
        rawValues
          .slice(
            Math.max(0, index - 89),
            index + 1
          )
          .filter(v => v !== null);

      if (!window.length) {
        return null;
      }

      const avg =
        window.reduce(
          (sum, value) => sum + value,
          0
        ) / window.length;

      return avg;
    });

  const stockValues =
    globalData.map(d => {

      const value =
        Number(d.stock_MT);

      return isNaN(value)
        ? null
        : value;
    });

  const ticker =
    PRODUCTS[currentProduct]
      .tickers
      .find(
        t =>
          t.column === activeColumn
      );

  const movingAverageColor =
    currentProduct === "cashew"
      ? "rgba(17,24,39,0.28)"
      : activeColumn === "usdlb_large"
      ? "rgba(37,99,235,0.28)"
      : activeColumn === "usdlb_kernel"
      ? "rgba(22,163,74,0.28)"
      : activeColumn === "eurkg_es2125"
      ? "rgba(124,58,237,0.28)"
      : activeColumn === "eurkg_eskernel"
      ? "rgba(234,88,12,0.28)"
      : "rgba(17,24,39,0.28)";

  chart.data.labels =
    labels;

  chart.data.datasets = [];

  const hasStock =
    stockValues.some(
      value => value !== null
    );

  chart.options.scales.yLeft.display =
    hasStock;

  if (hasStock) {

    chart.data.datasets.push({

      type: "bar",

      label: "Stock MT",

      data: stockValues,

      yAxisID: "yLeft",

      backgroundColor:
        "rgba(17,24,39,0.08)",

      borderColor:
        "rgba(17,24,39,0.12)",

      borderWidth: 1,

      borderRadius: 2,

      barPercentage: 0.72,

      categoryPercentage: 0.92,

      order: 3
    });
  }

  chart.data.datasets.push({

    label: ticker.name,

    data: rawValues,

    borderColor:
      ticker.color,

    borderWidth: 2.2,

    pointRadius: 0,

    tension: 0.25,

    fill: false,

    order: 1
  });

  chart.data.datasets.push({

    label: `${ticker.name} · 3M MA`,

    data: values,

    borderColor:
      movingAverageColor,

    borderWidth: 2,

    pointRadius: 0,

    tension: 0.32,

    fill: false,

    borderDash: [6, 6],

    order: 2
  });

  chart.update();
}

/* ==========================================
   UPDATE UI
========================================== */

function updateUI() {

  if (!globalData.length) return;

  updateChart();

  const latest =
    globalData[0];

  const previous =
    globalData[1];

  const value =
    Number(
      latest[activeColumn]
    );

  const previousValue =
    previous
      ? Number(
          previous[activeColumn]
        )
      : value;

  const ticker =
    PRODUCTS[currentProduct]
      .tickers
      .find(
        t =>
          t.column === activeColumn
      );

  document.getElementById(
    "productTitle"
  ).textContent =
    ticker.name;

  document.getElementById(
    "productPrice"
  ).textContent =
    !isNaN(value)
      ? value.toFixed(2)
      : "--";

  const change =
    previousValue
      ? ((value - previousValue)
        / previousValue) * 100
      : 0;

  const changeEl =
    document.getElementById(
      "productChange"
    );

  let symbol = "=";
  let className = "neutral";

  if (change > 0) {

    symbol = "▲";

    className = "down";
  }

  else if (change < 0) {

    symbol = "▼";

    className = "up";
  }

  changeEl.textContent =
    `${symbol} ${Math.abs(change).toFixed(2)}% today`;

  changeEl.className =
    `change ${className}`;
}
