// server.js
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
// var path = require('path');

const app = express();
const port = 3000;

// var htmlPath = path.join(__dirname, "../client-app");

// app.use('/', express.static(htmlPath));

// Use middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to SQLite database (creates the file if it doesn't exist)
const db = new sqlite3.Database('./locations.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    }
  }
);

// POST endpoint to receive location data
app.post('/api/locacao', (req, res) => {
  const { latitude, longitude } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Invalid latitude or longitude.' });
  }

  const stmt = db.prepare('INSERT INTO locations (latitude, longitude) VALUES (?, ?)');
  stmt.run(latitude, longitude, function (err) {
    if (err) {
      console.error('Error inserting data:', err.message);
      return res.status(500).json({ error: 'Failed to save location data.' });
    } else {
      console.log(`Location data saved with ID: ${this.lastID} timestamp: ${Date.now().toLocaleString()}`);
      return res.status(200).json({ message: 'Location data saved.', id: this.lastID });
    }
  });
  stmt.finalize();
});

const fs = require('fs');
if (!fs.existsSync('subscriptions.json')) {
  fs.writeFileSync('subscriptions.json', JSON.stringify([]));
}
const subscriptions = require('./subscriptions.json');

app.post('/api/subscribe', (req, res) => {
    console.log('Received subscription:', req.body);
    const subscription = req.body;
    subscriptions.push(subscription); // Save subscription
    fs.writeFileSync('subscriptions.json', JSON.stringify(subscriptions));
    res.sendStatus(201);
});

// GET endpoint to retrieve all location data
app.get('/api/locacao', (req, res) => {
  db.all('SELECT * FROM locations', [], (err, rows) => {
    if (err) {
      console.error('Error retrieving data:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve location data.' });
    } else {
      return res.status(200).json(rows);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const webPush = require('web-push');

// Replace these with your generated keys
const vapidKeys = {
    publicKey: 'BBxYaFUxGyX1LJWoek5zZZwS04IfX3U1wHclg51a5K8ss51Zpi0ib2KP7wfTiAs6CAfPx2CvRPOokMpGxiS0bCo',
    privateKey: 'BpWsRNyQW5almR4wnPUv4RV6E5adH_lPa8GeRgMEhBI'
};

webPush.setVapidDetails(
    'mailto:victorscunha@outlook.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);



function sendNotification(subscription, payload) {
  webPush.sendNotification(subscription, payload).catch(err => {
      console.error('Error sending notification:', err);
  });
}

function randomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min); // Random in milliseconds
}

function sendRandomNotification() {
  const payload = JSON.stringify({
    title: '',
    body: '',
    silent: true
  });

  subscriptions.forEach(subscription => sendNotification(subscription, payload));

  // Schedule the next notification
  setTimeout(sendRandomNotification, randomInterval(300000, 600000)); // 5-10 minutes
}

// Start the random notifications
sendRandomNotification();

console.log('Push notification scheduler running...');

