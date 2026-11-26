const STORAGE_KEY = 'ts_sheet_monitoring_v4';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzP2TC6Th7NCZJrm4ehAVUPfMT6eaU7gbjjryTcIU5bMaz4mQcDRRQtcHL9mH5K0zM4/exec';

const DEFAULT_DATA = [
  { id: 1, opname: '', location: 'A.01.01', stock: 7, min: 10, itemNumber: '32000620', productName: 'GASKET SEAL, ID:1.9MM OD:12MM T:2MM, AKASH', licensePlate: 'WNH-SP-A.01.01' },
  { id: 2, opname: '', location: 'A.01.02', stock: 57, min: 10, itemNumber: '32000650', productName: 'CAP SACHET, OD:10MM H:8MM, DACHUAN 2', licensePlate: 'WNH-SP-A.01.02' },
  { id: 3, opname: '', location: 'A.01.03', stock: 41, min: 10, itemNumber: '32000670', productName: 'CAP SACHET, OD:10MM H:11MM, ACEPACK', licensePlate: 'WNH-SP-A.01.03' },
  { id: 4, opname: '', location: 'A.01.04', stock: 27, min: 10, itemNumber: '32052160', productName: 'SEAL GRIPPER SQUARE, W:22MM T:5MM, DACHUAN 2', licensePlate: 'WNH-SP-A.01.04' },
  { id: 5, opname: '', location: 'A.01.05', stock: 40, min: 10, itemNumber: '32050630', productName: 'SEAL GRIPPER SQUARE, L:22MM W:17MM T:5MM, PU, ACEPACK', licensePlate: 'WNH-SP-A.01.05' }
];

let items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_DATA;
let currentFilter = 'all';
let searchQuery = '';
let selectedIds = new Set();
let barChart = null;
let donutChart = null;

let autoScrollActive = false;
let autoScrollTimer = null;
let currentPage = 1;
let monitoringMode = false;

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getStockStatus(item) {
  if (item.stock <= 0) {
    return { key: 'out', label: 'Habis', badge: 'bg-dark text-danger border border-danger', barColor: '#9f1239' };
  }
  if (item.stock <= item.min) {
    return { key: 'critical', label: 'Kritis', badge: 'bg-danger text-white', barColor: '#ff2a6d' };
  }
  if (item.stock <= Math.ceil(item.min * 1.1)) {
    return { key: 'warning', label: 'Mendekati Min', badge: 'bg-warning text-dark', barColor: '#ffd60a' };
  }
  return { key: 'safe', label: 'Aman', badge: 'bg-success text-white', barColor: '#05ffa1' };
}

function renderKPIs() {
  const total = items.length;
  const totalQty = items.reduce((s, i) => s + i.stock, 0);
  const out = items.filter(i => getStockStatus(i).key === 'out').length;
  const critical = items.filter(i => getStockStatus(i).key === 'critical').length;
  const warning = items.filter(i => getStockStatus(i).key === 'warning').length;
  const safe = items.filter(i => getStockStatus(i).key === 'safe').length;

  const kpis = [
    { title: 'Total Produk', value: total, desc: 'Item terdaftar', icon: 'boxes', color: 'text-slate-700', bg: 'bg-slate-100' },
    { title: 'Total Qty Stok', value: totalQty, desc: 'Unit keseluruhan', icon: 'layers', color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Stok Habis', value: out, desc: 'Stok = 0', icon: 'x-octagon', color: 'text-danger', bg: 'bg-rose-50' },
    { title: 'Stok Kritis', value: critical, desc: '1 s/d Minimum', icon: 'alert-octagon', color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Mendekati Min', value: warning, desc: 'Dalam +10% Min', icon: 'alert-triangle', color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Stok Aman', value: safe, desc: 'Di atas +10% Min', icon: 'check-circle-2', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  document.getElementById('kpi-container').innerHTML = kpis.map(k => `
    <div class="col-6 col-md-4 col-lg">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-body d-flex align-items-center justify-content-between p-3">
          <div>
            <div class="small text-muted fw-medium">${k.title}</div>
            <div class="fs-4 fw-bold text-dark my-0">${k.value}</div>
            <div class="text-secondary" style="font-size:11px;">${k.desc}</div>
          </div>
          <div class="p-2 rounded-3 bg-light">
            <i data-lucide="${k.icon}" class="${k.color}" style="width:20px;height:20px;"></i>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCharts() {
  const sortMode = document.getElementById('chart-sort').value;
  const sorted = [...items].sort((a, b) => {
    if (sortMode === 'lowest') return a.stock - b.stock;
    if (sortMode === 'highest') return b.stock - a.stock;
    return a.location.localeCompare(b.location);
  });

  const pageSize = Number(document.getElementById('page-size')?.value || 25);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  if (currentPage > totalPages) currentPage = 1;
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + pageSize);

  const pageInfo = document.getElementById('page-info');
  if (pageInfo) {
    const endIdx = Math.min(startIdx + pageItems.length, sorted.length);
    pageInfo.textContent = `Tab ${currentPage} / ${totalPages} (Item ${sorted.length ? startIdx + 1 : 0} - ${endIdx} dari ${sorted.length})`;
  }

  const labels = pageItems.map(i => {
    const shortName = i.productName.split(',')[0];
    return `${i.location} - ${shortName.slice(0, 26)}${shortName.length > 26 ? '...' : ''}`;
  });
  const stockData = pageItems.map(i => i.stock);
  const minData = pageItems.map(i => i.min);
  const colors = pageItems.map(i => getStockStatus(i).barColor);

  const barValuePlugin = {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const val = dataset.data[index];
          ctx.fillStyle = datasetIndex === 0 ? '#ffffff' : '#94a3b8';
          ctx.fillText(val, bar.x + 6, bar.y);
        });
      });
      ctx.restore();
    }
  };

  const rowBorderPlugin = {
    id: 'rowBorders',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      const yScale = scales.y;
      const count = chart.data.labels.length;
      if (count > 0) {
        const step = count > 1 ? Math.abs(yScale.getPixelForTick(1) - yScale.getPixelForTick(0)) : chartArea.bottom - chartArea.top;
        for (let i = 0; i < count; i++) {
          const yCenter = yScale.getPixelForTick(i);
          const yTop = yCenter - step / 2;
          ctx.strokeRect(chartArea.left, yTop, chartArea.right - chartArea.left, step);
        }
      }
      ctx.restore();
    }
  };

  const ctxBar = document.getElementById('productStockChart').getContext('2d');
  if (barChart) barChart.destroy();
  barChart = new Chart(ctxBar, {
    type: 'bar',
    plugins: [rowBorderPlugin, barValuePlugin],
    data: {
      labels,
      datasets: [
        { label: 'Stock Saat Ini', data: stockData, backgroundColor: colors, borderRadius: 6, barPercentage: 0.75 },
        { label: 'Batas Minimum', data: minData, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 6, barPercentage: 0.75 }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      layout: { padding: { right: 36 } },
      plugins: {
        legend: { position: 'top', labels: { color: '#f8fafc', boxWidth: 14, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            title: (ctx) => pageItems[ctx[0].dataIndex].productName
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#cbd5e1' } },
        y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 11 } } }
      }
    }
  });

  const out = items.filter(i => getStockStatus(i).key === 'out').length;
  const critical = items.filter(i => getStockStatus(i).key === 'critical').length;
  const warning = items.filter(i => getStockStatus(i).key === 'warning').length;
  const safe = items.filter(i => getStockStatus(i).key === 'safe').length;

  const totalDonut = (out + critical + warning + safe) || 1;
  const pctCenter = (((safe + warning) / totalDonut) * 100).toFixed(1) + '%';

  const centerTextPlugin = {
    id: 'donutCenterText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText(pctCenter, cx, cy - 8);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText('Aman + Mendekati', cx, cy + 16);
      ctx.restore();
    }
  };

  const ctxDonut = document.getElementById('statusDonutChart').getContext('2d');
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctxDonut, {
    type: 'doughnut',
    plugins: [centerTextPlugin],
    data: {
      labels: ['Habis (0)', 'Kritis', 'Mendekati Min', 'Aman'],
      datasets: [{
        data: [out, critical, warning, safe],
        backgroundColor: ['#9f1239', '#ff2a6d', '#ffd60a', '#05ffa1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '68%',
      plugins: { legend: { display: false } }
    }
  });

  const pctOut = ((out / totalDonut) * 100).toFixed(1);
  const pctCrit = ((critical / totalDonut) * 100).toFixed(1);
  const pctWarn = ((warning / totalDonut) * 100).toFixed(1);
  const pctSafe = ((safe / totalDonut) * 100).toFixed(1);

  document.getElementById('donut-summary').innerHTML = `
    <div class="col-3"><div class="fw-bold text-danger fs-5">${out}</div><div class="small fw-semibold text-white">${pctOut}%</div><small class="text-muted">Habis</small></div>
    <div class="col-3"><div class="fw-bold text-danger fs-5">${critical}</div><div class="small fw-semibold text-white">${pctCrit}%</div><small class="text-muted">Kritis</small></div>
    <div class="col-3"><div class="fw-bold text-warning fs-5">${warning}</div><div class="small fw-semibold text-white">${pctWarn}%</div><small class="text-muted">Mendekati</small></div>
    <div class="col-3"><div class="fw-bold text-success fs-5">${safe}</div><div class="small fw-semibold text-white">${pctSafe}%</div><small class="text-muted">Aman</small></div>
  `;
}

function renderTable() {
  const filtered = items.filter(item => {
    const st = getStockStatus(item).key;
    if (currentFilter === 'out' && st !== 'out') return false;
    if (currentFilter === 'critical' && st !== 'critical') return false;
    if (currentFilter === 'warning' && st !== 'warning') return false;
    if (currentFilter === 'safe' && st !== 'safe') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = [item.location, item.itemNumber, item.productName, item.licensePlate]
        .some(v => (v || '').toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('table-body');
  const empty = document.getElementById('empty-state');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = filtered.map(item => {
    const st = getStockStatus(item);
    const isChecked = selectedIds.has(item.id) ? 'checked' : '';
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4"><input type="checkbox" ${isChecked} onchange="toggleSelectItem(${item.id}, this.checked)" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></td>
        <td class="py-3 px-4 font-mono font-semibold text-slate-700 text-xs">${item.location}</td>
        <td class="py-3 px-4 font-mono text-xs text-slate-600">${item.itemNumber}</td>
        <td class="py-3 px-4 text-xs font-medium text-slate-900 max-w-sm">${item.productName}</td>
        <td class="py-3 px-4 text-center font-bold text-slate-900">${item.stock}</td>
        <td class="py-3 px-4 text-center text-xs text-slate-500">${item.min}</td>
        <td class="py-3 px-4 font-mono text-xs text-slate-500">${item.licensePlate}</td>
        <td class="py-3 px-4"><span class="badge ${st.badge}">${st.label}</span></td>
      </tr>
    `;
  }).join('');
}

function renderAll() {
  renderKPIs();
  renderCharts();
  renderTable();
  lucide.createIcons();
}

function toggleSelectItem(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  document.getElementById('selected-count').textContent = selectedIds.size;
}

function toggleSelectAll(checked) {
  document.querySelectorAll('#table-body input[type="checkbox"]').forEach(cb => {
    cb.checked = checked;
  });
  if (checked) items.forEach(i => selectedIds.add(i.id));
  else selectedIds.clear();
  document.getElementById('selected-count').textContent = selectedIds.size;
}

function applyBulkMin(mode) {
  const val = Number(document.getElementById('bulk-min-input').value);
  if (!val || val < 1) return alert('Masukkan angka minimum yang valid (minimal 1).');
  if (mode === 'selected') {
    if (selectedIds.size === 0) return alert('Pilih minimal 1 komponen di tabel terlebih dahulu.');
    items.forEach(i => { if (selectedIds.has(i.id)) i.min = val; });
  } else {
    items.forEach(i => { i.min = val; });
  }
  saveData();
  renderAll();
}

function changePage(delta) {
  const pageSize = Number(document.getElementById('page-size')?.value || 25);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  currentPage += delta;
  if (currentPage > totalPages) {
    currentPage = 1;
    syncFromAppsScript(true);
  } else if (currentPage < 1) {
    currentPage = totalPages;
  }
  renderCharts();
}

function toggleAutoScroll(forceState) {
  autoScrollActive = typeof forceState === 'boolean' ? forceState : !autoScrollActive;
  const btn = document.getElementById('btn-autoscroll');
  if (autoScrollActive) {
    btn.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i> Auto Tab: ON';
    btn.classList.remove('bg-slate-100', 'text-slate-700');
    btn.classList.add('bg-emerald-100', 'text-emerald-800');
    startAutoScroll();
  } else {
    btn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i> Auto Tab: OFF';
    btn.classList.remove('bg-emerald-100', 'text-emerald-800');
    btn.classList.add('bg-slate-100', 'text-slate-700');
    stopAutoScroll();
  }
  lucide.createIcons();
}

function startAutoScroll() {
  stopAutoScroll();
  const intervalMs = Number(document.getElementById('scroll-speed')?.value || 5000);
  const container = document.getElementById('chart-scroll-container');
  autoScrollTimer = setInterval(() => {
    container.classList.add('blink-update');
    setTimeout(() => {
      container.classList.remove('blink-update');
      changePage(1);
    }, 350);
  }, intervalMs);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }
}

function toggleMonitoringMode() {
  monitoringMode = !monitoringMode;
  const navbar = document.getElementById('main-navbar');
  const filterSec = document.getElementById('filter-section');
  const tableSec = document.getElementById('table-section');
  const exitZone = document.getElementById('exit-monitor-zone');
  const scrollContainer = document.getElementById('chart-scroll-container');

  if (monitoringMode) {
    navbar.classList.add('d-none');
    filterSec.classList.add('d-none');
    tableSec.classList.add('d-none');
    exitZone.classList.remove('d-none');
    scrollContainer.style.height = '65vh';
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    toggleAutoScroll(true);
  } else {
    navbar.classList.remove('d-none');
    filterSec.classList.remove('d-none');
    tableSec.classList.remove('d-none');
    exitZone.classList.add('d-none');
    scrollContainer.style.height = '540px';
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    toggleAutoScroll(false);
  }
  lucide.createIcons();
}

function openEditModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  document.getElementById('edit-id').value = item.id;
  document.getElementById('modal-title').textContent = `Update: ${item.itemNumber}`;
  document.getElementById('modal-subtitle').textContent = item.productName;
  document.getElementById('edit-stock').value = item.stock;
  document.getElementById('edit-min').value = item.min;
  document.getElementById('edit-opname').value = item.opname || '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('edit-modal')).show();
}

function openAppsScriptModal() {
  bootstrap.Modal.getOrCreateInstance(document.getElementById('apps-script-modal')).show();
}

function closeModal(id) {
  const instance = bootstrap.Modal.getInstance(document.getElementById(id));
  if (instance) instance.hide();
}

async function syncFromAppsScript(silent = false) {
  const inputEl = document.getElementById('apps-script-url');
  const url = (inputEl ? inputEl.value.trim() : '') || localStorage.getItem('ts_apps_script_url') || DEFAULT_APPS_SCRIPT_URL;
  if (!url) {
    if (!silent) alert('Masukkan URL Web App Apps Script terlebih dahulu.');
    return;
  }
  localStorage.setItem('ts_apps_script_url', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const minMap = new Map(items.map(x => [String(x.itemNumber), x.min]));
      items = data.map((row, i) => {
        const itemNum = String(row.itemNumber || '').trim();
        return {
          id: i + 1,
          opname: row.opname || '',
          location: row.location || '',
          stock: Number(row.stock) || 0,
          min: minMap.has(itemNum) ? minMap.get(itemNum) : (Number(row.min) || 10),
          itemNumber: itemNum,
          productName: row.productName || '',
          licensePlate: row.licensePlate || ''
        };
      });
      saveData();
      renderAll();
      if (!silent) closeModal('apps-script-modal');
    } else if (!silent) {
      alert('Format data dari Apps Script kosong atau tidak sesuai.');
    }
  } catch (err) {
    if (!silent) alert('Gagal mengambil data dari Apps Script: ' + err.message);
  }
}

document.getElementById('chart-sort').addEventListener('change', () => {
  currentPage = 1;
  renderCharts();
});

document.getElementById('page-size').addEventListener('change', () => {
  currentPage = 1;
  renderCharts();
});

document.getElementById('scroll-speed').addEventListener('change', () => {
  if (autoScrollActive) startAutoScroll();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('btn-akasha-gold', 'fw-bold');
      b.classList.add('btn-outline-secondary', 'fw-semibold');
    });
    btn.classList.remove('btn-outline-secondary', 'fw-semibold');
    btn.classList.add('btn-akasha-gold', 'fw-bold');
    currentFilter = btn.dataset.filter;
    renderTable();
    lucide.createIcons();
  });
});

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderTable();
  lucide.createIcons();
});

document.getElementById('edit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = Number(document.getElementById('edit-id').value);
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = {
      ...items[idx],
      stock: Number(document.getElementById('edit-stock').value),
      min: Number(document.getElementById('edit-min').value),
      opname: document.getElementById('edit-opname').value.trim()
    };
    saveData();
    renderAll();
  }
  closeModal('edit-modal');
});

// Scheduled Auto-Sync at 07:00, 12:00, 16:00, and 23:00
const SCHEDULED_HOURS = [7, 12, 16, 23];
let lastScheduledSyncKey = '';

function checkScheduledSync() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (SCHEDULED_HOURS.includes(h) && m === 0) {
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${h}`;
    if (lastScheduledSyncKey !== key) {
      lastScheduledSyncKey = key;
      syncFromAppsScript(true);
    }
  }
}
setInterval(checkScheduledSync, 30000);

// Init
if (!localStorage.getItem('ts_apps_script_url')) {
  localStorage.setItem('ts_apps_script_url', DEFAULT_APPS_SCRIPT_URL);
}
renderAll();
syncFromAppsScript(true);
