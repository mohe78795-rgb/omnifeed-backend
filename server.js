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

// تشغيل الملفات الثابتة (المتجر ولوحة التحكم)
app.use(express.static(path.join(__dirname, 'public')));

// تحديد مسارات ملفات البيانات في المجلد الرئيسي
const USERS_PATH = path.join(__dirname, 'users.json');
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const DB_PATH = path.join(__dirname, 'db.json');
const SETTINGS_PATH = path.join(__dirname, 'settings.json');

// --- دالة تهيئة الملفات للتأكد من وجودها عند أول تشغيل ---
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

// --- دوال مساعدة للتعامل مع JSON ---
const readJ = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJ = async (p, d) => await fs.writeFile(p, JSON.stringify(d, null, 2));
const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });

// --- المسارات البرمجية (API Routes) ---

// 1. جلب المنتجات
app.get('/api/products', async (req, res) => {
    try {
        const data = await readJ(DB_PATH);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "خطأ في قراءة قاعدة البيانات" });
    }
});

// 2. إضافة منتج جديد (من لوحة التحكم)
app.post('/api/products', async (req, res) => {
    try {
        let data = await readJ(DB_PATH);
        const newProduct = {
            id: Date.now().toString(),
            stock: 10,
            ...req.body
        };
        data.push(newProduct);
        await writeJ(DB_PATH, data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 3. جلب الإعدادات (الأخبار والبانرات)
app.get('/api/settings', async (req, res) => {
    try {
        res.json(await readJ(SETTINGS_PATH));
    } catch (e) {
        res.json({});
    }
});

// 4. استقبال الطلبات الجديدة من الزبائن
app.post('/api/orders/add', async (req, res) => {
    try {
        let orders = await readJ(ORDERS_PATH);
        const newOrder = {
            ...req.body,
            id: Date.now().toString(36).toUpperCase(), // توليد رقم طلب مميز وقصير
            time: getTime()
        };
        orders.unshift(newOrder); // وضع الطلب الجديد في البداية
        await writeJ(ORDERS_PATH, orders);
        res.json({ success: true, orderId: newOrder.id });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 5. جلب كافة الطلبات (للآدمن)
app.get('/api/orders', async (req, res) => {
    try {
        res.json(await readJ(ORDERS_PATH));
    } catch (e) {
        res.json([]);
    }
});

// 6. جلب قائمة الزبائن (للآدمن)
app.get('/api/users', async (req, res) => {
    try {
        res.json(await readJ(USERS_PATH));
    } catch (e) {
        res.json({ active_users: [] });
    }
});

// 7. المسار الذهبي: تحديث الرصيد، الاسم، كلمة السر، أو إنشاء حساب جديد
app.post('/api/users/update', async (req, res) => {
    try {
        const { phone, balance, name, pass } = req.body;
        let data = await readJ(USERS_PATH);
        
        // البحث عن المستخدم بواسطة رقم الهاتف
        let user = data.active_users.find(u => u.phone === phone);

        if (user) {
            // تحديث البيانات الحالية (إذا تم إرسالها)
            if (balance !== undefined) user.balance = balance;
            if (name) user.name = name;
            if (pass) user.pass = pass; 
        } else {
            // إنشاء مستخدم جديد بالكامل وحفظه في المصفوفة
            const newUser = {
                name: name || "زبون جديد",
                phone: phone,
                pass: pass || "123456",
                balance: balance || 0,
                joinDate: getTime()
            };
            data.active_users.push(newUser);
        }

        await writeJ(USERS_PATH, data);
        res.json({ success: true, message: "تم تحديث بيانات users.json بنجاح" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`
    🚀 ============================================
    🚀 سيرفر تموينات أبو حسين يعمل بنجاح
    🚀 المنفذ: ${PORT}
    🚀 الرابط: http://localhost:${PORT}
    🚀 ============================================
    `);
});
