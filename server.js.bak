const express = require('express');                                              
const mongoose = require('mongoose');                                            
const cors = require('cors');
const path = require('path');                                                                                                                                     
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;                                           
const ADMIN_SECRET_KEY = process.env.ADMIN_PASS || "123456";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة المنصة الموحدة (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// --- 🗃️ السكيمات وقواعد البيانات (Multi-Vendor) ---
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});
const User = mongoose.model('User', UserSchema);

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: String,
    img: String
});
const Category = mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    img: String,
    cat: { type: String, required: true },
    vendor: { type: String, required: true, enum: ['ابو_حسين', 'العزاني', 'القاضي'], default: 'ابو_حسين' }
});
const Product = mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
    id: { type: String, default: () => "WASL-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String,
    items: Array,
    total: Number,
    deliveryFee: { type: Number, default: 1000 },
    status: { type: String, default: 'جاري التجهيز عبر واصل 🚚' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});
const Order = mongoose.model('Order', OrderSchema);

const GameSchema = new mongoose.Schema({
    title: String,
    img: String,
    denoms: [{ name: String, price: Number }]
});
const Game = mongoose.model('Game', GameSchema);

const AdSchema = new mongoose.Schema({
    videoUrl: String,
    active: { type: Boolean, default: true }
});
const Ad = mongoose.model('Ad', AdSchema);

const MessageSchema = new mongoose.Schema({
    phone: String,
    text: String,
    isAdmin: { type: Boolean, default: false },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
});
const Message = mongoose.model('Message', MessageSchema);

// --- 🌐 المسارات والـ API للمنصة ---

function makeEmbedUrl(url) {
    if (url.includes('youtube.com/shorts/')) {
        return url.replace('youtube.com/shorts/', 'youtube.com/embed/').split('?')[0];
    } else if (url.includes('watch?v=')) {
        return url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
        return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
}

// المستخدمين والتوثيق
app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (user) res.json({ success: true, user });
        else res.status(400).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.status(400).json({ success: false, message: "الحساب موجود مسبقاً" });
        const user = new User({ name, phone, pass });
        await user.save();
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (user) res.json({ success: true, user });
        else res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// الأقسام والمنتجات الموزعة حسب المحلات
app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find({})); } catch(e) { res.json([]); }
});

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({})); } catch(e) { res.json([]); }
});

app.get('/api/products/vendor/:vendor', async (req, res) => {
    try {
        const products = await Product.find({ vendor: req.params.vendor });
        res.json(products);
    } catch (e) { res.status(500).json([]); }
});

// الإعلانات والألعاب والرسائل
app.get('/api/ads', async (req, res) => {
    try { res.json(await Ad.find({ active: true })); } catch(e) { res.json([]); }
});

app.get('/api/games', async (req, res) => {
    try { res.json(await Game.find({})); } catch(e) { res.json([]); }
});

app.get('/api/messages/:phone', async (req, res) => {
    try { res.json(await Message.find({ phone: req.params.phone })); } catch(e) { res.json([]); }
});

app.post('/api/messages/add', async (req, res) => {
    const { phone, text, isAdmin } = req.body;
    try {
        const msg = new Message({ phone, text, isAdmin });
        await msg.save();
        res.json({ success: true, msg });
    } catch (e) { res.status(500).json({ success: false }); }
});

// الفواتير والطلبات المحدثة مع واصل
app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone })); } catch(e) { res.json([]); }
});

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        const user = await User.findOne({ phone });
        const deliveryFee = order.items.length > 0 ? 1000 : 0;
        const finalTotal = order.total + deliveryFee;

        if (!user || user.bal < finalTotal) {
            return res.status(400).json({ success: false, message: "رصيد المحفظة غير كافٍ لتغطية المشتريات والتوصيل" });
        }

        user.bal -= finalTotal;
        await user.save();

        const newOrder = new Order({
            phone,
            items: order.items,
            total: finalTotal,
            deliveryFee: deliveryFee
        });
        await newOrder.save();

        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

// مسار الشحن والتسديد الخارجي عبر المحفظة
app.post('/api/recharge/pay', async (req, res) => {
    const { phone, price, details } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < price) return res.status(400).json({ success: false, message: "رصيدك منخفض جداً" });
        
        user.bal -= price;
        await user.save();

        const newOrder = new Order({
            phone,
            items: [{ name: `شحن وتسديد: ${details}`, price: price, qty: 1 }],
            total: price,
            deliveryFee: 0,
            status: "تم التسديد بنجاح عبر الـ API ✅"
        });
        await newOrder.save();

        res.json({ success: true, currentBal: user.bal });
    } catch(e) { res.status(500).json({ success: false }); }
});

// --- 🛠️ لوحة تحكم الإدارة (الأدمن) ---
app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat, vendor } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Product({ name, price: Number(price), img, cat, vendor }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/user/balance', async (req, res) => {
    const { adminPass, phone, amount } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ success: false });
        user.bal += Number(amount);
        await user.save();
        res.json({ success: true, newBal: user.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/ad/add', async (req, res) => {
    const { adminPass, videoUrl } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const embedLink = makeEmbedUrl(videoUrl);
        await Ad.updateMany({}, { active: false }); 
        await new Ad({ videoUrl: embedLink, active: true }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/add', async (req, res) => {
    const { adminPass, name, sub, img } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Category({ name, sub, img }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => {
    console.log(`🚀 خادم منصة واصل الموحدة يعمل على المنفذ: ${PORT}`);
});
