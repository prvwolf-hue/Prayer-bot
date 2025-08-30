const axios = require('axios');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');

// 🕌 إرسال الصلاة لجميع الجروبات
async function sendToAllGroups(text, sock) {
  const chats = await sock.groupFetchAllParticipating();
  for (const groupId of Object.keys(chats)) {
    await sock.sendMessage(groupId, { text });
  }
}

// 🕒 جدولة Salawat حسب مواقيت الصلاة من Aladhan API
async function scheduleSalawat(sock) {
  async function fetchPrayerTimes() {
    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const url = `https://api.aladhan.com/v1/timingsByCity?city=Berkane&country=Morocco&method=3&date=${day}-${month}-${year}`;
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

  async function scheduleForTime(timeStr) {
    const now = new Date();
    const [hour, minute] = timeStr.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    if (target < now) target.setDate(target.getDate() + 1);

    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
      sendToAllGroups('اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', sock);
    }, delay);
  }

  async function dailySetup() {
    const times = await fetchPrayerTimes();
    for (const time of Object.values(times)) {
      await scheduleForTime(time);
    }
  }

  await dailySetup();

  const millisTillMidnight = new Date().setHours(24, 0, 0, 0) - Date.now();
  setTimeout(() => {
    dailySetup();
    setInterval(dailySetup, 24 * 60 * 60 * 1000);
  }, millisTillMidnight);
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
        await sendToAllGroups('اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', sock);
        scheduleSalawat(sock);
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
