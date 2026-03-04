let rawData = [];
let charts = {};
let selectedMonth = 'all';

// Configure Chart.js
Chart.defaults.color = '#8bb3ff';
Chart.defaults.font.family = 'Segoe UI';
Chart.defaults.font.size = 10;
Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.05)';
Chart.defaults.scale.ticks.color = '#8bb3ff';
Chart.defaults.plugins.legend.labels.color = '#fff';

// Load CSV
Papa.parse("coffee_shop_data.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  transformHeader: h => h.trim(),
  complete: function(results) {
    rawData = results.data.filter(r => r.Date && r.Category).map(r => {
      // Apply seasonal multipliers for peak seasons
      const date = new Date(r.Date);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // Christmas season: Dec 20-25 (multiplier: 2.5x)
      const isChristmas = month === 12 && day >= 20 && day <= 25;
      // Valentine's Day: Feb 10-15 (multiplier: 2x)
      const isValentines = month === 2 && day >= 10 && day <= 15;
      
      if (isChristmas) {
        return {
          ...r,
          Quantity: Number(r.Quantity || 0) * 2.5,
          'Total Revenue': Number(r['Total Revenue'] || 0) * 2.5,
          'Total Cost': Number(r['Total Cost'] || 0) * 2.5,
          'Net Income': Number(r['Net Income'] || 0) * 2.5,
          'Gross Profit': Number(r['Gross Profit'] || 0) * 2.5
        };
      } else if (isValentines) {
        return {
          ...r,
          Quantity: Number(r.Quantity || 0) * 2,
          'Total Revenue': Number(r['Total Revenue'] || 0) * 2,
          'Total Cost': Number(r['Total Cost'] || 0) * 2,
          'Net Income': Number(r['Net Income'] || 0) * 2,
          'Gross Profit': Number(r['Gross Profit'] || 0) * 2
        };
      }
      return r;
    });
    populateMonthButtons();
    setupEventListeners();
    setLastUpdated();
    updateDashboard();
  }
});

function getMonthName(monthNum) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNum - 1] || '';
}

function populateMonthButtons() {
  const container = document.getElementById('monthButtons');
  if (!container) return;
  
  const months = new Set();
  rawData.forEach(r => {
    const date = new Date(r.Date);
    const monthNum = date.getMonth() + 1;
    months.add(monthNum);
  });
  
  const sortedMonths = Array.from(months).sort((a, b) => a - b);
  
  // Add "All" months button
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.dataset.month = 'all';
  allBtn.addEventListener('click', function() {
    selectMonth(this);
  });
  container.appendChild(allBtn);
  
  // Add individual month buttons
  sortedMonths.forEach(monthNum => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = getMonthName(monthNum);
    btn.dataset.month = monthNum;
    btn.addEventListener('click', function() {
      selectMonth(this);
    });
    container.appendChild(btn);
  });
}

function selectMonth(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedMonth = btn.dataset.month;
  updateDashboard();
}

function setupEventListeners() {
  setLastUpdated();
}

function setLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (el) {
    const now = new Date();
    el.innerText = now.toLocaleString();
  }
}

function getFilteredData() {
  if (selectedMonth === 'all') {
    return rawData;
  }
  
  return rawData.filter(r => {
    const date = new Date(r.Date);
    return (date.getMonth() + 1).toString() === selectedMonth.toString();
  });
}

function updateDashboard() {
  const data = getFilteredData();
  updateKPIs(data);
  updateCharts(data);
  updateRevenueBar(data);
}

function updateKPIs(data) {
  const totalRevenue = data.reduce((s, r) => s + Number(r["Total Revenue"] || 0), 0);
  const totalCost = data.reduce((s, r) => s + Number(r["Total Cost"] || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;
  const transactions = data.length;
  const totalQty = data.reduce((s, r) => s + Number(r.Quantity || 0), 0);

  const fmt = (v) => {
    const num = Math.round(v);
    return '$' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  document.getElementById('kpiTransactions').innerText = transactions.toLocaleString();
  document.getElementById('kpiQty').innerText = totalQty.toLocaleString();
  document.getElementById('kpiRevenue').innerText = fmt(totalRevenue);
  document.getElementById('kpiProfit').innerText = fmt(netProfit);
  document.getElementById('kpiMargin').innerText = profitMargin.toFixed(1) + '%';
}


function updateCharts(data) {
  // Group by category for transactions
  const catTransactions = {};
  data.forEach(r => {
    const cat = r.Category;
    catTransactions[cat] = (catTransactions[cat] || 0) + 1;
  });

  // Chart 1: Category Transactions
  if (charts.categoryTrans) charts.categoryTrans.destroy();
  const ctx1 = document.getElementById('categoryTransChart').getContext('2d');
  charts.categoryTrans = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: Object.keys(catTransactions),
      datasets: [{
        data: Object.values(catTransactions),
        backgroundColor: '#4a9eff',
        borderColor: '#2a7abf',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      indexAxis: 'y',
      scales: { x: { beginAtZero: true } }
    }
  });

  // Chart 2: Weekday transactions
  const weekdayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const weekdayTrans = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  data.forEach(r => {
    const date = new Date(r.Date);
    const dayName = weekdayMap[date.getDay()];
    weekdayTrans[dayName]++;
  });

  if (charts.weekday) charts.weekday.destroy();
  const ctx2 = document.getElementById('weekdayChart').getContext('2d');
  charts.weekday = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: Object.keys(weekdayTrans),
      datasets: [{
        label: 'Transactions',
        data: Object.values(weekdayTrans),
        borderColor: '#4ad96f',
        backgroundColor: 'rgba(74, 217, 111, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4ad96f',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Chart 3: Monthly revenue
  const monthlyRev = {};
  data.forEach(r => {
    const date = new Date(r.Date);
    const monthKey = getMonthName(date.getMonth() + 1);
    monthlyRev[monthKey] = (monthlyRev[monthKey] || 0) + Number(r["Total Revenue"] || 0);
  });

  if (charts.monthly) charts.monthly.destroy();
  const ctx3 = document.getElementById('monthlyChart').getContext('2d');
  charts.monthly = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: Object.keys(monthlyRev),
      datasets: [{
        label: 'Revenue',
        data: Object.values(monthlyRev),
        backgroundColor: '#6bb6ff',
        borderColor: '#2a7abf',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Chart 4: Revenue distribution
  const catRevenue = {};
  data.forEach(r => {
    const cat = r.Category;
    catRevenue[cat] = (catRevenue[cat] || 0) + Number(r["Total Revenue"] || 0);
  });

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9a825', '#6c5ce7', '#00b894', '#fd79a8', '#fdcb6e', '#6c7a89', '#a29bfe'];

  if (charts.distribution) charts.distribution.destroy();
  const ctx4 = document.getElementById('revenueDistChart').getContext('2d');
  charts.distribution = new Chart(ctx4, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catRevenue),
      datasets: [{
        data: Object.values(catRevenue),
        backgroundColor: colors.slice(0, Object.keys(catRevenue).length),
        borderColor: '#0e2a52',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 9 } } }
      }
    }
  });
}

function updateRevenueBar(data) {
  const catRevenue = {};
  data.forEach(r => {
    const cat = r.Category;
    catRevenue[cat] = (catRevenue[cat] || 0) + Number(r["Total Revenue"] || 0);
  });

  const totalRevenue = Object.values(catRevenue).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(catRevenue).sort((a, b) => b[1] - a[1]);

  const container = document.getElementById('revenueBars');
  container.innerHTML = '';

  sorted.forEach(([cat, rev]) => {
    const percent = totalRevenue ? (rev / totalRevenue) * 100 : 0;
    const item = document.createElement('div');
    item.className = 'bar-item';
    item.innerHTML = `
      <div class="bar-label">${cat}</div>
      <div class="bar-value">$${Math.round(rev).toLocaleString()}</div>
      <div class="bar">
        <div class="bar-fill" style="width: ${percent}%"></div>
      </div>
    `;
    container.appendChild(item);
  });
}
