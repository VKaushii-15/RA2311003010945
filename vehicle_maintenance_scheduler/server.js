require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios'); // Added axios for external API calls
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// Middleware to refresh the authorization token
async function refreshAuthToken() {
    try {
        console.log("Refreshing authorization token...");
        const response = await axios.post('http://20.207.122.201/evaluation-service/auth/refresh', {
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET
        });
        process.env.ACCESS_TOKEN = response.data.accessToken;
        console.log("Authorization token refreshed successfully.");
    } catch (error) {
        console.error("Error refreshing authorization token:", error.response?.data || error.message);
        throw new Error("Failed to refresh authorization token");
    }
}

// Wrapper function to handle API requests with token refresh
async function makeApiRequest(url, options) {
    try {
        return await axios.get(url, options);
    } catch (error) {
        if (error.response?.status === 401) { // Unauthorized, token might be invalid
            await refreshAuthToken();
            options.headers['Authorization'] = `Bearer ${process.env.ACCESS_TOKEN}`;
            return await axios.get(url, options); // Retry with new token
        } else {
            throw error;
        }
    }
}

async function fetchDepots(req, res) {
    try {
        console.log("Fetching depots...");
        const response = await makeApiRequest('http://20.207.122.201/evaluation-service/depots', {
            headers: {
                'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
            }
        });
        const depots = response.data;
        console.log(depots);
        res.json(depots);
    } catch (error) {
        console.error("Error fetching depots:", error.response?.data || error.message);
        res.status(error.response?.status || 500).send(error.response?.data || "Error fetching depots");
    }
}

async function fetchVehicles(req, res) {
    try {
        console.log("Fetching vehicles...");
        const response = await makeApiRequest('http://20.207.122.201/evaluation-service/vehicles', {
            headers: {
                'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
            }
        });
        const vehicles = response.data;
        console.log(vehicles);
        res.json(vehicles);
    } catch (error) {
        console.error("Error fetching vehicles:", error.response?.data || error.message);
        res.status(error.response?.status || 500).send(error.response?.data || "Error fetching vehicles");
    }
}

async function knapsack(tasks, maxHours) {
    const n = tasks.length;
    const dp = Array.from({ length: n + 1 }, () => Array(maxHours + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const { time, score } = tasks[i - 1];
        for (let j = 0; j <= maxHours; j++) {
            if (time <= j) {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i - 1][j - time] + score);
            } else {
                dp[i][j] = dp[i - 1][j];
            }
        }
    }

    // Backtrack to find selected tasks
    const selectedTasks = [];
    let j = maxHours;
    for (let i = n; i > 0; i--) {
        if (dp[i][j] !== dp[i - 1][j]) {
            selectedTasks.push(tasks[i - 1]);
            j -= tasks[i - 1].time;
        }
    }

    return { maxScore: dp[n][maxHours], selectedTasks };
}

fetchDepots();
fetchVehicles();

