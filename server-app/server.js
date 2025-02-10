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
    preciseLocation BOOLEAN,
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

// Create table for rides
db.run(
  `CREATE TABLE IF NOT EXISTS rides (
    hash TEXT PRIMARY KEY,
    departureLocation TEXT NOT NULL,
    finalLocation TEXT NOT NULL,
    driverName TEXT NOT NULL,
    rideId TEXT NOT NULL,
    phone TEXT,
    plate TEXT,
    status TEXT DEFAULT 'Waiting',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  (err) => {
    if (err) {
      console.error("Error creating rides table:", err.message);
    }
  },
);

// POST endpoint to receive location data
app.post("/location", (req, res) => {
  const { latitude, longitude, driverName, corridaNumber, preciseLocation } =
    req.body;

  // Validate latitude/longitude
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "Invalid latitude or longitude." });
  }

  // Optional: Validate driverName, corrida if needed (e.g. typeof string, not empty)
  // e.g., if (!driverName) { return res.status(400).json({ error: 'Driver name is required.' }) }

  // Prepare SQL statement with extra columns for driverName and corrida
  const stmt = db.prepare(`
    INSERT INTO locations (latitude, longitude, driverName, corridaNumber, preciseLocation)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    latitude,
    longitude,
    driverName || null,
    corridaNumber || null,
    preciseLocation || null,
    function (err) {
      if (err) {
        console.error("Error inserting data:", err.message);
        return res.status(500).json({ error: "Failed to save location data." });
      } else {
        console.log(
          `Location data saved with ID: ${this.lastID}, 
         driverName: ${driverName}, 
         corridaNumber: ${corridaNumber}, 
         timestamp: ${new Date().toLocaleString()},
         preciseLocation: ${preciseLocation}`,
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

// POST endpoint to store or update subscription by corridaNumber
app.post("/subscribe", (req, res) => {
  // Expect body like: { corridaNumber, subscription: {...} }
  const { corridaNumber, subscription } = req.body;

  if (!corridaNumber || !subscription) {
    return res
      .status(400)
      .json({ error: "Missing corridaNumber or subscription." });
  }

  // Find existing subscription with matching corridaNumber
  const existingIndex = subscriptions.findIndex(
    (sub) => sub.corridaNumber === corridaNumber,
  );

  if (existingIndex >= 0) {
    // REPLACE the old subscription with the new one
    subscriptions[existingIndex].subscription = subscription;
    console.log(`Updated subscription for orridaNumber=${corridaNumber}`);
  } else {
    // Add a new subscription object
    subscriptions.push({
      corridaNumber,
      subscription,
    });
    console.log(`New subscription added: corridaNumber=${corridaNumber}`);
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
app.get("/location", (req, res) => {
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

// POST endpoint to retrieve the most recent location for each unique driverName
app.post("/recent-locations", (req, res) => {
  const query = `
    SELECT driverName, latitude, longitude, corridaNumber, preciseLocation, MAX(timestamp) as timestamp
    FROM locations
    GROUP BY corridaNumber
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error retrieving recent locations:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to retrieve recent locations." });
    } else {
      return res.status(200).json(rows);
    }
  });
});

// POST endpoint to generate ride hash
app.post("/rides/generate", (req, res) => {
  console.log("Received ride data:", req.body);
  const { departureLocation, finalLocation, driverName, rideId, phone, plate } =
    req.body;

  if (!departureLocation || !finalLocation || !driverName || !rideId) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  const timestamp = Date.now();
  const hash = require("crypto")
    .createHash("md5")
    .update(`${timestamp}-${rideId}-${driverName}`)
    .digest("hex");

  const stmt = db.prepare(`
    INSERT INTO rides (hash, departureLocation, finalLocation, driverName, rideId, phone, plate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    hash,
    departureLocation,
    finalLocation,
    driverName,
    rideId,
    phone || null,
    plate || null,
    function (err) {
      if (err) {
        console.error("Error inserting ride:", err.message);
        return res.status(500).json({ error: "Failed to save ride data." });
      }
      return res.status(200).json({ hash });
    },
  );

  stmt.finalize();
});

// GET endpoint to retrieve ride information
app.get("/ride/:hash", (req, res) => {
  const { hash } = req.params;

  db.get("SELECT * FROM rides WHERE hash = ?", [hash], (err, row) => {
    if (err) {
      console.error("Error retrieving ride:", err.message);
      return res.status(500).json({ error: "Database error." });
    }
    if (!row) {
      return res.status(404).json({ error: "Ride not found." });
    }
    return res.status(200).json(row);
  });
});

app.get("/rides/all-rides", (req, res) => {
  try {
    db.all("SELECT * FROM rides ORDER BY timestamp DESC", [], (err, rows) => {
      if (err) {
        console.error("Error fetching rides:", err);
        return res.status(500).json({ error: "Database error." });
      }
      return res.status(200).json(rows);
    });
  } catch (error) {
    console.error("Error fetching rides:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new endpoint to update ride status
app.post("/ride/status", (req, res) => {
  const { hash, status } = req.body;

  if (!hash || !status) {
    return res.status(400).json({ error: "Hash and status are required." });
  }

  db.run(
    "UPDATE rides SET status = ? WHERE hash = ?",
    [status, hash],
    function (err) {
      if (err) {
        console.error("Error updating ride status:", err.message);
        return res.status(500).json({ error: "Failed to update ride status." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Ride not found." });
      }
      return res.status(200).json({ message: "Status updated successfully." });
    },
  );
});

// GET endpoint to retrieve ride information by corridaNumber
app.get("/rides/:corridaNumber", (req, res) => {
  const { corridaNumber } = req.params;

  db.get(
    "SELECT * FROM rides WHERE rideId = ?",
    [corridaNumber],
    (err, row) => {
      if (err) {
        console.error("Error retrieving ride:", err.message);
        return res.status(500).json({ error: "Database error." });
      }
      if (!row) {
        return res.status(404).json({ error: "Ride not found." });
      }

      // Transform the data to match the expected format
      const rideData = {
        corridaNumber: row.rideId,
        status: row.status,
        origin: row.departureLocation,
        destination: row.finalLocation,
        driverName: row.driverName,
      };

      return res.status(200).json(rideData);
    },
  );
});

// Add this endpoint before app.listen()
app.get("/location/check/:corridaNumber", (req, res) => {
  const { corridaNumber } = req.params;

  db.get(
    `SELECT COUNT(*) as count 
     FROM locations 
     WHERE corridaNumber = ?`,
    [corridaNumber],
    (err, row) => {
      if (err) {
        console.error("Error checking location:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      return res.json({ hasRecentLocation: row.count > 0 });
    },
  );
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
    if (err.statusCode === 410) {
      // Gone - subscription is no longer valid
      console.log("Subscription is no longer valid, removing...");
      subscriptions = subscriptions.filter(
        (s) => JSON.stringify(s.subscription) !== JSON.stringify(subscription),
      );
      fs.writeFileSync(
        "subscriptions.json",
        JSON.stringify(subscriptions, null, 2),
      );
    }
  });
}

// Periodic notification example (random interval between 5 and 10 minutes)
function randomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function sendRandomNotification() {
  // Reload subscriptions each time to pick up changes
  subscriptions = JSON.parse(fs.readFileSync("subscriptions.json", "utf8"));

  // Process each subscription asynchronously
  subscriptions.forEach((sub) => {
    // Check if ride exists and is running
    db.get(
      "SELECT status FROM rides WHERE rideId = ?",
      [sub.corridaNumber],
      (err, row) => {
        if (err) {
          console.error("Error checking ride status:", err);
          return;
        }

        if (!row || row.status !== "Running") {
          // Remove subscription if ride doesn't exist or isn't running
          console.log(
            `Removing subscription for ride ${sub.corridaNumber} - not running or doesn't exist`,
          );
          subscriptions = subscriptions.filter(
            (s) =>
              !(
                s.driverName === sub.driverName &&
                s.corridaNumber === sub.corridaNumber
              ),
          );
          fs.writeFileSync(
            "subscriptions.json",
            JSON.stringify(subscriptions, null, 2),
          );
          return;
        }

        // Build payload with driverName/corridaNumber
        const payload = JSON.stringify({
          title: "Corrida Notification",
          body: "",
          driverName: sub.driverName,
          corridaNumber: sub.corridaNumber,
          silent: true,
        });
        sendNotification(sub.subscription, payload);
      },
    );
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
