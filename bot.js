const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const QRCode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const moment = require("moment-timezone");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      QRCode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ تم تسجيل الخروج. حذف الجلسة...");
        fs.rmSync("./auth", { recursive: true, force: true });
      }

      console.log("🔄 إعادة تشغيل البوت بعد الانقطاع...");
      setTimeout(() => startBot(), 5000);
    }

    if (connection === "open") {
      console.log("✅ تم الاتصال بنجاح.");
      scheduleSalawat(sock);
    }
  });
}

function scheduleSalawat(sock) {
  const times = ["09:00", "12:00", "15:00", "18:00", "21:00"];
  const timezone = "Africa/Casablanca";

  times.forEach((time) => {
    const [hour, minute] = time.split(":");
    schedule.scheduleJob({ hour: +hour, minute: +minute, tz: timezone }, async () => {
      try {
        const message = "اللهم صل وسلم وبارك على سيدنا محمد 🌸";
        const jid = "YOUR_GROUP_ID_HERE@g.us"; // عوّضه بالآيدي ديال القروب
        await sock.sendMessage(jid, { text: message });
        console.log(`📤 تم إرسال الصلاة في ${time}`);
      } catch (err) {
        console.error("⚠️ خطأ في إرسال الصلاة:", err.message);
      }
    });
  });
}

startBot();
