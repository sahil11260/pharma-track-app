document.addEventListener("DOMContentLoaded", () => {
  // Initialize Empty Charts so they can be updated
  initCharts();
  fetchDashboardData();
});

function initCharts() {
  const expenseCtx = document.getElementById("expenseChart").getContext("2d");
  new Chart(expenseCtx, {
    type: "pie",
    data: { labels: [], datasets: [{ data: [], backgroundColor: ["#0d6efd", "#ffc107", "#28a745", "#dc3545"] }] },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

async function fetchDashboardData() {
  try {
    // 1. Fetch Users (Managers & MRs)
    const usersResponse = await fetch('http://localhost:8081/api/users');
    const users = await usersResponse.json();

    const managersCount = users.filter(user => user.role === 'MANAGER').length;
    const mrsCount = users.filter(user => user.role === 'MR').length;

    document.getElementById('totalManagersDisplay').textContent = managersCount;
    document.getElementById('totalMRsDisplay').textContent = mrsCount;

    // 2. Fetch Doctors
    const doctorsResponse = await fetch('http://localhost:8081/api/doctors');
    const doctors = await doctorsResponse.json();
    document.getElementById('totalDoctorsDisplay').textContent = doctors.length;

    // 3. Fetch Expenses & Calculate Stats
    const expensesResponse = await fetch('http://localhost:8081/api/expenses');
    const expenses = await expensesResponse.json();

    // Calculate expense breakdown by category
    const expenseMap = {};
    expenses.forEach(exp => {
      expenseMap[exp.category] = (expenseMap[exp.category] || 0) + exp.amount;
    });

    // Update Expense Chart if available
    updateExpenseChart(expenseMap);

    // 4. Fetch Targets for Sales & Visits
    const targetsResponse = await fetch('http://localhost:8081/api/targets');
    const targets = await targetsResponse.json();

    let totalSales = 0;

    targets.forEach(t => {
      // Ensure we handle nulls
      totalSales += (t.salesAchievement || 0);
    });

    document.getElementById('totalSalesDisplay').textContent = `₹${totalSales.toLocaleString()}`;

    // 5. Populate Top MRs (Mock logic or use sorted targets)
    const topMRs = targets
      .sort((a, b) => (b.achievementPercentage || 0) - (a.achievementPercentage || 0))
      .slice(0, 5);

    const topMRList = document.getElementById('topMRList');
    topMRList.innerHTML = '';

    topMRs.forEach((mr, index) => {
      let badgeColor = 'text-warning';
      if (index === 0) badgeColor = 'text-success';
      if (index === 1) badgeColor = 'text-success';
      if (index === 2) badgeColor = 'text-primary';
      if ((mr.achievementPercentage || 0) < 50) badgeColor = 'text-danger';

      const medals = ['🥇', '🥈', '🥉'];
      const medal = medals[index] || '';

      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
            <div>
              <strong>${medal} ${mr.mrName || 'Unknown MR'}</strong>
              <small class="d-block text-muted">Period: ${mr.period || 'N/A'}</small>
            </div>
            <span class="fw-bold ${badgeColor}">${mr.achievementPercentage || 0}%</span>
          `;
      topMRList.appendChild(li);
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }
}

function updateExpenseChart(dataMap) {
  const canvas = document.getElementById("expenseChart");
  const chartInstance = Chart.getChart(canvas);

  if (chartInstance) {
    chartInstance.data.labels = Object.keys(dataMap);
    chartInstance.data.datasets[0].data = Object.values(dataMap);
    chartInstance.update();
  }
}
