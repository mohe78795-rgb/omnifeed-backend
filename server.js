const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// التعديل 1: جعل المنفذ ديناميكي ليتوافق مع منصة Render تلقائياً
const PORT = process.env.PORT || 3000;

app.use(cors());

// التعديل 2: رفع حد حجم البيانات المستقبلة إلى 50 ميجابايت لاستقبال صور معرض الهاتف (Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// الإشارة إلى مجلد public لخدمة ملفات الواجهة
app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = './db.json', 
      USERS_PATH = './users.json', 
      ORDERS_PATH = './orders.json', 
      SETTINGS_PATH = './settings.json';

const initFile = (p, d) => { if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(d, null, 2)); };
initFile(USERS_PATH, { active_users: [] }); 
initFile(ORDERS_PATH, []); 
initFile(DB_PATH, []);
initFile(SETTINGS_PATH, { news: "مرحباً بكم في سوبر ماركت أبو حسين", banners: ["https://i.postimg.cc/D8RhYN2t/image.png"], popup: "" });

const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJ = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

// API Settings
app.get('/api/settings', (req, res) => res.json(readJ(SETTINGS_PATH)));
app.post('/api/settings', (req, res) => { writeJ(SETTINGS_PATH, req.body); res.json({success:true}); });

// API Products (تستقبل الآن حقل img كنص Base64 مأخوذ من الهاتف)
app.get('/api/products', (req, res) => res.json(readJ(DB_PATH)));
app.post('/api/products', (req, res) => {
    let data = readJ(DB_PATH);
    data.push({ id: Date.now().toString(), stock: 10, oldPrice: 0, unit: "حبة", ...req.body });
    writeJ(DB_PATH, data); res.json({ success: true });
});
app.post('/api/products/delete', (req, res) => {
    let data = readJ(DB_PATH).filter(p => p.id.toString() !== req.body.id.toString());
    writeJ(DB_PATH, data); res.json({ success: true });
});

// API Users & Sync
app.post('/api/sync-user', (req, res) => {
    const { uuid, name } = req.body;
    let data = readJ(USERS_PATH);
    let user = data.active_users.find(u => u.uuid === uuid);
    if (!user) { 
        user = { uuid, name, balance: 0, history: [], last_seen: getTime() }; 
        data.active_users.push(user); 
        writeJ(USERS_PATH, data); 
    }
    res.json({ user });
});

app.get('/api/users', (req, res) => res.json(readJ(USERS_PATH)));

app.post('/api/users/update-balance', (req, res) => {
    let data = readJ(USERS_PATH);
    let user = data.active_users.find(u => u.uuid === req.body.uuid);
    if (user) {
        user.balance = parseInt(req.body.balance);
        user.history.push({ t: "تعديل رصيد", a: req.body.balance, d: getTime() });
        writeJ(USERS_PATH, data); res.json({ success: true });
    } else res.status(404).send("User Not Found");
});

// API Orders
app.post('/api/orders', (req, res) => {
    let users = readJ(USERS_PATH), prods = readJ(DB_PATH), orders = readJ(ORDERS_PATH);
    let user = users.active_users.find(u => u.uuid === req.body.uuid);

    if (user && user.balance >= req.body.totalAmount) {
        user.balance -= req.body.totalAmount;
        user.history.push({ t: "طلب منتجات", a: -req.body.totalAmount, d: getTime() });

        if (req.body.rawItems) {
            req.body.rawItems.forEach(ri => {
                let p = prods.find(x => x.name === ri.n);
                if(p) p.stock = Math.max(0, p.stock - ri.q);
            });
        }

        orders.push({ orderId: Date.now(), ...req.body, status: "⏳ انتظار", time: getTime() });
        
        writeJ(USERS_PATH, users); 
        writeJ(DB_PATH, prods); 
        writeJ(ORDERS_PATH, orders);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "رصيدك غير كافٍ أو المستخدم غير موجود" });
    }
});

app.get('/api/orders_list', (req, res) => res.json(readJ(ORDERS_PATH)));

app.post('/api/orders/update-status', (req, res) => {
    let data = readJ(ORDERS_PATH);
    let order = data.find(o => o.orderId == req.body.id);
    if(order) { order.status = req.body.status; writeJ(ORDERS_PATH, data); res.json({success:true}); }
    else res.status(404).send("Order Not Found");
});

app.get('/api/admin/stats', (req, res) => {
    let orders = readJ(ORDERS_PATH);
    let total = orders.filter(o=>o.status==="✅ تم").reduce((sum, o) => sum + (parseInt(o.totalAmount) || 0), 0);
    res.json({ totalSales: total, orderCount: orders.length });
});

// لوحة تحكم الأدمن
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

// التعديل 3: سطر التشغيل المتوافق مع البيئة السحابية لـ Render
app.listen(PORT, () => console.log(`🚀 Abu Hussein Server Running on port ${PORT}`));
