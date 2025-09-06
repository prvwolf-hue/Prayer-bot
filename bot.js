const QRCode = require("qrcode");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const moment = require("moment-timezone");

const STATUS_FILE = "./status.json";
const SALAWAT_MESSAGE = "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ";

async function sendToAllGroups(sock) {
  if (!sock?.user) return false;
  try {
    const chats = await sock.groupFetchAllParticipating();
    for (const groupId in chats) {
      await sock.sendMessage(groupId, { text: SALAWAT_MESSAGE });
    }
    return true;
  } catch (err) {
    console.error("❌ فشل إرسال الرسالة:", err.message);
    return false;
  }
}

function monitorScheduledSalawat(sock) {
  setInterval(async () => {
    const now = moment().tz("Africa/Casablanca");
    const hour = now.hour();
    const minute = now.minute();
    const day = now.day(); // 5 = الجمعة

    if (hour < 6 || hour > 22) return;

    const isFriday = day === 5;
    const shouldSend = isFriday ? minute === 0 || minute === 30 : minute === 0;
    if (!shouldSend) return;

    const currentSlot = now.format("YYYY-MM-DD-HH:mm");
    let status = fs.existsSync(STATUS_FILE)
      ? JSON.parse(fs.readFileSync(STATUS_FILE))
      : {};

    if (!status[currentSlot]) {
      const success = await sendToAllGroups(sock);
      if (success) {
        status[currentSlot] = true;
        fs.writeFileSync(STATUS_FILE, JSON.stringify(status));
        console.log(`📤 تم إرسال الصلاة على النبي ﷺ في ${currentSlot}`);
      }
    }
  }, 60 * 1000);
}

function keepSessionAlive(sock) {
  setInterval(async () => {
    if (!sock?.user) return;
    try {
      await sock.sendPresenceUpdate("available");
      console.log("🔄 Presence updated");
    } catch (err) {
      console.log("⚠️ Failed to update presence:", err.message);
    }
  }, 5 * 60 * 1000);
}

function backupSession() {
  setInterval(() => {
    const source = "./auth/creds.json";
    const backup = `./auth/backup-${Date.now()}.json`;
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, backup);
      console.log("🗂️ تم حفظ نسخة احتياطية للجلسة.");
    }
  }, 60 * 60 * 1000);
}

function cleanStatusFileDaily() {
  setInterval(() => {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({}));
    console.log("🧹 تم تنظيف status.json.");
  }, 24 * 60 * 60 * 1000);
}

function monitorConnection(sock) {
  setInterval(() => {
    if (!sock?.user) {
      console.log("🔄 الجلسة مقطوعة، إعادة الاتصال...");
      startBot();
    }
  }, 10 * 60 * 1000);
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 تم توليد QR، حفظه كصورة...");
      try {
        await QRCode.toFile("./qr.png", qr);
        console.log("✅ تم حفظ QR في qr.png");
      } catch (err) {
        console.error("❌ فشل حفظ QR:", err.message);
      }
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ تم تسجيل الخروج. حذف الجلسة...");
        fs.rmSync("./auth", { recursive: true, force: true });
        startBot();
      } else if (reason !== DisconnectReason.connectionClosed) {
        console.log("🔄 محاولة إعادة الاتصال...");
        startBot();
      } else {
        console.log("⚠️ الاتصال مغلق مؤقتًا.");
      }
    }

    if (connection === "open") {
      console.log("✅ تم الاتصال بنجاح.");
      setTimeout(() => monitorScheduledSalawat(sock), 5000);
      keepSessionAlive(sock);
      backupSession();
      cleanStatusFileDaily();
      monitorConnection(sock);
    }
  });
}

startBot();
