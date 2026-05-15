const SUPABASE_URL =
  "https://pqtbmnqsftqyvkhoszyy.supabase.co";

const SUPABASE_KEY =
  "TU_SUPABASE_KEY";

const PRODUCTS = {

  cashew: {

    table: "cashew1",

    tickers: [
      {
        column: "usdlb_ww320",
        name: "WW320 USD/LB",
        short: "WW320",
        color: "#111827"
      }
    ]
  },

  pistachio: {

    table: "pistachio1",

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

let currentProduct = "cashew";

let globalData = [];

let activeColumn = null;

let chart = null;

window.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupProductButtons();

    setupChart();

    await loadProduct(currentProduct);
  }
);

function setupProductButtons() {

  document
    .querySelectorAll(".product-switch")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          document
            .querySelectorAll(".product-switch")
            .forEach(btn =>
              btn.classList.remove("active")
            );

          button.classList.add("active");

          currentProduct =
            button.dataset.product;

          await loadProduct(currentProduct);
        }
      );
    });
}

async function loadProduct(productKey) {

  const config = PRODUCTS[productKey];

  activeColumn =
    config.tickers[0].column;

  renderTickers(config.tickers);

  await fetchData(config.table);

  updateTickerValues();

  updateUI();
}

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
      `ticker-card ${index === 0 ? "active" : ""}`;

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

        <span class="ticker-value"></span>
      </div>
    `;

    card.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".ticker-card")
          .forEach(c =>
            c.classList.remove("active")
          );

        card.classList.add("active");

        activeColumn =
          ticker.column;

        updateUI();
      }
    );

    container.appendChild(card);
  });
}

async function fetchData(table) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=*&order=fecha.asc&limit=10000`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization:
          `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  globalData =
    await response.json();
}

function setupChart() {

  const ctx =
    document
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

      plugins: {
        legend: {
          display: false
        }
      },

      scales: {

        x: {
          grid: {
            display: false
          }
        },

        y: {
          position: "right"
        }
      }
    }
  });
}

function updateTickerValues() {

  const latest =
    globalData[
      globalData.length - 1
    ];

  document
    .querySelectorAll(".ticker-card")
    .forEach(card => {

      const value =
        Number(
          latest[card.dataset.column]
        );

      card.querySelector(
        ".ticker-value"
      ).textContent =
        value.toFixed(2);
    });
}

function updateChart() {

  const labels =
    globalData.map(d => d.fecha);

  const values =
    globalData.map(d => {

      const value =
        Number(d[activeColumn]);

      return isNaN(value)
        ? null
        : value;
    });

  chart.data.labels = labels;

  chart.data.datasets = [
    {
      data: values,

      borderColor: "#111827",

      borderWidth: 2,

      pointRadius: 0,

      tension: 0.2
    }
  ];

  chart.update();
}

function updateUI() {

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
    Number(latest[activeColumn]);

  const prev =
    previous
      ? Number(previous[activeColumn])
      : value;

  const ticker =
    PRODUCTS[currentProduct]
      .tickers
      .find(
        t => t.column === activeColumn
      );

  document.getElementById(
    "productTitle"
  ).textContent =
    ticker.name;

  document.getElementById(
    "productPrice"
  ).textContent =
    value.toFixed(2);

  const change =
    ((value - prev) / prev) * 100;

  const positive =
    change >= 0;

  const changeEl =
    document.getElementById(
      "productChange"
    );

  changeEl.textContent =
    `${positive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}% today`;

  changeEl.className =
    `change ${positive ? "up" : "down"}`;
}
