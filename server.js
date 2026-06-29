const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = './db.json', USERS_PATH = './users.json', ORDERS_PATH = './orders.json', SETTINGS_PATH = './settings.json';
const initFile = (p, d) => { if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(d, null, 2)); };
initFile(USERS_PATH, { active_users: [] }); initFile(ORDERS_PATH, []); initFile(DB_PATH, []);
initFile(SETTINGS_PATH, { news: "مرحباً بكم في سوبر ماركت أبو حسين", banners: ["https://i.postimg.cc/D8RhYN2t/image.png"], popup: "" });

const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJ = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

app.get('/api/settings', (req, res) => res.json(readJ(SETTINGS_PATH)));
app.get('/api/products', (req, res) => res.json(readJ(DB_PATH)));
app.post('/api/products', (req, res) => {
    let data = readJ(DB_PATH);
    data.push({ id: Date.now().toString(), stock: 10, ...req.body });
    writeJ(DB_PATH, data); res.json({ success: true });
});
app.get('/api/admin/stats', (req, res) => {
    let orders = readJ(ORDERS_PATH);
    let total = orders.filter(o=>o.status==="✅ تم").reduce((sum, o) => sum + (parseInt(o.totalAmount) || 0), 0);
    res.json({ totalSales: total, orderCount: orders.length });
});
// مسار استقبال الطلبات الجديدة من الزبائن
app.post('/api/orders/add', (req, res) => {
    let orders = readJ(ORDERS_PATH);
    // إضافة الطلب مع الوقت الحالي
    orders.unshift({ ...req.body, time: getTime() });
    writeJ(ORDERS_PATH, orders);
    res.json({ success: true });
});

// مسار لجلب الطلبات للوحة تحكم الإدارة
app.get('/api/orders', (req, res) => {
    res.json(readJ(ORDERS_PATH));
});
// --- مسارات إدارة الزبائن الجديدة ---

// جلب قائمة الزبائن
app.get('/api/users', (req, res) => res.json(readJ(USERS_PATH)));

// تعديل رصيد الزبون
app.post('/api/users/update', (req, res) => {
    const { phone, balance } = req.body;
    let data = readJ(USERS_PATH);
    // البحث عن المستخدم في مصفوفة active_users
    let user = data.active_users.find(u => u.phone === phone);
    
    if (user) {
        user.balance = balance; 
        writeJ(USERS_PATH, data);
        res.json({ success: true, message: "تم تحديث الرصيد بنجاح" });
    } else {
        res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    }
});
app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
