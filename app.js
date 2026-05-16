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
        name: "WW320 USD/LB",
        short: "WW320",
        color: "#111827"
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

//
// ==========================================
// LOAD PRODUCT
// ==========================================
//

async function loadProduct(productKey) {

  const config =
    PRODUCTS[productKey];

  // RESET VISUAL
  document.getElementById(
    "productTitle"
  ).textContent = "Loading...";

  document.getElementById(
    "productPrice"
  ).textContent = "--";

  document.getElementById(
    "productChange"
  ).textContent = "";

  // RESET DATA
  globalData = [];

  // ACTIVE COLUMN
  activeColumn =
    config.tickers[0].column;

  // RENDER TICKERS
  renderTickers(config.tickers);

  // FETCH TABLE
  await fetchData(config.table);

  // VALIDATION
  if (!globalData.length) {

    console.error(
      "No data returned from:",
      config.table
    );

    return;
  }

  // UPDATE
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

      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=fecha.desc&limit=10000`,

      {
        headers: {

          apikey: SUPABASE_KEY,

          Authorization:
            `Bearer ${SUPABASE_KEY}`
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
      )

      .sort(
        (a, b) =>
          new Date(a.fecha) -
          new Date(b.fecha)
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
   LOADING STATE
========================================== */

function showLoadingState() {

  document.getElementById(
    "productTitle"
  ).textContent =
    "Loading...";

  document.getElementById(
    "productPrice"
  ).textContent =
    "--";

  document.getElementById(
    "productChange"
  ).textContent =
    "";
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
    globalData[
      globalData.length - 1
    ];

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

        annotation: {

          annotations: {}
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

          displayColors: true,

          callbacks: {

            label: function(context) {

              let label =
                context.dataset.label || "";

              if (label) {
                label += ": ";
              }

              if (
                context.parsed.y !== null
              ) {

                label +=
                  context.parsed.y.toFixed(2);
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

  const values =
    globalData.map(d => {

      const value =
        Number(
          d[activeColumn]
        );

      return isNaN(value)
        ? null
        : value;
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

  chart.data.labels =
    labels;

  chart.data.datasets = [];

  /* ======================================
     STOCK BARS
  ====================================== */

  const hasStock =
    stockValues.some(
      value => value !== null
    );

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

      order: 2
    });
  }

  /* ======================================
     MAIN LINE
  ====================================== */

  chart.data.datasets.push({

    label: ticker.name,

    data: values,

    borderColor:
      ticker.color,

    borderWidth: 2,

    pointRadius: 0,

    tension: 0.25,

    fill: false,

    order: 1
  });

  /* ======================================
     ANNOTATIONS
  ====================================== */

  const annotations = {};

  PRODUCTS[currentProduct]
    .hitos
    .forEach((hito, i) => {

      const point =
        globalData.find(
          d =>
            d.fecha === hito.fecha
        );

      if (!point) return;

      const y =
        Number(
          point[activeColumn]
        );

      if (isNaN(y)) return;

      annotations[
        `line_${i}`
      ] = {

        type: "line",

        xMin: hito.fecha,

        xMax: hito.fecha,

        borderColor:
          "rgba(220,38,38,0.12)",

        borderWidth: 1
      };

      annotations[
        `point_${i}`
      ] = {

        type: "point",

        xValue: hito.fecha,

        yValue: y,

        backgroundColor:
          "#dc2626",

        radius: 3
      };

      annotations[
        `label_${i}`
      ] = {

        type: "label",

        xValue: hito.fecha,

        yValue: y,

        content:
          `${hito.texto} · ${y.toFixed(2)}`,

        backgroundColor:
          "rgba(255,255,255,0)",

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

  chart.options.plugins.annotation.annotations =
    annotations;

  chart.update();
}

/* ==========================================
   UPDATE UI
========================================== */

function updateUI() {

  if (!globalData.length) return;

  updateChart();

  const latest =
    globalData[
      globalData.length - 1
    ];

  const previous =
    globalData[
      globalData.length - 2
    ];

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

  const positive =
    change >= 0;

  const changeEl =
    document.getElementById(
      "productChange"
    );

  changeEl.textContent =
    `${positive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}% today`;

  changeEl.className =
    `change ${
      positive
        ? "up"
        : "down"
    }`;
}
