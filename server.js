const express = require('express');
const fs = require('fs').promises; // استخدام الوعود لتحسين الأداء
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// الإعدادات
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 50 ميجا كثيرة جداً، 10 كافية للمتجر
app.use(express.static(path.join(__dirname, 'public')));

const USERS_PATH = './users.json';
const ORDERS_PATH = './orders.json';
const DB_PATH = './db.json';
const SETTINGS_PATH = './settings.json';

// دالة تهيئة الملفات (تنفذ مرة واحدة عند التشغيل)
async function initFiles() {
    const files = [
        { path: USERS_PATH, default: { active_users: [] } },
        { path: ORDERS_PATH, default: [] },
        { path: DB_PATH, default: [] },
        { path: SETTINGS_PATH, default: { news: "مرحباً بكم", banners: [], popup: "" } }
    ];
    for (const file of files) {
        try {
            await fs.access(file.path);
        } catch {
            await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
        }
    }
}
initFiles();

// دوال مساعدة غير متزامنة (Async)
const readJ = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJ = async (p, d) => await fs.writeFile(p, JSON.stringify(d, null, 2));
const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });

// --- المسارات (Routes) ---

app.get('/api/products', async (req, res) => {
    try { res.json(await readJ(DB_PATH)); } catch (e) { res.status(500).send("Error reading DB"); }
});

// استقبال الطلبات
app.post('/api/orders/add', async (req, res) => {
    try {
        let orders = await readJ(ORDERS_PATH);
        const newOrder = { 
            ...req.body, 
            id: Date.now().toString(36).toUpperCase(), // توليد ID مميز
            time: getTime() 
        };
        orders.unshift(newOrder);
        await writeJ(ORDERS_PATH, orders);
        res.json({ success: true, orderId: newOrder.id });
    } catch (e) { res.status(500).json({ success: false }); }
});

// تعديل الرصيد (تحتاج مستقبلاً لإضافة رمز سري هنا للأمان)
app.post('/api/users/update', async (req, res) => {
    try {
        const { phone, balance, name } = req.body;
        let data = await readJ(USERS_PATH);
        let user = data.active_users.find(u => u.phone === phone);

        if (user) {
            user.balance = balance;
            if(name) user.name = name; // تحديث الاسم أيضاً إذا أرسل
        } else {
            // إذا لم يكن موجوداً (تسجيل جديد)
            data.active_users.push({ name, phone, balance, joinDate: getTime() });
        }
        
        await writeJ(USERS_PATH, data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders', async (req, res) => res.json(await readJ(ORDERS_PATH)));
app.get('/api/users', async (req, res) => res.json(await readJ(USERS_PATH)));

app.listen(PORT, () => console.log(`🚀 Server Abu Hussein on port ${PORT}`));
