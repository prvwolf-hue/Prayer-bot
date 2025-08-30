const express = require('express');
const axios = require('axios');
const app = express();

// 🟢 صفحة التأكيد أن البوت شغال
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Prayerbot</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1>🟢 Prayerbot is running — الحمد لله</h1>
        <p>البوت يصلي على النبي ﷺ تلقائيًا كل ساعة أو نصف ساعة حسب اليوم.</p>
        <p> نسخة مستقرة بدون تدخل بشري و لا تنسونا من الدعاء بالخير.</p>
      </body>
    </html>
  `);
});


// 🔁 Self-ping كل 5 دقايق باش يبقى Replit نشيط
const baseUrl = 'https://prayer-bot-f2uk.onrender.com/';

setInterval(() => {
  axios.get(baseUrl)
    .then(() => console.log('🔄 Self-ping successful'))
    .catch(() => console.warn('⚠️ Self-ping failed'));
}, 5 * 60 * 1000);

// 🚀 تشغيل السيرفر
app.listen(3000, () => {
  console.log('✅ KeepAlive server running on port 3000');
  console.log(`🌐 Access your bot at: https://prayer-bot-f2uk.onrender.com`);
});
