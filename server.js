const express = require("express");
const cors = require("cors");
const axios = require("axios");
const Database = require("better-sqlite3");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ======================
// 🔑 SignalWire 配置
// ======================
const PROJECT_ID = "YOUR_PROJECT_ID";
const TOKEN = "YOUR_TOKEN";
const SPACE_URL = "https://miali.signalwire.com";
const FROM_NUMBER = "+12094870600";

// ======================
// 🧠 SQLite (better-sqlite3)
// ======================
const db = new Database("sms.db");

// 初始化表（同步写法）
db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    sender TEXT,
    receiver TEXT,
    message TEXT,
    time INTEGER
)
`).run();

// ======================
// 💾 保存消息
// ======================
function saveMessage(type, sender, receiver, message) {
    db.prepare(`
        INSERT INTO messages (type, sender, receiver, message, time)
        VALUES (?, ?, ?, ?, ?)
    `).run(type, sender, receiver, message, Date.now());
}

// ======================
// 📥 获取消息
// ======================
app.get("/messages", (req, res) => {
    const rows = db.prepare(`
        SELECT * FROM messages ORDER BY time ASC
    `).all();

    res.json(rows);
});

// ======================
// 📤 发送短信
// ======================
app.post("/send", async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: "missing to or message" });
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

        saveMessage("outgoing", FROM_NUMBER, to, message);

        res.json({
            success: true,
            sid: response.data.sid
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================
// 📥 webhook 接收短信
// ======================
app.post("/receive", (req, res) => {
    const from = req.body.From;
    const body = req.body.Body;

    saveMessage("incoming", from, FROM_NUMBER, body);

    res.sendStatus(200);
});

// ======================
// 🚀 启动服务（Render必备）
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("CRM running on port", PORT);
});

module.exports = app;
