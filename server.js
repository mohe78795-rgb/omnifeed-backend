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

// --- 1. إعداد Firebase Admin ---
try {
    const serviceAccountPath = "/etc/secrets/service-account.json";
    let serviceAccount;
    if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    } else if (fs.existsSync("./serviceAccountKey.json")) {
        serviceAccount = require("./serviceAccountKey.json");
    }
    if (serviceAccount) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ Firebase Admin Initialized");
    }
} catch (e) { console.error("❌ Firebase Error:", e.message); }

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة البيانات"))
    .catch(err => console.error("❌ خطأ MongoDB:", err));

// --- 2. الموديلات (Schemas) ---
const User = mongoose.model('User', new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    bal: { type: Number, default: 0 },
    fcmToken: String
}));
const Order = mongoose.model('Order', new mongoose.Schema({
    id: String, phone: String, status: String, total: Number, date: String
}));
const Message = mongoose.model('Message', new mongoose.Schema({ receiver: String, title: String, body: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number }));
const Ad = mongoose.model('Ad', new mongoose.Schema({ videoUrl: String, active: Boolean }));

// --- 3. دالة إرسال الإشعارات ---
async function sendPushNotification(phone, title, body) {
    try {
        const users = await User.find({ phone: phone === 'ALL' ? { $ne: null } : phone, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken);
        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({ notification: { title, body }, tokens });
        }
    } catch (e) { console.error("❌ Notification Error:", e.message); }
}

// --- 4. المسارات (Routes) ---

// توجيه لوحة التحكم
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// مسار تحديث التوكين
app.post('/api/auth/update-fcm', async (req, res) => {
    await User.findOneAndUpdate({ phone: req.body.phone }, { fcmToken: req.body.fcmToken });
    res.json({ success: true });
});

// مسار شحن الألعاب
app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.bal < price) return res.json({ success: false, message: "رصيد غير كافٍ" });
    user.bal -= Number(price);
    await user.save();
    sendPushNotification(phone, "نجاح الشحن ⚡", `تم شحن ${game_code} للـ ID: ${user_id}`);
    res.json({ success: true, currentBal: user.bal });
});

// --- 5. مسارات لوحة التحكم (Admin APIs) ---

app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    res.json({ 
        success: true, 
        data: { 
            orders: await Order.find({}).sort({ _id: -1 }),
            users: await User.find({}),
            products: await Product.find({})
        }
    });
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const user = await User.findOneAndUpdate({ phone: req.body.phone }, { bal: Number(req.body.newBalance) }, { new: true });
    if (user) sendPushNotification(user.phone, "تحديث المحفظة 💰", `رصيدك الجديد: ${req.body.newBalance} YER`);
    res.json({ success: true });
});

app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status });
    sendPushNotification(req.body.phone, "تحديث الطلب 📦", `حالة طلبك: ${req.body.status}`);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));

