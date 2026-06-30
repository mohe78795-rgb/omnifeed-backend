const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- الإعدادات الأساسية ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// تشغيل الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// تحديد مسارات ملفات البيانات
const USERS_PATH = path.join(__dirname, 'users.json');
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const DB_PATH = path.join(__dirname, 'db.json');
const SETTINGS_PATH = path.join(__dirname, 'settings.json');

// --- تهيئة الملفات عند التشغيل ---
async function initFiles() {
    const files = [
        { path: USERS_PATH, default: { active_users: [] } },
        { path: ORDERS_PATH, default: [] },
        { path: DB_PATH, default: [] },
        { path: SETTINGS_PATH, default: { news: "مرحباً بكم في تموينات أبو حسين", banners: [], popup: "" } }
    ];
    for (const file of files) {
        try {
            await fs.access(file.path);
        } catch {
            await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
            console.log(`✅ تم إنشاء ملف جديد: ${path.basename(file.path)}`);
        }
    }
}
initFiles();

// --- دوال مساعدة ---
const readJ = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJ = async (p, d) => await fs.writeFile(p, JSON.stringify(d, null, 2));
const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });

// ==========================================
// 1. مسارات المصادقة (Auth System)
// ==========================================

// تسجيل مستخدم جديد
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        let data = await readJ(USERS_PATH);

        if (data.active_users.find(u => u.phone === phone)) {
            return res.status(400).json({ success: false, message: "رقم الهاتف مسجل مسبقاً" });
        }

        const newUser = {
            name,
            phone,
            pass,
            bal: 0, // الرصيد الافتراضي
            joinDate: getTime()
        };

        data.active_users.push(newUser);
        await writeJ(USERS_PATH, data);

        const { pass: _, ...userWithoutPass } = newUser;
        res.json({ success: true, user: userWithoutPass });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        let data = await readJ(USERS_PATH);

        const user = data.active_users.find(u => u.phone === phone && u.pass === pass);

        if (user) {
            const { pass: _, ...userWithoutPass } = user;
            res.json({ success: true, user: userWithoutPass });
        } else {
            res.status(401).json({ success: false, message: "خطأ في الهاتف أو كلمة المرور" });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// جلب بيانات مستخدم (للمزامنة وتحديث الرصيد)
app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        let data = await readJ(USERS_PATH);
        const user = data.active_users.find(u => u.phone === req.params.phone);
        if (user) {
            const { pass: _, ...userWithoutPass } = user;
            res.json({ success: true, user: userWithoutPass });
        } else {
            res.status(404).json({ success: false, message: "غير موجود" });
        }
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// 2. مسارات المنتجات والإعدادات
// ==========================================

app.get('/api/products', async (req, res) => {
    try { res.json(await readJ(DB_PATH)); } catch (e) { res.status(500).json([]); }
});

app.post('/api/products', async (req, res) => {
    try {
        let data = await readJ(DB_PATH);
        data.push({ id: Date.now().toString(), ...req.body });
        await writeJ(DB_PATH, data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/settings', async (req, res) => {
    try { res.json(await readJ(SETTINGS_PATH)); } catch (e) { res.json({}); }
});

// ==========================================
// 3. مسارات الطلبات
// ==========================================

app.post('/api/orders/add', async (req, res) => {
    try {
        let orders = await readJ(ORDERS_PATH);
        // تحديث الرصيد في ملف المستخدمين عند الطلب
        let usersData = await readJ(USERS_PATH);
        let user = usersData.active_users.find(u => u.phone === req.body.phone);
        
        if (user && user.bal >= req.body.order.total) {
            user.bal -= req.body.order.total; // خصم المبلغ
            await writeJ(USERS_PATH, usersData);
            
            const newOrder = { ...req.body.order, phone: req.body.phone, time: getTime() };
            orders.unshift(newOrder);
            await writeJ(ORDERS_PATH, orders);
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "رصيد غير كافٍ" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders', async (req, res) => {
    try { res.json(await readJ(ORDERS_PATH)); } catch (e) { res.json([]); }
});

// ==========================================
// 4. مسارات الإدارة (Admin Update)
// ==========================================

app.get('/api/users', async (req, res) => {
    try { res.json(await readJ(USERS_PATH)); } catch (e) { res.status(500).json({ active_users: [] }); }
});

app.post('/api/users/update', async (req, res) => {
    try {
        const { phone, balance, name, pass } = req.body;
        let data = await readJ(USERS_PATH);
        let user = data.active_users.find(u => u.phone === phone);

        if (user) {
            if (balance !== undefined) user.bal = balance; // استخدام bal للرصيد
            if (name) user.name = name;
            if (pass) user.pass = pass;
        } else {
            data.active_users.push({ name: name || "زبون", phone, pass: pass || "123", bal: balance || 0, joinDate: getTime() });
        }
        await writeJ(USERS_PATH, data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ: ${PORT}`);
}); 
