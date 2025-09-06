const express = require("express");
const app = express();

// ✅ واجهة تأكيد التشغيل
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Prayerbot</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1>🟢 Prayerbot شغال — الحمد لله</h1>
        <p>البوت يصلي على النبي ﷺ تلقائيًا كل ساعة أو نصف ساعة حسب اليوم.</p>
        <p>نسخة مستقرة بدون تدخل بشري، ونسألكم الدعاء بالخير.</p>
      </body>
    </html>
  `);
});

// 🔁 keepAlive باش يبقى السيرفر شغال على Render
app.get("/ping", (req, res) => res.send("pong"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
