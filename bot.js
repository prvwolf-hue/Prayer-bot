const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const moment = require("moment-timezone");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({
  auth: state,
  printQRInTerminal: true,
  connectTimeoutMs: 60_000,
  emitOwnEvents: true,
  defaultQueryTimeoutMs: 60_000,
  shouldIgnoreJid: () => false,
  getMessage: async () => ({ conversation: "رسالة تلقائية" })
});


  sock.ev.on("connection.update", (update) => {
  const { connection, lastDisconnect } = update;
  if (connection === "close") {
    const reason = lastDisconnect?.error?.message;
    console.log("🔌 الاتصال تقطع:", reason);
    startBot(); // إعادة الربط تلقائياً
  } else if (connection === "open") {
    console.log("✅ البوت مربوط بـ WhatsApp");
  }
});
  scheduleSalawat(sock);
}

function scheduleSalawat(sock) {
  setInterval(async () => {
    const now = moment().tz("Africa/Casablanca");
    const hour = now.hour();
    const minute = now.minute();
    const day = now.day(); // 5 = الجمعة

    const isFriday = day === 5;
    const withinTime = hour >= 6 && hour <= 22;
    const shouldSend = isFriday ? minute === 0 || minute === 30 : minute === 0;

    if (withinTime && shouldSend) {
      try {
        const message = "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ";
        const chats = await sock.groupFetchAllParticipating();

        for (const groupId of Object.keys(chats)) {
          await sock.sendMessage(groupId, { text: message });
        }

        console.log(`📤 ${now.format("dddd HH:mm")} - تم الإرسال`);
      } catch (err) {
        console.error("❌ فشل الإرسال:", err.message);
      }
    }
  }, 60 * 1000); // كل دقيقة
}

startBot();
