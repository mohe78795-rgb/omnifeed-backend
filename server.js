const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ تأمين قاعدة البيانات عبر متغيرات البيئة
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
    console.error("❌ خطأ: MONGO_URI غير معرف في متغيرات البيئة!");
    process.exit(1);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Securely Connected to MongoDB Atlas"))
    .catch(e => console.error("❌ Connection Failed:", e.message));

// --- هياكل البيانات (Schemas) ---
const userSchema = new mongoose.Schema({ name: String, phone: { type: String, unique: true }, pass: String, bal: { type: Number, default: 0 } });
const catSchema = new mongoose.Schema({ name: String, sub: String, img: String });
const productSchema = new mongoose.Schema({ name: String, price: Number, img: String, cat: String });
const orderSchema = new mongoose.Schema({ id: String, phone: String, items: Array, total: Number, status: { type: String, default: 'قيد المراجعة' }, date: { type: String, default: () => new Date().toLocaleString('ar-YE') } });
const adSchema = new mongoose.Schema({ videoUrl: String, active: { type: Boolean, default: true } });

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', catSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Ad = mongoose.model('Ad', adSchema);

app.use(cors()); app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));

// --- مسارات الـ API (نفس المنطق السابق المستقر) ---
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.get('/api/ads/active', async (req, res) => res.json(await Ad.findOne({ active: true })));
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        if (await User.findOne({ phone })) return res.status(400).json({ message: "الرقم مسجل" });
        const user = new User({ name, phone, pass }); await user.save();
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ phone: req.body.phone, pass: req.body.pass });
    if (user) res.json({ success: true, user }); else res.status(401).json({ message: "بيانات خاطئة" });
});
app.get('/api/auth/user/:phone', async (req, res) => res.json({ success: true, user: await User.findOne({ phone: req.params.phone }) }));
app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body; const user = await User.findOne({ phone });
    if (user && user.bal >= order.total) {
        user.bal -= order.total; await user.save();
        const serverId = "INV-" + Date.now().toString().slice(-6);
        const newOrder = new Order({ id: serverId, phone, items: order.items, total: order.total });
        await newOrder.save(); res.json({ success: true, currentBal: user.bal, order: newOrder });
    } else res.status(400).json({ message: "رصيد غير كافٍ" });
});
app.get('/api/orders/:phone', async (req, res) => res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })));

app.listen(PORT, () => console.log(`🚀 Secure Server running on port ${PORT}`));
