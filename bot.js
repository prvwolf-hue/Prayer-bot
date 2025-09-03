const QRCode = require("qrcode");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const moment = require("moment-timezone");

const STATUS_FILE = "./status.json";
const SALAWAT_MESSAGE = "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ";

async function sendToAllGroups(sock) {
  if (!sock?.user) {
    console.log("⚠️ الاتصال غير جاهز، تأجيل الإرسال...");
    return false;
  }

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
    const shouldSend = isFriday
      ? minute === 0 || minute === 30
      : minute === 0;

    if (!shouldSend) return;

    const currentSlot = `${now.format("YYYY-MM-DD-HH:mm")}`;

    let status = fs.existsSync(STATUS_FILE)
      ? JSON.parse(fs.readFileSync(STATUS_FILE))
      : {};

    if (!status[currentSlot]) {
      const success = await sendToAllGroups(sock);
      if (success) {
        status[currentSlot] = true;
        fs.writeFileSync(STATUS_FILE, JSON.stringify(status));
        console.log(`📤 تم إرسال الصلاة على النبي ﷺ في ${currentSlot}`);
      } else {
        console.log("⚠️ فشل الإرسال، سيتم إعادة المحاولة لاحقًا.");
      }
    }
  }, 60 * 1000);
}

function keepSessionAlive(sock) {
  setInterval(async () => {
    try {
      if (!sock?.user) {
        console.log("⚠️ الاتصال غير جاهز، تخطي تحديث الحضور.");
        return;
      }
      await sock.sendPresenceUpdate("available");
      console.log("🔄 Presence updated to keep session alive");
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
    console.log("🧹 تم تنظيف status.json لتفادي التعارض.");
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

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 QR Code received. Rendering in terminal...");
      QRCode.toString(qr, { type: "terminal" }, (err, asciiQR) => {
        if (err) {
          console.error("❌ فشل توليد QR:", err.message);
        } else {
          console.log(asciiQR);
        }
      });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log("⚠️ تم تسجيل الخروج من واتساب.");

        const hasSession = fs.existsSync("./auth/creds.json");
        if (hasSession) {
          console.log("🔁 محاولة استرجاع الجلسة تلقائيًا...");
          startBot();
        } else {
          console.log("📛 الجلسة غير موجودة. يلزم مسح auth/ وإعادة ربط QR.");
        }
      } else {
        console.log("🔄 إعادة الاتصال...");
        startBot();
      }
    }

    if (connection === "open") {
      console.log("✅ تم الاتصال بنجاح.");
      setTimeout(() => {
        monitorScheduledSalawat(sock);
      }, 5000);
      keepSessionAlive(sock);
      backupSession();
      cleanStatusFileDaily();
      monitorConnection(sock);
    }
  });
}

startBot();
