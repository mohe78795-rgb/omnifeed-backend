const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🛠️ إعدادات الوسائط (Middleware)
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🗄️ الاتصال بقاعدة البيانات (MongoDB)
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/abu_hussein_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ متصل بسحابة أبو حسين (MongoDB)"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// ==========================================
// 🗃️ تعريف موديلات قاعدة البيانات (Schemas & Models)
// ==========================================

// 1. موديل حسابات المستخدمين والمحفظة
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

// 2. موديل الأقسام
const Category = mongoose.model('Category', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sub: String,
    img: String
}));

// 3. موديل المنتجات
const Product = mongoose.model('Product', new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    img: String,
    cat: { type: String, required: true }
}));

// 4. موديل طلبات السلة العادية
const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
    phone: String,
    items: Array,
    total: Number,
    status: { type: String, default: 'قيد المراجعة ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

// 5. موديل صندوق الرسائل والاشعارات الداخلي
const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, default: "ADMIN" },
    receiver: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

// 6. موديل الإعلانات (فيديوهات يوتيوب)
const Ad = mongoose.model('Ad', new mongoose.Schema({
    videoUrl: { type: String, required: true },
    active: { type: Boolean, default: true },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

// 7. موديل عمليات السداد والشحن الفوري المربوط بميجا سنتر
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: String,
    type: { type: String, default: 'game' },
    targetId: { type: String, required: true },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    price: { type: Number, required: true },
    referenceId: { type: String, required: true, unique: true },
    megaOrderId: { type: String, default: null },
    status: { type: String, default: 'قيد التنفيذ ⏳' },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}));

// ==========================================
// 🔑 إعدادات ربط منظومة ميجا سنتر الحقيقية والمحدثة
// ==========================================
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";
const MEGA_USERNAME = 'u_4082361957';
const MEGA_API_KEY = 'trrC6caLfhvod3HPxTE5ND9Ld6wvdsa5jm1Nlq2GrNdD7';
const MEGA_URL = 'https://megatec-center.com/api/rest.php';

function createMegaFormData(requestType) {
    const form = new FormData();
    form.append('username', MEGA_USERNAME);
    form.append('key', MEGA_API_KEY);
    form.append('request', requestType);
    return form;
}

function makeEmbedUrl(url) {
    if (!url) return "";
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length == 11) {
        return "https://www.youtube.com/embed/" + match[2];
    }
    return url;
}

// ==========================================
// 🌐 1️⃣ مسارات العميل الرئيسي (المتجر والمستخدمين)
// ==========================================

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/ads', async (req, res) => {
    try {
        const ads = await Ad.find({ active: true }).sort({ _id: -1 });
        res.json(ads);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/messages/:phone', async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [ { receiver: req.params.phone }, { receiver: 'ALL' } ]
        }).sort({ _id: -1 });
        res.json(messages);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.json({ success: false, message: "رقم الهاتف مسجل مسبقاً!" });

        const newUser = new User({ name, phone, pass, bal: 0 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false, message: "خطأ في السيرفر" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (!user) return res.json({ success: false, message: "رقم الهاتف أو كلمة المرور غير صحيحة" });
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false, message: "خطأ في السيرفر" }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (user) res.json({ success: true, user });
        else res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < order.total) {
            return res.status(400).json({ success: false, message: "الرصيد غير كافٍ" });
        }
        user.bal -= order.total;
        await user.save();

        const newOrder = new Order({
            phone,
            items: order.items,
            total: order.total
        });
        await newOrder.save();

        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    try {
        const orders = await Order.find({ phone: req.params.phone }).sort({ _id: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json([]); }
});

// ==========================================
// 🕹️ 2️⃣ مسارات قسم "السداد" المربوطة بميجا سنتر حقيقي
// ==========================================

app.get('/api/games', async (req, res) => {
    const form = createMegaFormData('servicelist');

    try {
        const response = await axios.post(MEGA_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 15000
        });

        // 🔍 طباعة الرد الفعلي القادم من ميجا سنتر في الـ Logs لمراقبته
        console.log("=== الرد الحقيقي من ميجا سنتر ===", response.data);

        if (response.data && (response.data.status === true || response.data.status === "true")) {
            const list = response.data.ServiceList || response.data.services || response.data.data || [];
            if (list.length > 0) {
                return res.json({
                    success: true,
                    game_list: list
                });
            }
        }
        res.json({ success: false, message: response.data.message || "لا توجد باقات سداد متاحة حالياً بالسيرفر" });
    } catch (e) {
        console.error("خطأ جلب البيانات:", e.message);
        res.status(500).json({ success: false, message: "خطأ اتصال مع سيرفر الشحن" });
    }
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, serviceId, serviceName, user_id, type } = req.body;

    if (!phone || !price || !serviceId || !user_id) {
        return res.status(400).json({ success: false, message: "المعطيات المرسلة غير مكتملة" });
    }

    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < Number(price)) {
            return res.json({ success: false, message: "رصيدك الحالي غير كافٍ لإتمام السداد" });
        }

        user.bal -= Number(price);
        await user.save();

        const referenceId = 'TMN-' + crypto.randomBytes(4).toString('hex').toUpperCase();

        const newTxn = new Transaction({
            userId: user._id,
            phone,
            type: type || 'game',
            targetId: user_id,
            serviceId,
            serviceName,
            price: Number(price),
            referenceId
        });
        await newTxn.save();

        const form = createMegaFormData('neworder');
        form.append('service', String(serviceId));
        form.append('reference', referenceId);
        form.append('player_id', String(user_id));

        const response = await axios.post(MEGA_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 20000
        });

        if (response.data && (response.data.status === true || response.data.status === "true")) {
            newTxn.status = 'ناجحة ✅';
            newTxn.megaOrderId = response.data.orderid || response.data.order_id;
            await newTxn.save();

            await new Message({
                receiver: phone,
                title: "نجاح السداد الفوري ⚡",
                body: `تم تنفيذ طلب ${serviceName} للمعرّف/الرقم ${user_id} بنجاح. خُصم من حسابك ${price} YER.`
            }).save();

            return res.json({ success: true, currentBal: user.bal, orderId: response.data.orderid || response.data.order_id });
        } else {
            newTxn.status = 'فاشلة ❌';
            await newTxn.save();

            user.bal += Number(price);
            await user.save();

            return res.json({ success: false, message: response.data.message || "رفض المزود تنفيذ العملية" });
        }

    } catch (e) {
        return res.json({ success: false, message: "العملية قيد المعالجة في السيرفر، يرجى مراجعة سجل العمليات" });
    }
});

// ==========================================
// 💼 3️⃣ مسارات لوحة التحكم للأدمن (admin.html)
// ==========================================

app.post('/api/admin/dashboard', async (req, res) => {
    const { adminPass } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const orders = await Order.find({}).sort({ _id: -1 });
        const users = await User.find({}).sort({ _id: -1 });
        const categories = await Category.find({});
        const products = await Product.find({});
        const ads = await Ad.find({ active: true }).sort({ _id: -1 });
        const txns = await Transaction.find({}).sort({ _id: -1 });
        res.json({ success: true, data: { orders, users, categories, products, ads, txns } });
    } catch (e) { res.status(500).json({ success: false }); }
});

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

app.post('/api/admin/order/update-status', async (req, res) => {
    const { adminPass, id, status } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await Order.findOneAndUpdate({ id }, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/messages/send', async (req, res) => {
    const { adminPass, receiver, title, body } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Message({ receiver, title, body }).save();
        res.json({ success: true });
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

app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        await new Product({ name, price: Number(price), img, cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// 🚀 بدء تشغيل السيرفر
// ==========================================
app.listen(PORT, () => {
    console.log("🚀 منظومة تمويناتي تعمل بنجاح ومربوطة بميجا سنتر");
});
