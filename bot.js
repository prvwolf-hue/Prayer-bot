const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const fs = require("fs");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({ auth: state });

  let qrPrinted = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ✅ طباعة QR مرة وحدة فقط
    if (qr && !qrPrinted) {
      qrPrinted = true;

      // طباعة فـ التيرمينال
      qrcodeTerminal.generate(qr, { small: true });

      // إنشاء مجلد public إذا ما كانش
      if (!fs.existsSync("./public")) {
        fs.mkdirSync("./public");
      }

      // حفظ صورة QR بجودة عالية
      await QRCode.toFile("./public/qr.png", qr, {
        margin: 2,
        width: 300,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });

      console.log("✅ QR محفوظ في /public/qr.png");
    }

    // 🔁 إعادة الاتصال تلقائيًا
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("❌ الاتصال تقطع، السبب:", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log("🔒 تم تسجيل الخروج، حذف الجلسة وإعادة التشغيل...");
        fs.rmSync("auth", { recursive: true, force: true });
      }

      setTimeout(() => {
        startBot(); // إعادة التشغيل
      }, 5000);
    }

    if (connection === "open") {
      console.log("✅ البوت متصل بنجاح");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

startBot();
