const express = require("express");
const path = require("path");
const app = express();

// 🖼️ عرض صورة QR من مجلد public
app.use("/qr", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Prayerbot</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1>🟢 Prayerbot شغال — الحمد لله</h1>
        <p>البوت يصلي على النبي ﷺ تلقائيًا كل ساعة أو نصف ساعة حسب اليوم.</p>
        <p><a href="/qr/qr.png" target="_blank">📷 عرض رمز QR</a></p>
      </body>
    </html>
  `);
});

// 🔁 keepAlive باش يبقى السيرفر شغال على Render
app.get("/ping", (req, res) => res.send("pong"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
