const express = require('express');
const jsonServer = require('json-server');
const path = require('path');

const app = express();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// 1. استخدام ملفات json-server
app.use(middlewares);
app.use('/api', router);

// 2. تقديم ملفات الموقع الثابتة
app.use(express.static(__dirname));

// 3. توجيه الرابط الرئيسي لصفحة main.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// 4. تشغيل السيرفر مرة واحدة فقط
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن بنجاح على المنفذ ${PORT}`);
});
