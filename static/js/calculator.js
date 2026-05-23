// ── State ─────────────────────────────────────────────
let currentN = 3;

const presets = {
  ex1: {
    n: 3,
    A: [10, -1, 2, -1, 11, -1, 2, -1, 10],
    b: [6, 25, -11],
    x0: [0, 0, 0]
  },
  ex2: {
    n: 4,
    A: [4, -1, 0, 0, -1, 4, -1, 0, 0, -1, 4, -1, 0, 0, -1, 4],
    b: [15, 10, 10, 15],
    x0: [0, 0, 0, 0]
  }
};

// ── Build Matrix Grids ────────────────────────────────
function buildGrids(n) {
  currentN = n;

  const inputW = window.innerWidth <= 375 ? 46
               : window.innerWidth <= 390 ? 50
               : window.innerWidth <= 430 ? 48
               : window.innerWidth <= 1024 ? 58
               : 72;

  const gridA  = document.getElementById('matrix-A');
  const gridB  = document.getElementById('matrix-b');
  const gridX0 = document.getElementById('matrix-x0');

  // Set column widths on the CONTAINER, not the inputs
  gridA.style.gridTemplateColumns  = `repeat(${n}, ${inputW}px)`;
  gridB.style.gridTemplateColumns  = `${inputW}px`;
  gridX0.style.gridTemplateColumns = `${inputW}px`;

gridA.innerHTML = '';
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any';
    inp.value = (i === j) ? '1' : '0';
    inp.id = `a_${i}_${j}`;
    inp.setAttribute('aria-label', `A[${i+1}][${j+1}]`);
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', () => checkDiagonalDominance(n));
    inp.addEventListener('keydown', (e) => {
      const arrows = { ArrowRight: [0,1], ArrowLeft: [0,-1], ArrowUp: [-1,0], ArrowDown: [1,0] };
      if (!arrows[e.key]) return;
      e.preventDefault();
      const [di, dj] = arrows[e.key];
      const next = document.getElementById(`a_${i+di}_${j+dj}`);
      if (next) { next.focus(); next.select(); }
    });
    gridA.appendChild(inp);
  }

  // Badge at the end of each row
  const badge = document.createElement('span');
  badge.id = `dd_row_${i}`;
  badge.className = 'dd-badge dd-fail';
  badge.textContent = '✗';
  gridA.appendChild(badge);
}

// Badge needs its own column in the grid
gridA.style.gridTemplateColumns = `repeat(${n}, ${inputW}px) 28px`;

// Run once on load
checkDiagonalDominance(n);



  gridB.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any';
    inp.value = '0'; inp.id = `b_${i}`;
    inp.setAttribute('aria-label', `b[${i+1}]`);
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const di = e.key === 'ArrowDown' ? 1 : -1;
        const next = document.getElementById(`${inp.id.split('_')[0]}_${i + di}`);
        if (next) { next.focus(); next.select(); }
      }
    });
    gridB.appendChild(inp);
  }

  gridX0.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any';
    inp.value = '0'; inp.id = `x0_${i}`;
    inp.setAttribute('aria-label', `x0[${i+1}]`);
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const di = e.key === 'ArrowDown' ? 1 : -1;
        const next = document.getElementById(`${inp.id.split('_')[0]}_${i + di}`);
        if (next) { next.focus(); next.select(); }
      }
    });
    gridX0.appendChild(inp);
  }

  clearResults();
}

window.addEventListener('resize', () => buildGrids(currentN));

// ── Read current values from grid ─────────────────────
function readMatrix(n) {
  const A = [], b = [], x0 = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const el = document.getElementById(`a_${i}_${j}`);
      A.push(parseFloat(el.value) || 0);
    }
    b.push(parseFloat(document.getElementById(`b_${i}`).value) || 0);
    x0.push(parseFloat(document.getElementById(`x0_${i}`).value) || 0);
  }
  return { A, b, x0 };
}

// ── Load preset ───────────────────────────────────────
function loadPreset(key) {
  if (key === 'clear') {
    buildGrids(currentN);
    return;
  }
  const p = presets[key];
  if (!p) return;

  // Update size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.n) === p.n);
  });
  buildGrids(p.n);

  p.A.forEach((v, idx) => {
    const i = Math.floor(idx / p.n), j = idx % p.n;
    const el = document.getElementById(`a_${i}_${j}`);
    if (el) el.value = v;
  });
  p.b.forEach((v, i) => {
    const el = document.getElementById(`b_${i}`);
    if (el) el.value = v;
  });
  p.x0.forEach((v, i) => {
    const el = document.getElementById(`x0_${i}`);
    if (el) el.value = v;
  });
}

// ── Solve ─────────────────────────────────────────────
async function solve() {
  clearResults();
  showError('');

  const n = currentN;
  const { A, b, x0 } = readMatrix(n);
  const tol = parseFloat(document.getElementById('tol').value);
  const max_iter = parseInt(document.getElementById('max-iter').value);

  const payload = { n, A, b, x0, tol, max_iter };

  const btn = document.getElementById('calc-btn');
  btn.querySelector('.btn-text').textContent = 'Solving…';
  btn.disabled = true;

  try {
    const resp = await fetch('/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (!resp.ok || data.error) {
      showError(data.error || 'Unknown error occurred.');
      return;
    }

    displayResults(data, n);

  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    btn.querySelector('.btn-text').textContent = 'Solve with Jacobi Iteration';
    btn.disabled = false;
  }
}

// ── Display Results ───────────────────────────────────
function displayResults(data, n) {
  const area = document.getElementById('result-area');
  const summary = document.getElementById('result-summary');

  area.classList.remove('hidden');

  // Warnings
  const warnHtml = (data.warnings && data.warnings.length > 0)
    ? `<ul class="warning-list">${data.warnings.map(w => `<li>⚠ ${w}</li>`).join('')}</ul>`
    : '';

  // Solution vars
  const solVars = data.solution.map((v, i) =>
    `<span class="sol-var">x<sub>${i+1}</sub> = ${v}</span>`
  ).join('');

if (data.converged) {
  summary.className = 'result-summary success';
  summary.innerHTML = `
    <div class="summary-title green">✓ Converged after ${data.iterations} iteration${data.iterations !== 1 ? 's' : ''}</div>
    <div class="solution-row">
      ${solVars}
      <button class="copy-btn" id="copy-result-btn">Copy</button>
    </div>
    <div class="sol-meta">Tolerance: ${document.getElementById('tol').value}</div>
    ${warnHtml}
  `;

  document.getElementById('copy-result-btn').addEventListener('click', () => {
    const text = data.solution
      .map((v, i) => `x${i + 1} = ${v}`)
      .join(',  ');
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-result-btn');
      btn.textContent = 'Copied!';
      btn.classList.add('copy-btn-success');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copy-btn-success');
      }, 2000);
    });
  });
} else {
    summary.className = 'result-summary fail';
    summary.innerHTML = `
      <div class="summary-title red">✗ Did not converge within ${data.iterations} iterations</div>
      <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 8px;">Last approximation:</div>
      <div class="solution-row">${solVars}</div>
      ${warnHtml}
    `;
  }

  // Iteration table
  const tableWrap = document.getElementById('result-table');
  const varHeaders = Array.from({ length: n }, (_, i) =>
    `<th>x<sub>${i+1}</sub></th>`
  ).join('');

  // Cap rows shown if too many
  const steps = data.steps;
  const MAX_ROWS = 60;
  let rows = steps;
  let truncated = false;
  if (steps.length > MAX_ROWS) {
    rows = [...steps.slice(0, 20), null, ...steps.slice(-20)];
    truncated = true;
  }

  const rowsHtml = rows.map(s => {
    if (s === null) {
      return `<tr><td colspan="${n+2}" style="text-align:center;color:var(--text-muted);padding:10px;">⋮ (${steps.length - 40} rows hidden)</td></tr>`;
    }
    const isFinal = s.iteration === data.iterations && data.converged;
    const cls = isFinal ? ' class="final-row"' : '';
    const xVals = s.x.map(v => `<td>${v}</td>`).join('');
    const res = s.residual !== null ? s.residual.toExponential(3) : '—';
    return `<tr${cls}><td>${s.iteration}</td>${xVals}<td>${res}</td></tr>`;
  }).join('');

  tableWrap.innerHTML = `
    <div class="overflow-wrap">
      <table class="res-table">
        <thead>
          <tr>
            <th>k</th>
            ${varHeaders}
            <th>Max |Δx|</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;

  const chartSteps = data.steps.filter(s => s !== null && s.residual !== null && s.residual > 0);
  renderConvergenceChart(chartSteps);

  // Show and attach export button
  const exportBtn = document.getElementById('export-csv-btn');
  exportBtn.classList.remove('hidden');
  exportBtn.onclick = () => exportCSV(data, n);
}


// ── Helpers ───────────────────────────────────────────
function clearResults() {
  document.getElementById('result-area').classList.add('hidden');
  document.getElementById('result-summary').innerHTML = '';
  document.getElementById('result-table').innerHTML = '';
  document.getElementById('export-csv-btn').classList.add('hidden');
  document.getElementById('convergence-chart-wrap').classList.add('hidden');
  if (convergenceChart) { convergenceChart.destroy(); convergenceChart = null; }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  if (msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

// ── Event Listeners ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildGrids(parseInt(btn.dataset.n));
    });
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });

  // Solve button
  document.getElementById('calc-btn').addEventListener('click', solve);

  // Allow Enter key in inputs
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') solve();
  });

  // Init with 3×3
  buildGrids(3);
});


function checkDiagonalDominance(n) {
  for (let i = 0; i < n; i++) {
    const diag = Math.abs(parseFloat(document.getElementById(`a_${i}_${i}`)?.value) || 0);
    let sumOff = 0;
    for (let j = 0; j < n; j++) {
      if (j !== i) sumOff += Math.abs(parseFloat(document.getElementById(`a_${i}_${j}`)?.value) || 0);
    }
    const badge = document.getElementById(`dd_row_${i}`);
    if (!badge) continue;
    if (diag > sumOff) {
      badge.textContent = '✓';
      badge.className = 'dd-badge dd-ok';
    } else if (diag === sumOff) {
      badge.textContent = '~';
      badge.className = 'dd-badge dd-weak';
    } else {
      badge.textContent = '✗';
      badge.className = 'dd-badge dd-fail';
    }
  }
}

let convergenceChart = null;

function renderConvergenceChart(steps) {
  const wrap = document.getElementById('convergence-chart-wrap');
  wrap.classList.remove('hidden');

  const labels = steps.map(s => s.iteration);
  const data   = steps.map(s => s.residual);

  // Destroy previous instance if exists
  if (convergenceChart) {
    convergenceChart.destroy();
    convergenceChart = null;
  }

  const ctx = document.getElementById('convergence-chart').getContext('2d');
  convergenceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Max |Δx|',
        data,
        borderColor: '#e8c27a',
        backgroundColor: 'rgba(232,194,122,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#e8c27a',
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Iteration (k)',
            color: '#8a8a9a',
            font: { family: "'Source Code Pro', monospace", size: 12 }
          },
          ticks: { color: '#8a8a9a', font: { family: "'Source Code Pro', monospace" } },
          grid:  { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          type: 'logarithmic',
          title: {
            display: true,
            text: 'Max |Δx| (log scale)',
            color: '#8a8a9a',
            font: { family: "'Source Code Pro', monospace", size: 12 }
          },
          ticks: {
            color: '#8a8a9a',
            font: { family: "'Source Code Pro', monospace" },
            callback: v => v.toExponential(0)
          },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      },
      plugins: {
        legend: { labels: { color: '#e8e6e0', font: { family: "'Source Code Pro', monospace" } } },
        tooltip: {
          callbacks: {
            label: ctx => `Max |Δx|: ${ctx.parsed.y.toExponential(4)}`
          }
        }
      }
    }
  });
}

function exportCSV(data, n) {
  // Build header row
  const headers = ['iteration', ...Array.from({length: n}, (_, i) => `x${i+1}`), 'max_delta_x'];
  
  // Build data rows from all steps
  const rows = data.steps.map(s => {
    const residual = s.residual !== null ? s.residual : '';
    return [s.iteration, ...s.x, residual].join(',');
  });

  // Add solution summary at bottom
  rows.push('');
  rows.push('# Solution');
  rows.push(data.solution.map((v, i) => `x${i+1}=${v}`).join(','));
  rows.push(`# Converged,${data.converged}`);
  rows.push(`# Iterations,${data.iterations}`);

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jacobi_n${n}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
