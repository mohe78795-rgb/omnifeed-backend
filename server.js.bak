const express = require('express');                                              
const mongoose = require('mongoose');                                            
const cors = require('cors');
const path = require('path');                                                                                                                                     
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;                                           

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة أبو حسين (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// --- 🗃️ تعريف موديلات وقواعد البيانات ---
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Category = mongoose.model('Category', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: String,
    img: String
}));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    img: String,
    cat: { type: String, required: true }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: String,
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, default: "ADMIN" },
    receiver: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const Ad = mongoose.model('Ad', new mongoose.Schema({
    videoUrl: { type: String, required: true },
    active: { type: Boolean, default: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";

// --- دالة تحويل وتحسين روابط اليوتيوب تلقائياً قبل الحفظ ---
function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length == 11) {
        return "https://www.youtube.com/embed/" + match[2];
    }
    return url;
}

// --- 🌐 مسارات وإدارات الـ API للأدمن والعميل ---

app.post('/api/admin/dashboard', async (req, res) => {
    const { adminPass } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const orders = await Order.find({}).sort({ _id: -1 });
        const users = await User.find({}).sort({ _id: -1 });
        const categories = await Category.find({});
        const products = await Product.find({});
        const ads = await Ad.find({ active: true }).sort({ _id: -1 });
        res.json({ success: true, data: { orders, users, categories, products, ads } });
    } catch (e) { res.status(500).json({ success: false }); }
});

// شحن وتعديل محفظة المستخدم
app.post('/api/admin/user/update-balance', async (req, res) => {
    const { adminPass, phone, newBalance } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const user = await User.findOneAndUpdate({ phone }, { bal: Number(newBalance) }, { new: true });
        if(user) {
            await new Message({
                receiver: phone,
                title: "تحديث المحفظة الرقمية 💰",
                body: `تم تعديل وتعبئة رصيد حسابك بنجاح. رصيدك الحالي الجديد هو: ${newBalance} YER`
            }).save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// تحديث حالة الفواتير
app.post('/api/admin/order/update-status', async (req, res) => {
    const { adminPass, id, status } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Order.findOneAndUpdate({ id }, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إرسال الإشعارات والرسائل البرقية
app.post('/api/messages/send', async (req, res) => {
    const { adminPass, receiver, title, body } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Message({ receiver, title, body }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// تحديث وحفظ فيديو الإعلان العلوي
app.post('/api/admin/ad/add', async (req, res) => {
    const { adminPass, videoUrl } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const embedLink = makeEmbedUrl(videoUrl);
        await Ad.updateMany({}, { active: false }); // إيقاف الإعلانات القديمة
        await new Ad({ videoUrl: embedLink, active: true }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- الأقسام: إضافة، تعديل، حذف ---
app.post('/api/admin/category/add', async (req, res) => {
    const { adminPass, name, sub, img } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Category({ name, sub, img }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/edit', async (req, res) => {
    const { adminPass, name, sub, img } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Category.findOneAndUpdate({ name }, { sub, img });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/category/delete', async (req, res) => {
    const { adminPass, name } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Category.findOneAndDelete({ name });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- المنتجات: إضافة، تعديل، حذف ---
app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Product({ name, price: Number(price), img, cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/product/edit', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Product.findOneAndUpdate({ name }, { price: Number(price), img, cat });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/product/delete', async (req, res) => {
    const { adminPass, name } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Product.findOneAndDelete({ name });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`);
});

