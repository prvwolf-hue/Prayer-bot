const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const moment = require("moment-timezone");

const STATUS_FILE = "./status.json";
const SALAWAT_MESSAGE = "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ";

async function sendToAllGroups(sock) {
  const chats = await sock.groupFetchAllParticipating();
  for (const groupId in chats) {
    await sock.sendMessage(groupId, { text: SALAWAT_MESSAGE });
  }
}

function monitorScheduledSalawat(sock) {
  setInterval(async () => {
    const now = moment().tz("Africa/Casablanca");
    const hour = now.hour();
    const minute = now.minute();
    const day = now.day(); // 5 = الجمعة

    if (hour < 6 || hour >= 22) return;

    const isFriday = day === 5;
    const shouldSend = isFriday
      ? minute === 0 || minute === 30
      : minute === 0;

    if (!shouldSend) return;

    const currentSlot = `${now.format("YYYY-MM-DD-HH:mm")}`;

    let status = fs.existsSync(STATUS_FILE)
      ? JSON.parse(fs.readFileSync(STATUS_FILE))
      : {};

    if (!status[currentSlot]) {
      await sendToAllGroups(sock);
      status[currentSlot] = true;
      fs.writeFileSync(STATUS_FILE, JSON.stringify(status));
      console.log(`📤 تم إرسال الصلاة على النبي ﷺ في ${currentSlot}`);
    }
  }, 60 * 1000);
}

function keepSessionAlive(sock) {
  setInterval(async () => {
    try {
      await sock.sendPresenceUpdate("available");
      console.log("🔄 Presence updated to keep session alive");
    } catch (err) {
      console.log("⚠️ Failed to update presence:", err.message);
    }
  }, 5 * 60 * 1000); // كل 5 دقائق
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({
    auth: state,
    // تم حذف printQRInTerminal لأنه deprecated
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 QR Code:", qr); // عرض QR إذا احتجت تسكانه من جديد
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ تم تسجيل الخروج. أعد تشغيل البوت لإعادة الاتصال.");
      } else {
        console.log("🔄 إعادة الاتصال...");
        startBot();
      }
    } else if (connection === "open") {
      console.log("✅ تم الاتصال بنجاح.");
      monitorScheduledSalawat(sock);
      keepSessionAlive(sock);
    }
  });
}

startBot();
