const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// --- 1. إعداد Firebase ---
try {
    const serviceAccountPath = "/etc/secrets/service-account.json";
    if (fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))) });
    }
} catch (e) { console.error("❌ Firebase Error:", e.message); }

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. الاتصال بـ MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة البيانات"))
    .catch(err => console.error("❌ خطأ MongoDB:", err));

// --- 3. الموديلات ---
const User = mongoose.model('User', new mongoose.Schema({ phone: String, bal: Number, fcmToken: String }));
const Order = mongoose.model('Order', new mongoose.Schema({ id: String, phone: String, status: String, total: Number, date: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));
const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Message = mongoose.model('Message', new mongoose.Schema({ receiver: String, title: String, body: String }));

// --- 4. مسارات توجيه الصفحات (Frontend) ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 5. مسارات الـ API العامة (للمستخدمين) ---
app.post('/api/auth/update-fcm', async (req, res) => {
    await User.findOneAndUpdate({ phone: req.body.phone }, { fcmToken: req.body.fcmToken });
    res.json({ success: true });
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.bal < price) return res.json({ success: false });
    user.bal -= Number(price);
    await user.save();
    res.json({ success: true, currentBal: user.bal });
});

// --- 6. مسارات لوحة التحكم (Admin APIs) ---
app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    res.json({ 
        success: true, 
        data: { 
            orders: await Order.find({}).sort({ _id: -1 }),
            users: await User.find({}),
            products: await Product.find({}),
            categories: await Category.find({})
        }
    });
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await User.findOneAndUpdate({ phone: req.body.phone }, { bal: Number(req.body.newBalance) });
    res.json({ success: true });
});

app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status });
    res.json({ success: true });
});

// --- 7. تشغيل السيرفر ---
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));

