require('dotenv').config(); 
const axios = require('axios'); 
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

var depots = {
  "depots": [
    {
      "ID": 2,
      "MechanicHours": 135
    },
    {
      "ID": 3,
      "MechanicHours": 188
    },
    {
      "ID": 4,
      "MechanicHours": 97
    }
  ]
}

var vehicles = {
  "vehicles": [
    {
      "TaskID": "f0ffce68-4707-4e5e-9d0a-58610428e062",
      "Duration": 6,
      "Impact": 10
    },
    {
      "TaskID": "f3de985b-5aa8-40d3-823b-eae2bfb68e75",
      "Duration": 5,
      "Impact": 10
    },
    {
      "TaskID": "e506858d-502c-4d37-b8a9-ac14fd76fd66",
      "Duration": 6,
      "Impact": 3
    },
    {
      "TaskID": "33cdc208-7beb-4135-adc3-ba33cf56255f",
      "Duration": 4,
      "Impact": 1
    },
    {
      "TaskID": "40030af1-53fe-4371-ad5c-f19058a4607b",
      "Duration": 7,
      "Impact": 7
    },
    {
      "TaskID": "05f80a9c-7730-4511-ac39-6f878276c023",
      "Duration": 3,
      "Impact": 7
    },
    {
      "TaskID": "d0836ad1-a7ef-4f6c-95ee-fb2ae8b6dfd8",
      "Duration": 4,
      "Impact": 1
    },
    {
      "TaskID": "300c8465-4bea-46a0-9e82-9034dc1199b7",
      "Duration": 7,
      "Impact": 9
    },
    {
      "TaskID": "cfe42b4b-5267-43fa-b4ad-c08f183c693e",
      "Duration": 8,
      "Impact": 2
    },
    {
      "TaskID": "27008a37-67f2-41d7-9eb5-b58d91a7c19e",
      "Duration": 4,
      "Impact": 2
    },
    {
      "TaskID": "995f40f9-1b78-4813-9c33-c8f9dbaf1fe3",
      "Duration": 8,
      "Impact": 5
    },
    {
      "TaskID": "98fdcac9-5478-41c2-9015-7c98ba89411a",
      "Duration": 6,
      "Impact": 3
    },
    {
      "TaskID": "56418d19-13a0-4374-8595-3bc44cb788b0",
      "Duration": 8,
      "Impact": 1
    },
    {
      "TaskID": "1a327c5e-69c6-4375-aa2c-70c5cddf64d6",
      "Duration": 4,
      "Impact": 5
    },
    {
      "TaskID": "17fe485d-b090-42c9-b751-f0312617499a",
      "Duration": 5,
      "Impact": 1
    },
    {
      "TaskID": "b808b022-36c7-43f0-9d0d-473254191292",
      "Duration": 6,
      "Impact": 10
    },
    {
      "TaskID": "47e913bf-aeb8-4da2-b106-adf8527da719",
      "Duration": 7,
      "Impact": 5
    },
    {
      "TaskID": "05ee4145-5a87-424b-8c4a-2d5eaa540e98",
      "Duration": 7,
      "Impact": 10
    },
    {
      "TaskID": "4bf4c144-0ec1-449f-ad0b-2799f0344d85",
      "Duration": 8,
      "Impact": 4
    },
    {
      "TaskID": "badda8bb-69b0-47a9-9448-42a73a09a77f",
      "Duration": 2,
      "Impact": 5
    },
    {
      "TaskID": "b2cc069e-710f-4ac3-9b35-687a6dbe408e",
      "Duration": 7,
      "Impact": 10
    },
    {
      "TaskID": "9b10e0e1-2562-4a76-b7ab-12645021bb8d",
      "Duration": 3,
      "Impact": 9
    },
    {
      "TaskID": "d313d202-cf78-4d4a-8aaf-3ae6efa38817",
      "Duration": 2,
      "Impact": 4
    },
    {
      "TaskID": "8e1aa1d3-a71e-43dd-8abd-a8c4715f120f",
      "Duration": 1,
      "Impact": 9
    },
    {
      "TaskID": "e9120dfe-a012-4058-8fd5-f02334b90437",
      "Duration": 7,
      "Impact": 1
    },
    {
      "TaskID": "2893458c-0095-4b2c-9844-64b8f6aaea88",
      "Duration": 2,
      "Impact": 1
    },
    {
      "TaskID": "3f0d0a1d-3fe9-4f0b-bc6d-3396e159616c",
      "Duration": 5,
      "Impact": 6
    },
    {
      "TaskID": "b77040e8-f018-4761-8db3-bdd6c9eb837e",
      "Duration": 3,
      "Impact": 6
    },
    {
      "TaskID": "5bd71241-3f19-495c-9029-7e96fdb841d6",
      "Duration": 1,
      "Impact": 6
    },
    {
      "TaskID": "684e7375-943f-40cb-bcf4-d4edd467d70f",
      "Duration": 5,
      "Impact": 8
    },
    {
      "TaskID": "bc8a99fb-7c59-4706-80d6-a2f1b9060511",
      "Duration": 7,
      "Impact": 7
    }
  ]
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

knapsack(vehicles.vehicles.map(v => ({ time: v.Duration, score: v.Impact })), depots.depots.reduce((sum, d) => sum + d.MechanicHours, 0))
    .then(result => {
        console.log("Max Score:", result.maxScore);
        console.log("Selected Tasks:", result.selectedTasks);
    });
