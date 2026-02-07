// Test script to check MR Dashboard API
const API_BASE = "http://localhost:8080";

// You'll need to replace this with a valid JWT token from your browser's localStorage
// To get it: Open browser console on the MR Dashboard and run: localStorage.getItem('kavya_auth_token')
const AUTH_TOKEN = "YOUR_TOKEN_HERE";

async function testDashboardAPI() {
    console.log("Testing MR Dashboard API...\n");

    try {
        const response = await fetch(`${API_BASE}/api/mr-dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Status:", response.status);
        console.log("Status Text:", response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log("\nDashboard Data:");
            console.log(JSON.stringify(data, null, 2));

            console.log("\nParsed Values:");
            console.log("- Sales:", data.sales);
            console.log("- Target Percent:", data.targetPercent);
            console.log("- Visits:", data.visits);
            console.log("- Expenses Pending:", data.expensesPending);
            console.log("- Expenses Approved:", data.expensesApproved);
        } else {
            const text = await response.text();
            console.error("\nError Response:", text);
        }
    } catch (error) {
        console.error("\nFetch Error:", error.message);
    }
}

testDashboardAPI();
