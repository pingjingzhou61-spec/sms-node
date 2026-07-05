const express = require("express");
const cors = require("cors");
const axios = require("axios");

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
// 🧠 内存数据库（100%稳定）
// ======================
let messages = [];

// ======================
// 📥 获取消息
// ======================
app.get("/messages", (req, res) => {
    res.json(messages);
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

        messages.push({
            type: "outgoing",
            to,
            message,
            time: Date.now()
        });

        res.json({ success: true, sid: response.data.sid });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// 📥 webhook 接收短信
// ======================
app.post("/receive", (req, res) => {
    const from = req.body.From;
    const body = req.body.Body;

    messages.push({
        type: "incoming",
        from,
        message: body,
        time: Date.now()
    });

    res.sendStatus(200);
});

// ======================
// 🚀 启动
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("CRM running on port", PORT);
});

module.exports = app;
