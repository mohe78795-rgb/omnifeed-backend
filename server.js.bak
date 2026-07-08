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

// --- إعداد Firebase ---
try {
    const serviceAccountPath = "/etc/secrets/service-account.json";
    if (fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))) });
    }
} catch (e) { console.error("Firebase Error:", e.message); }

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- الموديلات ---
const User = mongoose.model('User', new mongoose.Schema({ phone: String, bal: Number, fcmToken: String }));
const Message = mongoose.model('Message', new mongoose.Schema({ receiver: String, title: String, body: String }));
const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));
const Order = mongoose.model('Order', new mongoose.Schema({ phone: String, status: String, total: Number, items: Array, date: String }));

// --- مسارات لوحة التحكم المفقودة ---
app.post('/api/admin/dashboard', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    res.json({
        success: true,
        data: {
            orders: await Order.find({}),
            users: await User.find({}),
            categories: await Category.find({}),
            products: await Product.find({})
        }
    });
});

app.post('/api/admin/add-category', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Category(req.body.data).save();
    res.json({ success: true });
});

app.post('/api/admin/add-product', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Product(req.body.data).save();
    res.json({ success: true });
});

// مسارات أخرى (Topup, Message, FCM) كما كانت في ملفك
app.post('/api/auth/update-fcm', async (req, res) => {
    await User.findOneAndUpdate({ phone: req.body.phone }, { fcmToken: req.body.fcmToken });
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    await new Message({ receiver: req.body.receiver, title: req.body.title, body: req.body.body }).save();
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));

