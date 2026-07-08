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
        console.log("✅ Firebase Admin Initialized Successfully");
    }
} catch (e) {
    console.error("❌ Firebase Error:", e.message);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة البيانات بنجاح"))
    .catch(err => console.error("❌ خطأ MongoDB:", err));

// --- 2. الموديلات (Schemas) ---
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    phone: { type: String, required: true, unique: true },
    pass: String,
    bal: { type: Number, default: 0 },
    fcmToken: String,
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));
const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة ⏳' },
    paymentMethod: String, date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));
const Message = mongoose.model('Message', new mongoose.Schema({ receiver: String, title: String, body: String, date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) } }));
const Ad = mongoose.model('Ad', new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } }));

// --- 3. دالة إرسال الإشعارات ---
async function sendPushNotification(phone, title, body) {
    try {
        const query = phone === 'ALL' ? {} : { phone: phone };
        const users = await User.find({ ...query, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken).filter(t => t);
        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({ notification: { title, body }, tokens });
        }
    } catch (e) { console.error("❌ Notification Error:", e.message); }
}

// --- 4. المسارات (APIs) ---

// مسار تحديث التوكين
app.post('/api/auth/update-fcm', async (req, res) => {
    const { phone, fcmToken } = req.body;
    await User.findOneAndUpdate({ phone }, { fcmToken });
    res.json({ success: true });
});

// مسار شحن الألعاب
app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.bal < price) return res.json({ success: false, message: "رصيد غير كافٍ" });
    user.bal -= Number(price);
    await user.save();
    const title = "نجاح الشحن ⚡";
    const body = `تم شحن ${game_code} للـ ID: ${user_id}`;
    await new Message({ receiver: phone, title, body }).save();
    sendPushNotification(phone, title, body);
    res.json({ success: true, currentBal: user.bal });
});

// --- 5. مسارات لوحة التحكم (Admin APIs) ---

app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    res.json({ success: true, data: { 
        orders: await Order.find({}).sort({ _id: -1 }),
        users: await User.find({}),
        products: await Product.find({}),
        ads: await Ad.find({ active: true })
    }});
});

app.post('/api/admin/user/update-balance', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const user = await User.findOneAndUpdate({ phone: req.body.phone }, { bal: Number(req.body.newBalance) }, { new: true });
    if (user) {
        const title = "تحديث المحفظة 💰";
        const body = `تم تعديل رصيدك. الرصيد الحالي: ${req.body.newBalance} YER`;
        await new Message({ receiver: user.phone, title, body }).save();
        sendPushNotification(user.phone, title, body);
    }
    res.json({ success: true });
});

app.post('/api/admin/order/update-status', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    const order = await Order.findOneAndUpdate({ id: req.body.id }, { status: req.body.status }, { new: true });
    if (order) {
        sendPushNotification(order.phone, "تحديث الطلب 📦", `حالة طلبك أصبحت: ${req.body.status}`);
    }
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Message({ receiver: req.body.receiver, title: req.body.title, body: req.body.body }).save();
    sendPushNotification(req.body.receiver, req.body.title, req.body.body);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));

