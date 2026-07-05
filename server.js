const express = require("express");
const axios = require("axios");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// 🌐 静态前端
// ======================
app.use(express.static(__dirname));

// ======================
// 🔑 SignalWire（先保留）
// ======================
const PROJECT_ID = "YOUR_PROJECT_ID";
const TOKEN = "YOUR_TOKEN";
const SPACE_URL = "https://miali.signalwire.com";
const FROM_NUMBER = "+12094870600";

// ======================
// 🧠 SQLite
// ======================
const db = new sqlite3.Database("sms.db");

db.run(`
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    sender TEXT,
    receiver TEXT,
    message TEXT,
    time INTEGER
)
`);

// ======================
// 📥 获取消息
// ======================
app.get("/messages", (req, res) => {
    db.all("SELECT * FROM messages ORDER BY time ASC", (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

// ======================
// 📤 发送短信
// ======================
app.post("/send", async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: "missing data" });
    }

    try {
        const response = await axios.post(
            `${SPACE_URL}/api/laml/2010-04-01/Accounts/${PROJECT_ID}/Messages.json`,
            new URLSearchParams({
                From: FROM_NUMBER,
                To: to,
                Body: message
            }),
            {
                auth: {
                    username: PROJECT_ID,
                    password: TOKEN
                }
            }
        );

        db.run(
            "INSERT INTO messages (type, sender, receiver, message, time) VALUES (?, ?, ?, ?, ?)",
            ["outgoing", FROM_NUMBER, to, message, Date.now()]
        );

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
});

// ======================
// 📥 webhook接收
// ======================
app.post("/receive", (req, res) => {
    const from = req.body.From;
    const body = req.body.Body;

    db.run(
        "INSERT INTO messages (type, sender, receiver, message, time) VALUES (?, ?, ?, ?, ?)",
        ["incoming", from, FROM_NUMBER, body, Date.now()]
    );

    res.sendStatus(200);
});

// ======================
// 🚀 启动
// ======================
const PORT = 3000;

app.listen(PORT, () => {
    console.log("CRM running on http://localhost:3000");
});
