const express = require('express');
const jsonServer = require('json-server');
const path = require('path');

const app = express();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// استخدام middlewares الخاصة بـ json-server
app.use(middlewares);

// تقديم ملفات الموقع الثابتة (مثل main.html)
app.use(express.static(__dirname));

// استخدام JSON Server للبيانات تحت مسار /api
app.use('/api', router);

// توجيه الرابط الرئيسي لصفحة main.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// تشغيل السيرفر على المنفذ المخصص من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل على المنفذ ${PORT}`);
});
