const express = require("express");
const axios = require("axios");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// 🔑 SignalWire 配置
// ======================
const PROJECT_ID = "YOUR_PROJECT_ID";
const TOKEN = "YOUR_TOKEN";
const SPACE_URL = "https://miali.signalwire.com";
const FROM_NUMBER = "+12094870600";

// ======================
// 🧠 SQLite 初始化
// ======================
const db = new sqlite3.Database("sms.db");

// 创建表
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
// 💾 保存消息
// ======================
function saveMessage(type, sender, receiver, message) {
    db.run(
        `INSERT INTO messages (type, sender, receiver, message, time)
         VALUES (?, ?, ?, ?, ?)`,
        [type, sender, receiver, message, Date.now()]
    );
}

// ======================
// 📥 获取所有消息
// ======================
app.get("/messages", (req, res) => {
    db.all(`SELECT * FROM messages ORDER BY time ASC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ======================
// 📤 发送短信
// ======================
app.post("/send", async (req, res) => {

    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({
            success: false,
            error: "missing to or message"
        });
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

        // 保存 outgoing
        saveMessage("outgoing", FROM_NUMBER, to, message);

        res.json({
            success: true,
            sid: response.data.sid
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});

// ======================
// 📥 接收短信（Webhook）
// ======================
app.post("/receive", (req, res) => {

    const from = req.body.From;
    const body = req.body.Body;

    saveMessage("incoming", from, FROM_NUMBER, body);

    res.sendStatus(200);
});

// ======================
// 🚀 启动服务
// ======================
app.listen(3000, () => {
    console.log("🚀 SMS SQLite CRM running on http://localhost:3000");
});