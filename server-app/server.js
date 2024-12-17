const fs = require("fs");
const webPush = require("web-push");
const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Express setup
const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(cors());

// Connect to SQLite database (creates the file if it doesn't exist)
const db = new sqlite3.Database("./locations.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Create table if it doesn't exist
// Update the table creation logic
db.run(
  `CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    driverName TEXT,
    corridaNumber TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    }
  },
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
      console.error("Error creating table:", err.message);
    }
  },
);

// POST endpoint to receive location data
app.post("/api/location", (req, res) => {
  const { latitude, longitude, driverName, corridaNumber } = req.body;

  // Validate latitude/longitude
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "Invalid latitude or longitude." });
  }

  // Optional: Validate driverName, corrida if needed (e.g. typeof string, not empty)
  // e.g., if (!driverName) { return res.status(400).json({ error: 'Driver name is required.' }) }

  // Prepare SQL statement with extra columns for driverName and corrida
  const stmt = db.prepare(`
    INSERT INTO locations (latitude, longitude, driverName, corridaNumber)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(
    latitude,
    longitude,
    driverName || null,
    corridaNumber || null,
    function (err) {
      if (err) {
        console.error("Error inserting data:", err.message);
        return res.status(500).json({ error: "Failed to save location data." });
      } else {
        console.log(
          `Location data saved with ID: ${this.lastID}, 
         driverName: ${driverName}, 
         corridaNumber: ${corridaNumber}, 
         timestamp: ${new Date().toLocaleString()}`,
        );
        return res
          .status(200)
          .json({ message: "Location data saved.", id: this.lastID });
      }
    },
  );

  stmt.finalize();
});

if (!fs.existsSync("subscriptions.json")) {
  fs.writeFileSync("subscriptions.json", JSON.stringify([]));
}
// Load subscriptions from file
let subscriptions = require("./subscriptions.json");

// POST endpoint to store or update subscription by driverName + corridaNumber
app.post("/api/subscribe", (req, res) => {
  // Expect body like: { driverName, corridaNumber, subscription: {...} }
  const { driverName, corridaNumber, subscription } = req.body;

  if (!driverName || !corridaNumber || !subscription) {
    return res
      .status(400)
      .json({ error: "Missing driverName, corridaNumber, or subscription." });
  }

  // Find existing subscription with matching driverName + corridaNumber
  const existingIndex = subscriptions.findIndex(
    (sub) =>
      sub.driverName === driverName && sub.corridaNumber === corridaNumber,
  );

  if (existingIndex >= 0) {
    // REPLACE the old subscription with the new one
    subscriptions[existingIndex].subscription = subscription;
    console.log(
      `Updated subscription for driverName=${driverName}, corridaNumber=${corridaNumber}`,
    );
  } else {
    // Add a new subscription object
    subscriptions.push({ driverName, corridaNumber, subscription });
    console.log(
      `New subscription added: driverName=${driverName}, corridaNumber=${corridaNumber}`,
    );
  }

  // Save updated subscriptions to file
  fs.writeFileSync(
    "subscriptions.json",
    JSON.stringify(subscriptions, null, 2),
  );
  return res
    .status(201)
    .json({ message: "Subscription stored/updated successfully." });
});

// GET endpoint to retrieve all location data
app.get("/api/location", (req, res) => {
  db.all("SELECT * FROM locations", [], (err, rows) => {
    if (err) {
      console.error("Error retrieving data:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to retrieve location data." });
    } else {
      return res.status(200).json(rows);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// WEB PUSH CONFIG
const vapidKeys = {
  publicKey:
    "BBxYaFUxGyX1LJWoek5zZZwS04IfX3U1wHclg51a5K8ss51Zpi0ib2KP7wfTiAs6CAfPx2CvRPOokMpGxiS0bCo",
  privateKey: "BpWsRNyQW5almR4wnPUv4RV6E5adH_lPa8GeRgMEhBI",
};

webPush.setVapidDetails(
  "mailto:victorscunha@outlook.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

// Helper to send a single notification
function sendNotification(subscription, payload) {
  webPush.sendNotification(subscription, payload).catch((err) => {
    console.error("Error sending notification:", err);
  });
}

// Periodic notification example (random interval between 5 and 10 minutes)
function randomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function sendRandomNotification() {
  // Reload subscriptions each time to pick up changes
  subscriptions = JSON.parse(fs.readFileSync("subscriptions.json", "utf8"));

  subscriptions.forEach((sub) => {
    // Build payload with driverName/corridaNumber
    const payload = JSON.stringify({
      title: "Corrida Notification",
      body: "",
      driverName: sub.driverName,
      corridaNumber: sub.corridaNumber,
      silent: true,
    });
    sendNotification(sub.subscription, payload);
  });

  setTimeout(sendRandomNotification, randomInterval(300000, 600000)); // 5-10 min
}

// Start the notifications scheduler
sendRandomNotification();
console.log("Push notification scheduler running...");

const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET; // Loaded from .env
const EMAIL_USER = "victorscunha92@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS; // Possibly an app password

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
        const confirmLink = `http://localhost:${port}/auth/confirm/${confirmToken}`;
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
          return res.json({
            message: "User registered. Confirmation email sent.",
          });
        });
      },
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
        db.run(
          "UPDATE users SET confirmed = 1 WHERE id = ?",
          [user.id],
          function (err2) {
            if (err2) {
              return res.status(500).send("Database update error.");
            }
            // Redirect to confirm.html after successful confirmation
            res.redirect("/confirm.html");
          },
        );
      },
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
        return res
          .status(403)
          .json({ error: "Please confirm your email first." });
      }
      // If not enabled => role = null (they see pending)
      let role = user.role; // might be "admin" or "standard" or null
      if (user.enabled === 0) {
        role = null;
      }
      // Generate JWT
      const token = jwt.sign({ email: user.email, role }, JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token, role });
    },
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
  db.all(
    "SELECT id, email, confirmed, enabled, role FROM users",
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Database error." });
      }
      // Return list of users
      res.json(
        rows.map((u) => ({
          email: u.email,
          confirmed: !!u.confirmed,
          enabled: !!u.enabled,
          role: u.role,
        })),
      );
    },
  );
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
    },
  );
});

app.post("/admin/deleteUser", adminAuth, (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  db.run("DELETE FROM users WHERE email = ?", [email], function (err) {
    if (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ error: "Database error." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ success: true });
  });
});
