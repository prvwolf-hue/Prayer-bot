const express = require('express');
const axios = require('axios');
const app = express();

// 🟢 صفحة التأكيد أن البوت شغال
app.get('/', (req, res) => {
  res.send('🟢 Prayerbot is running — الحمد لله');
});

// 🔁 Self-ping كل 5 دقايق باش يبقى Replit نشيط
const baseUrl = 'https://e8489022-3b80-41a2-a87e-e7413ab910c3-00-38cup8jc7xayp.spock.replit.dev/';

setInterval(() => {
  axios.get(baseUrl)
    .then(() => console.log('🔄 Self-ping successful'))
    .catch(() => console.warn('⚠️ Self-ping failed'));
}, 5 * 60 * 1000);

// 🚀 تشغيل السيرفر
app.listen(3000, () => {
  console.log('✅ KeepAlive server running on port 3000');
  console.log(`🌐 Access your bot at: ${baseUrl}`);
});
