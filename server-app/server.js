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
// Create table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  confirmed INTEGER DEFAULT 0, 
  enabled INTEGER DEFAULT 0,
  role TEXT,
  confirmToken TEXT
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

const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const path = require("path");

const JWT_SECRET = "MY_SUPER_SECRET"; // In production, use environment variables
const EMAIL_USER = "YOUR_EMAIL@gmail.com";
const EMAIL_PASS = "YOUR_EMAIL_PASSWORD";  // Possibly an app password

// Setup nodemailer (Gmail example)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 *  POST /auth/register
 *    1. Insert user into SQLite with confirmed=0, enabled=0
 *    2. Generate confirmToken
 *    3. Send confirmation email
 */
app.post("/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required." });
  }

  // Check if user already exists
  db.get("SELECT email FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (row) {
      return res.status(400).json({ error: "User already exists." });
    }

    // If user doesn't exist, create confirmToken and insert user
    const confirmToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1d" });
    db.run(
      `INSERT INTO users (email, password, confirmed, enabled, role, confirmToken)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, password, 0, 0, null, confirmToken],
      function (err2) {
        if (err2) {
          console.error("Error inserting user:", err2.message);
          return res.status(500).json({ error: "Error inserting user." });
        }

        // Send confirmation email
        const confirmLink = `http://localhost:3000/auth/confirm/${confirmToken}`;
        const mailOptions = {
          from: EMAIL_USER,
          to: email,
          subject: "Confirm your account",
          html: `
            <h4>Thanks for registering!</h4>
            <p>Please confirm your account by clicking the link below:</p>
            <a href="${confirmLink}">${confirmLink}</a>
          `,
        };

        transporter.sendMail(mailOptions, (err3) => {
          if (err3) {
            console.error("Error sending email:", err3);
            return res.status(500).json({ error: "Error sending email." });
          }
          return res.json({ message: "User registered. Confirmation email sent." });
        });
      }
    );
  });
});

/**
 * GET /auth/confirm/:token
 *   Confirms a user's email (sets confirmed=1).
 *   Then redirects to /confirm.html
 */
app.get("/auth/confirm/:token", (req, res) => {
  const { token } = req.params;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Find the user matching email and confirmToken
    db.get(
      "SELECT id, email, confirmToken FROM users WHERE email = ? AND confirmToken = ?",
      [payload.email, token],
      (err, user) => {
        if (err || !user) {
          return res.status(400).send("Invalid confirmation link.");
        }
        // Update confirmed=1
        db.run("UPDATE users SET confirmed = 1 WHERE id = ?", [user.id], function (err2) {
          if (err2) {
            return res.status(500).send("Database update error.");
          }
          // Redirect to confirm.html after successful confirmation
          res.redirect("/confirm.html");
        });
      }
    );
  } catch (err) {
    res.status(400).send("Invalid or expired token.");
  }
});

/**
 * POST /auth/login
 *   1. Check email/password
 *   2. If user not confirmed => error
 *   3. If user confirmed but not enabled => role=null
 *   4. If confirmed & enabled => role=admin or standard
 */
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (err) {
        console.error("Login DB error:", err);
        return res.status(500).json({ error: "Database error." });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials." });
      }
      if (user.confirmed === 0) {
        return res.status(403).json({ error: "Please confirm your email first." });
      }
      // If not enabled => role = null (they see pending)
      let role = user.role; // might be "admin" or "standard" or null
      if (user.enabled === 0) {
        role = null;
      }
      // Generate JWT
      const token = jwt.sign({ email: user.email, role }, JWT_SECRET, { expiresIn: "1h" });
      res.json({ token, role });
    }
  );
});

/** Middleware to verify JWT for admin routes **/
function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided." });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access only." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
}

/**
 * GET /admin/users
 *  Admin-only route to list all users
 */
app.get("/admin/users", adminAuth, (req, res) => {
  db.all("SELECT id, email, confirmed, enabled, role FROM users", [], (err, rows) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error." });
    }
    // Return list of users
    res.json(rows.map(u => ({
      email: u.email,
      confirmed: !!u.confirmed,
      enabled: !!u.enabled,
      role: u.role,
    })));
  });
});

/**
 * POST /admin/updateUser
 *  Admin-only route to update a user's 'enabled' and 'role'
 */
app.post("/admin/updateUser", adminAuth, (req, res) => {
  const { email, enabled, role } = req.body;
  // Convert enabled boolean to integer 0 or 1
  const enabledVal = enabled ? 1 : 0;

  db.run(
    "UPDATE users SET enabled = ?, role = ? WHERE email = ?",
    [enabledVal, role, email],
    function (err) {
      if (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({ error: "Database error." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "User not found." });
      }
      res.json({ success: true });
    }
  );
});
