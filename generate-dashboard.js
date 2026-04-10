const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'data', 'visits.csv');
const HTML_PATH = path.join(__dirname, 'docs', 'index.html');
const LISTING_URL =
  'https://www.sreality.cz/detail/prodej/pozemek/louka/semily-bitouchov-/3764540236';

function parseCSV(content) {
  return content
    .trim()
    .split('\n')
    .slice(1) // skip header
    .filter(Boolean)
    .map((line) => {
      const [timestamp, visits] = line.split(',');
      return { timestamp: timestamp.trim(), visits: parseInt(visits.trim(), 10) };
    })
    .filter((row) => !isNaN(row.visits));
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', hour12: false });
}

function buildHTML(rows) {
  const labels = JSON.stringify(rows.map((r) => formatDate(r.timestamp)));
  const data = JSON.stringify(rows.map((r) => r.visits));

  const latest = rows[rows.length - 1];
  const first = rows[0];
  const totalGain = latest && first ? latest.visits - first.visits : 0;
  const updatedAt = latest ? formatDate(latest.timestamp) : 'N/A';
  const currentVisits = latest ? latest.visits.toLocaleString('cs-CZ') : 'N/A';

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sreality Tracker &mdash; Bitouchov</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      color: #222;
      padding: 24px;
    }
    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 4px; }
    a { color: #0057b8; }
    .meta { font-size: 0.85rem; color: #666; margin-bottom: 24px; }
    .stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 28px;
    }
    .stat {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px 24px;
      min-width: 160px;
    }
    .stat__label { font-size: 0.78rem; color: #888; text-transform: uppercase; letter-spacing: .04em; }
    .stat__value { font-size: 2rem; font-weight: 700; margin-top: 4px; }
    .chart-wrap {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      max-width: 900px;
    }
  </style>
</head>
<body>
  <h1>Sledování návštěvnosti &mdash; Bitouchov, louka</h1>
  <p class="meta">
    <a href="${LISTING_URL}" target="_blank" rel="noopener">Zobrazit inzerát na Sreality.cz</a>
    &nbsp;|&nbsp; Poslední aktualizace: ${updatedAt}
  </p>

  <div class="stats">
    <div class="stat">
      <div class="stat__label">Aktuální zobrazení</div>
      <div class="stat__value">${currentVisits}</div>
    </div>
    <div class="stat">
      <div class="stat__label">Nárůst (celkem)</div>
      <div class="stat__value">+${totalGain.toLocaleString('cs-CZ')}</div>
    </div>
    <div class="stat">
      <div class="stat__label">Počet měření</div>
      <div class="stat__value">${rows.length}</div>
    </div>
  </div>

  <div class="chart-wrap">
    <canvas id="chart"></canvas>
  </div>

  <script>
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${labels},
        datasets: [{
          label: 'Počet zobrazení',
          data: ${data},
          borderColor: '#0057b8',
          backgroundColor: 'rgba(0,87,184,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: 12, maxRotation: 30 },
          },
          y: {
            beginAtZero: false,
            ticks: { precision: 0 },
          },
        },
      },
    });
  </script>
</body>
</html>
`;
}

const csv = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(csv);

if (rows.length === 0) {
  console.log('No data yet — writing empty dashboard.');
}

const html = buildHTML(rows);
fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log(`Dashboard written to ${HTML_PATH} (${rows.length} data points)`);
