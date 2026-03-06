let rawData = [];
let charts = {};
let selectedMonth = 'all';
let selectedCategory = 'all';
let selectedSize = 'all';

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
    populateCategoryButtons();
    populateSizeButtons();
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

function populateCategoryButtons() {
  const container = document.getElementById('categoryButtons');
  if (!container) return;
  
  const categories = new Set();
  rawData.forEach(r => {
    categories.add(r.Category);
  });
  
  // Add "All" categories button
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.dataset.category = 'all';
  allBtn.addEventListener('click', function() {
    selectCategory(this);
  });
  container.appendChild(allBtn);
  
  // Add individual category buttons
  Array.from(categories).sort().forEach(category => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = category;
    btn.dataset.category = category;
    btn.addEventListener('click', function() {
      selectCategory(this);
    });
    container.appendChild(btn);
  });
}

function populateSizeButtons() {
  const container = document.getElementById('sizeButtons');
  if (!container) return;
  
  const sizes = new Set();
  rawData.forEach(r => {
    if (r.Size) sizes.add(r.Size);
  });
  
  // Add "All" sizes button
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.dataset.size = 'all';
  allBtn.addEventListener('click', function() {
    selectSize(this);
  });
  container.appendChild(allBtn);
  
  // Add individual size buttons
  Array.from(sizes).sort().forEach(size => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = size;
    btn.dataset.size = size;
    btn.addEventListener('click', function() {
      selectSize(this);
    });
    container.appendChild(btn);
  });
}

function selectMonth(btn) {
  document.querySelectorAll('#monthButtons .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedMonth = btn.dataset.month;
  updateDashboard();
}

function selectCategory(btn) {
  document.querySelectorAll('#categoryButtons .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedCategory = btn.dataset.category;
  updateDashboard();
}

function selectSize(btn) {
  document.querySelectorAll('#sizeButtons .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedSize = btn.dataset.size;
  updateDashboard();
}

function setupEventListeners() {
  setLastUpdated();
  // Add search functionality
  const searchInput = document.getElementById('dataSearch');
  if (searchInput) {
    searchInput.addEventListener('input', updateDataTable);
  }
}

function setLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (el) {
    const now = new Date();
    el.innerText = now.toLocaleString();
  }
}

function getFilteredData() {
  let data = rawData;
  
  if (selectedMonth !== 'all') {
    data = data.filter(r => {
      const date = new Date(r.Date);
      return (date.getMonth() + 1).toString() === selectedMonth.toString();
    });
  }
  
  if (selectedCategory !== 'all') {
    data = data.filter(r => r.Category === selectedCategory);
  }
  
  if (selectedSize !== 'all') {
    data = data.filter(r => r.Size === selectedSize);
  }
  
  return data;
}

function updateDashboard() {
  const data = getFilteredData();
  updateKPIs(data);
  updateCharts(data);
  updateDataTable();
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
    return '₱' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const fmtPercent = (v) => v.toFixed(1) + '%';

  document.getElementById('kpiTransactions').innerText = transactions.toLocaleString();
  document.getElementById('kpiQty').innerText = totalQty.toLocaleString();
  document.getElementById('kpiRevenue').innerText = fmt(totalRevenue);
  document.getElementById('kpiCost').innerText = fmt(totalCost);
  document.getElementById('kpiProfit').innerText = fmt(netProfit);
  document.getElementById('kpiMargin').innerText = fmtPercent(profitMargin);
}


function updateCharts(data) {
  // Chart 1: Sales by Product Category (Bar Chart)
  const salesByCategory = {};
  data.forEach(r => {
    const cat = r.Category;
    salesByCategory[cat] = (salesByCategory[cat] || 0) + Number(r["Total Revenue"] || 0);
  });

  if (charts.salesByCategory) charts.salesByCategory.destroy();
  const ctx1 = document.getElementById('salesByCategoryChart').getContext('2d');
  charts.salesByCategory = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: Object.keys(salesByCategory),
      datasets: [{
        label: 'Total Revenue',
        data: Object.values(salesByCategory),
        backgroundColor: '#4a9eff',
        borderColor: '#2a7abf',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { 
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  // Chart 2: Sales Trend Over Time (Line Chart)
  const salesTrend = {};
  data.forEach(r => {
    const date = new Date(r.Date);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    salesTrend[dateKey] = (salesTrend[dateKey] || 0) + Number(r["Total Revenue"] || 0);
  });

  const sortedDates = Object.keys(salesTrend).sort();
  const trendData = sortedDates.map(date => salesTrend[date]);

  if (charts.salesTrend) charts.salesTrend.destroy();
  const ctx2 = document.getElementById('salesTrendChart').getContext('2d');
  charts.salesTrend = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Total Sales',
        data: trendData,
        borderColor: '#4ad96f',
        backgroundColor: 'rgba(74, 217, 111, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4ad96f',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { 
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  // Chart 3: Profit by Product Category (Bar Chart)
  const profitByCategory = {};
  data.forEach(r => {
    const cat = r.Category;
    const profit = Number(r["Total Revenue"] || 0) - Number(r["Total Cost"] || 0);
    profitByCategory[cat] = (profitByCategory[cat] || 0) + profit;
  });

  if (charts.profitByCategory) charts.profitByCategory.destroy();
  const ctx3 = document.getElementById('profitByCategoryChart').getContext('2d');
  charts.profitByCategory = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: Object.keys(profitByCategory),
      datasets: [{
        label: 'Net Profit',
        data: Object.values(profitByCategory),
        backgroundColor: Object.values(profitByCategory).map(v => v >= 0 ? '#4ad96f' : '#ff6b6b'),
        borderColor: '#2a7abf',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { 
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  // Chart 4: Cost Breakdown (Pie Chart)
  const costBreakdown = {
    'Cost of Goods Sold': data.reduce((s, r) => s + Number(r["COGS"] || 0), 0),
    'Operating Expenses': data.reduce((s, r) => s + Number(r["Operating Expenses"] || 0), 0),
    'Marketing Expenses': data.reduce((s, r) => s + Number(r["Marketing Expenses"] || 0), 0)
  };

  if (charts.costBreakdown) charts.costBreakdown.destroy();
  const ctx4 = document.getElementById('costBreakdownChart').getContext('2d');
  charts.costBreakdown = new Chart(ctx4, {
    type: 'pie',
    data: {
      labels: Object.keys(costBreakdown),
      datasets: [{
        data: Object.values(costBreakdown),
        backgroundColor: ['#ff6b6b', '#f9a825', '#6c5ce7'],
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

  // Chart 5: Top 10 Best Selling Products (Horizontal Bar Chart)
  const productSales = {};
  data.forEach(r => {
    const product = r.Item;
    productSales[product] = (productSales[product] || 0) + Number(r.Quantity || 0);
  });

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (charts.topProducts) charts.topProducts.destroy();
  const ctx5 = document.getElementById('topProductsChart').getContext('2d');
  charts.topProducts = new Chart(ctx5, {
    type: 'bar',
    data: {
      labels: topProducts.map(p => p[0]),
      datasets: [{
        label: 'Units Sold',
        data: topProducts.map(p => p[1]),
        backgroundColor: '#6bb6ff',
        borderColor: '#2a7abf',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      indexAxis: 'y',
      scales: { 
        x: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

function updateDataTable() {
  const data = getFilteredData();
  const searchTerm = document.getElementById('dataSearch').value.toLowerCase();
  
  // Group data by product
  const productData = {};
  data.forEach(r => {
    const product = r.Item;
    if (!productData[product]) {
      productData[product] = {
        product: product,
        category: r.Category,
        unitsSold: 0,
        revenue: 0,
        cost: 0,
        profit: 0
      };
    }
    productData[product].unitsSold += Number(r.Quantity || 0);
    productData[product].revenue += Number(r["Total Revenue"] || 0);
    productData[product].cost += Number(r["Total Cost"] || 0);
    productData[product].profit += Number(r["Net Income"] || 0);
  });
  
  // Convert to array and filter by search
  let tableData = Object.values(productData);
  if (searchTerm) {
    tableData = tableData.filter(item => 
      item.product.toLowerCase().includes(searchTerm) || 
      item.category.toLowerCase().includes(searchTerm)
    );
  }
  
  // Sort by units sold descending
  tableData.sort((a, b) => b.unitsSold - a.unitsSold);
  
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';
  
  tableData.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.product}</td>
      <td>${item.category}</td>
      <td>${item.unitsSold.toLocaleString()}</td>
      <td>₱${Math.round(item.revenue).toLocaleString()}</td>
      <td>₱${Math.round(item.cost).toLocaleString()}</td>
      <td>₱${Math.round(item.profit).toLocaleString()}</td>
    `;
    tbody.appendChild(row);
  });
}
