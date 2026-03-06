// global variables
let rawData = [];
let salesByCategoryChart, salesTrendChart, profitByCategoryChart, costBreakdownChart, topProductsChart;

// formatters
const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });
const percentFormatter = value => value.toFixed(2) + '%';

// load csv and initialize
function loadData() {
  Papa.parse('coffee_shop_data.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      rawData = results.data;
      initFilters();
      refreshDashboard();
    }
  });
}

function initFilters() {
  const categories = new Set(['All']);
  const sizes = new Set(['All']);
  rawData.forEach(r => {
    categories.add(r.Category);
    sizes.add(r.Size);
  });

  const catSel = document.getElementById('categoryFilter');
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSel.appendChild(opt);
  });

  const sizeSel = document.getElementById('sizeFilter');
  sizes.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sizeSel.appendChild(opt);
  });

  catSel.addEventListener('change', refreshDashboard);
  sizeSel.addEventListener('change', refreshDashboard);
}

function refreshDashboard() {
  const filtered = applyFilters();
  updateKPIs(filtered);
  updateCharts(filtered);
  populateTable(filtered);
}

function applyFilters() {
  const cat = document.getElementById('categoryFilter').value;
  const size = document.getElementById('sizeFilter').value;
  return rawData.filter(r => {
    if (cat !== 'All' && r.Category !== cat) return false;
    if (size !== 'All' && r.Size !== size) return false;
    return true;
  });
}

function updateKPIs(data) {
  let totalRevenue = 0;
  let totalCost = 0;
  data.forEach(r => {
    const price = Number(r['Unit Price'] || r.Price || 0);
    const units = Number(r.Quantity || r.UnitsSold || 0);
    const costUnit = Number(r.Cost || r.CostPerUnit || 0);
    totalRevenue += price * units;
    totalCost += costUnit * units;
  });
  const netProfit = totalRevenue - totalCost;
  const margin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;

  document.getElementById('totalSales').textContent = currencyFormatter.format(totalRevenue);
  document.getElementById('totalCost').textContent = currencyFormatter.format(totalCost);
  document.getElementById('netProfit').textContent = currencyFormatter.format(netProfit);
  document.getElementById('profitMargin').textContent = percentFormatter(margin);
}

function updateCharts(data) {
  const byCategory = {};
  const profitByCat = {};
  const trend = {}; // date -> revenue
  const costBreakdown = { COGS: 0, Operating: 0, Marketing: 0 };
  const productSales = {};

  data.forEach(r => {
    // adapt fields from coffee_shop_data.csv
    const price = Number(r['Unit Price'] || r.Price || 0);
    const units = Number(r.Quantity || r.UnitsSold || 0);
    const costUnit = Number(r.Cost || r.CostPerUnit || 0);
    const revenue = price * units;
    const cost = costUnit * units;
    const profit = revenue - cost;

    // category totals
    byCategory[r.Category] = (byCategory[r.Category] || 0) + revenue;
    profitByCat[r.Category] = (profitByCat[r.Category] || 0) + profit;

    // trend
    if (r.Date) {
      trend[r.Date] = (trend[r.Date] || 0) + revenue;
    }

    // cost breakdown
    costBreakdown.COGS += cost;
    costBreakdown.Operating += Number(r['Operating Expenses'] || r.OperatingExpenses || 0);
    costBreakdown.Marketing += Number(r['Marketing Expenses'] || r.MarketingExpenses || 0);

    // product sales
    productSales[r.Item || r.Product] = (productSales[r.Item || r.Product] || 0) + units;
  });

  // sales by category chart
  const catLabels = Object.keys(byCategory);
  const catValues = catLabels.map(l => byCategory[l]);
  salesByCategoryChart.data.labels = catLabels;
  salesByCategoryChart.data.datasets[0].data = catValues;
  salesByCategoryChart.update();

  // profit by category
  const profitLabels = Object.keys(profitByCat);
  const profitVals = profitLabels.map(l => profitByCat[l]);
  profitByCategoryChart.data.labels = profitLabels;
  profitByCategoryChart.data.datasets[0].data = profitVals;
  profitByCategoryChart.update();

  // sales trend
  const trendLabels = Object.keys(trend).sort((a,b)=> new Date(a) - new Date(b));
  const trendVals = trendLabels.map(d => trend[d]);
  salesTrendChart.data.labels = trendLabels;
  salesTrendChart.data.datasets[0].data = trendVals;
  salesTrendChart.update();

  // cost breakdown pie
  costBreakdownChart.data.labels = ['COGS','Operating Expenses','Marketing Expenses'];
  costBreakdownChart.data.datasets[0].data = [costBreakdown.COGS, costBreakdown.Operating, costBreakdown.Marketing];
  costBreakdownChart.update();

  // top products
  const prodArr = Object.entries(productSales).map(([prod,qty])=>({prod,qty}));
  prodArr.sort((a,b)=>b.qty - a.qty);
  const top = prodArr.slice(0,10);
  topProductsChart.data.labels = top.map(o=>o.prod);
  topProductsChart.data.datasets[0].data = top.map(o=>o.qty);
  topProductsChart.update();
}

function populateTable(data) {
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';
  data.forEach(r => {
    const price = Number(r['Unit Price'] || r.Price || 0);
    const units = Number(r.Quantity || r.UnitsSold || 0);
    const costUnit = Number(r.Cost || r.CostPerUnit || 0);
    const revenue = price * units;
    const cost = costUnit * units;
    const profit = revenue - cost;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.Item || r.Product}</td>
                    <td>${r.Category}</td>
                    <td>${units}</td>
                    <td>${currencyFormatter.format(revenue)}</td>
                    <td>${currencyFormatter.format(cost)}</td>
                    <td>${currencyFormatter.format(profit)}</td>`;
    tbody.appendChild(tr);
  });
}

// initialize empty charts
function createCharts() {
  const categoryCtx = document.getElementById('salesByCategoryChart').getContext('2d');
  salesByCategoryChart = new Chart(categoryCtx, {
    type: 'bar',
    data: {labels: [], datasets:[{label:'Revenue',backgroundColor:'#3366cc',data:[]}]},
    options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}}
  });

  const trendCtx = document.getElementById('salesTrendChart').getContext('2d');
  salesTrendChart = new Chart(trendCtx, {
    type:'line',
    data:{labels:[],datasets:[{label:'Total Sales',borderColor:'#3366cc',fill:false,data:[]}]},
    options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}}
  });

  const profitCtx = document.getElementById('profitByCategoryChart').getContext('2d');
  profitByCategoryChart = new Chart(profitCtx, {
    type:'bar',
    data:{labels:[],datasets:[{label:'Net Profit',backgroundColor:'#33cc33',data:[]}]},
    options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}}
  });

  const costCtx = document.getElementById('costBreakdownChart').getContext('2d');
  costBreakdownChart = new Chart(costCtx, {
    type:'pie',
    data:{labels:[],datasets:[{backgroundColor:['#ff6600','#cc33cc','#ffcc00'],data:[]}]},
    options:{responsive:true, maintainAspectRatio:false}
  });

  const topCtx = document.getElementById('topProductsChart').getContext('2d');
  topProductsChart = new Chart(topCtx, {
    type:'bar',
    data:{labels:[],datasets:[{label:'Units Sold',backgroundColor:'#663399',data:[]}   ]},
    options:{indexAxis:'y',responsive:true, maintainAspectRatio:false, scales:{x:{beginAtZero:true}}}
  });
}

// run
createCharts();
loadData();
