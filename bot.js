const axios = require('axios');
const fs = require('fs');
const moment = require('moment-timezone');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');

const STATUS_FILE = 'status.json';

// 🕌 إرسال الصلاة لجميع الجروبات
async function sendToAllGroups(sock) {
  const chats = await sock.groupFetchAllParticipating();
  for (const groupId of Object.keys(chats)) {
    await sock.sendMessage(groupId, {
      text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ'
    });
  }
}

// 🕒 جلب مواقيت الصلاة من Aladhan API
async function fetchPrayerTimes() {
  try {
    const today = moment().tz("Africa/Casablanca");
    const dateStr = today.format("DD-MM-YYYY");
    const url = `https://api.aladhan.com/v1/timingsByCity?city=Oujda&country=Morocco&method=3&date=${dateStr}`;
    const response = await axios.get(url);
    const timings = response.data.data.timings;

    return {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha
    };
  } catch (err) {
    console.error('❌ Failed to fetch prayer times:', err.message);
    return {};
  }
}

// 🧠 تحقق من الصلوات الفائتة وإرسال Salawat
function monitorPrayerTimes(sock) {
  setInterval(async () => {
    const now = moment().tz("Africa/Casablanca");
    const times = await fetchPrayerTimes();

    let status = fs.existsSync(STATUS_FILE)
      ? JSON.parse(fs.readFileSync(STATUS_FILE))
      : {};

    for (const [name, timeStr] of Object.entries(times)) {
      const [hour, minute] = timeStr.split(':').map(Number);
      const prayerTime = moment().tz("Africa/Casablanca").set({ hour, minute, second: 0 });

      // إذا فات وقت الصلاة وما تصيفطاتش، نرسلها
      if (now.isAfter(prayerTime) && !status[name]) {
        await sendToAllGroups(sock);
        status[name] = true;
        fs.writeFileSync(STATUS_FILE, JSON.stringify(status));
      }
    }
  }, 60 * 1000); // كل دقيقة
}

// 🔄 إعادة تعيين الحالة يومياً
function resetPrayerStatusDaily() {
  setInterval(() => {
    const now = moment().tz("Africa/Casablanca");
    if (now.format("HH:mm") === "00:01") {
      fs.writeFileSync(STATUS_FILE, JSON.stringify({}));
      console.log("🔄 تم إعادة تعيين حالة الصلوات لليوم الجديد");
    }
  }, 60 * 1000);
}

// 🔌 تشغيل البوت
async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({ version, auth: state });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { qr, connection, lastDisconnect } = update;

      if (qr) {
        console.log('📱 Scan this QR code to log in:');
        await QRCode.toString(qr, { type: 'terminal' }, (err, url) => {
          if (err) return console.error('❌ QR generation failed:', err);
          console.log(url);
        });
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.message || 'unknown';
        console.warn(`⚠️ Connection closed due to: ${reason}`);
        console.log('🔁 Restarting bot...');
        setTimeout(safeStart, 3000);
      }

      if (connection === 'open') {
        console.log('✅ WhatsApp connection established');
        monitorPrayerTimes(sock);
        resetPrayerStatusDaily();
      }
    });

    console.log('✅ Baileys bot is ready');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.log('🔁 Retrying in 5 seconds...');
    setTimeout(safeStart, 5000);
  }
}

// 🛡️ التفاف شامل لحماية البوت من الانطفاء
function safeStart() {
  startBot().catch((err) => {
    console.error('❌ Uncaught error:', err.message);
    console.log('🔁 Restarting bot in 5 seconds...');
    setTimeout(safeStart, 5000);
  });
}

safeStart();
