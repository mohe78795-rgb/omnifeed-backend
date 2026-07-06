const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "admin123";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ متصل بقاعدة البيانات بنجاح"))
    .catch(err => console.error("❌ خطأ اتصال:", err));

// --- 1. تعريف قواعد البيانات (Models) ---
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE') }
}));

const Category = mongoose.model('Category', new mongoose.Schema({ name: String, sub: String, img: String }));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, img: String, cat: String }));
const Order = mongoose.model('Order', new mongoose.Schema({ phone: String, items: Array, total: Number, date: Date }));
const Game = mongoose.model('Game', new mongoose.Schema({ title: String, img: String, denoms: Array }));
const Ad = mongoose.model('Ad', new mongoose.Schema({ videoUrl: String, active: Boolean }));
const Message = mongoose.model('Message', new mongoose.Schema({ phone: String, title: String, body: String, date: String }));

// --- 2. دوال مساعدة ---
const makeEmbedUrl = (url) => url.replace('watch?v=', 'embed/').split('&')[0];

// --- 3. مسارات المستخدم (Auth & Data) ---
app.post('/api/auth/signup', async (req, res) => {
    try { const user = await new User(req.body).save(); res.json({ success: true, user }); }
    catch (e) { res.status(400).json({ success: false, message: "فشل إنشاء الحساب" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    const user = await User.findOne({ phone, pass });
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false });
});

app.get('/api/auth/user/:phone', async (req, res) => {
    const user = await User.findOne({ phone: req.params.phone });
    res.json({ success: true, user });
});

// --- 4. مسارات المتجر والألعاب ---
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.get('/api/games', async (req, res) => res.json(await Game.find()));
app.get('/api/ads', async (req, res) => res.json(await Ad.find({ active: true })));
app.get('/api/messages/:phone', async (req, res) => res.json(await Message.find({ $or: [{ phone: req.params.phone }, { phone: "ALL" }] })));

// --- 5. مسارات الطلبات والشحن ---
app.post('/api/orders/shop', async (req, res) => {
    try {
        const { phone, items, total } = req.body;
        await User.updateOne({ phone }, { $inc: { bal: -total } });
        await new Order({ phone, items, total, date: new Date() }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/orders/game', async (req, res) => {
    try {
        const { phone, price, gameId, playerId, denomName } = req.body;
        await User.updateOne({ phone }, { $inc: { bal: -price } });
        await new Order({ phone, items: [{ name: denomName, playerId }], total: price, date: new Date() }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- 6. مسارات الإدارة (المحمية) ---
app.post('/api/admin/product/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try { await new Product(req.body).save(); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try { await new Category(req.body).save(); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/ad/add', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Ad.updateMany({}, { active: false });
        await new Ad({ videoUrl: makeEmbedUrl(req.body.videoUrl), active: true }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/message/send', async (req, res) => {
    if (req.body.adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try { await new Message(req.body).save(); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// تشغيل السيرفر
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل بكامل طاقته على البورت: ${PORT}`));
