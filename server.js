const express = require('express');
const path = require('path');
const app = express();

// هذا السطر يخبر السيرفر أن يقرأ ملفاتك (main.html, etc) من المجلد الحالي
app.use(express.static(__dirname));

// هذا السطر يوجه أي شخص يفتح رابط موقعك إلى صفحة main.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('السيرفر يعمل!'));
