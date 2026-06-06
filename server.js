const express = require('express');
const jsonServer = require('json-server');
const path = require('path');

const app = express();
const router = jsonServer.router('db.json'); // قاعدة البيانات
const middlewares = jsonServer.defaults();

// 1. تقديم ملفات الموقع (Static Files)
app.use(express.static(__dirname));

// 2. استخدام JSON Server للبيانات (ستكون متاحة تحت مسار /api)
app.use('/api', middlewares, router);

// 3. توجيه الرابط الرئيسي لصفحة main.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// 4. تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`السيرفر يعمل على المنفذ ${PORT}`));
