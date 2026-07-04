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

// --- 🗃️ تعريف قواعد البيانات (Schemas & Models) ---
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
    id: { type: String, default: () => "INV-" + Math.floor(100000 + Math.random() * 900000) },
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

// --- 🛠️ دوال المعالجة والفلترة الذكية في الخلفية ---

// معالج وتنظيف روابط الصور المدخلة من الأدمن (روابط جوجل ومحركات البحث)
function processAndFixImageUrl(url) {
    if (!url) return 'https://placehold.co/600x400/0c0f14/emerald?text=No+Image';
    
    let cleanedUrl = url.trim();

    // 1. معالجة روابط تحويل صور بحث جوجل المباشر واستخراج رابط الصورة الأصلي النظيف منها
    if (cleanedUrl.includes('google.com/url?')) {
        try {
            const urlParams = new URLSearchParams(cleanedUrl.split('?')[1]);
            if (urlParams.has('imgurl')) {
                return decodeURIComponent(urlParams.get('imgurl'));
            } else if (urlParams.has('q')) {
                return decodeURIComponent(urlParams.get('q'));
            }
        } catch (e) { console.error("خطأ سيرفر في فك رابط جوجل الموجه:", e); }
    }

    // 2. معالجة روابط عرض الصور من جوجل درايف وتحويلها تلقائياً لرابط عرض ويب مباشر
    if (cleanedUrl.includes('drive.google.com/file/d/')) {
        const matches = cleanedUrl.match(/\/file\/d\/([^\/]+)/);
        if (matches && matches[1]) {
            return `https://drive.google.com/uc?export=view&id=${matches[1]}`;
        }
    }

    return cleanedUrl;
}

// تحويل روابط يوتيوب العادية لتعمل داخل المتجر
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
// 🌐 1️⃣ مسارات العميل الرئيسي (المتجر)
// ==========================================

app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find({})); } catch (e) { res.status(500).json([]); }
});

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({})); } catch (e) { res.status(500).json([]); }
});

app.get('/api/ads', async (req, res) => {
    try { res.json(await Ad.find({ active: true }).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});

app.get('/api/messages/:phone', async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [ { receiver: req.params.phone }, { receiver: 'ALL' }, { sender: req.params.phone } ]
        }).sort({ _id: 1 }); // ترتيب تصاعدي لتبدو كالدردشة المتسلسلة
        res.json(messages);
    } catch (e) { res.status(500).json([]); }
});

// مسار استقبال رسائل العملاء الفورية وحفظها داخل قاعدة البيانات للأدمن
app.post('/api/messages/send-from-client', async (req, res) => {
    const { phone, title, body } = req.body;
    try {
        await new Message({ sender: phone, receiver: "ADMIN", title, body }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, phone, pass } = req.body;
    try {
        const exist = await User.findOne({ phone });
        if (exist) return res.json({ success: false, message: "رقم الهاتف مسجل مسبقاً!" });
        const newUser = new User({ name, phone, pass, bal: 0 });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, pass } = req.body;
    try {
        const user = await User.findOne({ phone, pass });
        if (!user) return res.json({ success: false, message: "رقم الهاتف أو كلمة المرور خطأ" });
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

app.post('/api/orders/add', async (req, res) => {
    const { phone, order } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < order.total) return res.status(400).json({ success: false, message: "الرصيد غير كافٍ" });
        
        user.bal -= order.total;
        await user.save();
        await new Order({ phone, items: order.items, total: order.total }).save();
        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/:phone', async (req, res) => {
    try { res.json(await Order.find({ phone: req.params.phone }).sort({ _id: -1 })); } catch (e) { res.status(500).json([]); }
});


// ==========================================
// 🕹️ 2️⃣ منظومة شحن الألعاب التلقائية
// ==========================================

app.get('/api/games', (req, res) => {
    res.json({
        success: true,
        game_list: [
            {
                game_code: "pubg_mobile",
                game_name: "ببجي موبايل - PUBG Mobile",
                denominations: [
                    { id: "uc_60", name: "60 شدة (UC)", price: 1200 },
                    { id: "uc_325", name: "325 شدة (UC)", price: 5800 },
                    { id: "uc_660", name: "660 شدة (UC)", price: 11500 }
                ]
            },
            {
                game_code: "free_fire",
                game_name: "فري فاير - Free Fire",
                denominations: [
                    { id: "dia_100", name: "100 جوهرة 💎", price: 950 },
                    { id: "dia_210", name: "210 جوهرة 💎", price: 1900 },
                    { id: "dia_530", name: "530 جوهرة 💎", price: 4750 }
                ]
            }
        ]
    });
});

app.post('/api/games/validate-user', (req, res) => {
    res.json({ success: true, player_name: "لاعب تمويناتي المعتمد (" + req.body.user_id + ")" });
});

app.post('/api/games/topup', async (req, res) => {
    const { phone, price, game_code, user_id, denomination_id } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || user.bal < price) return res.json({ success: false, message: "رصيدك لا يكفي" });

        user.bal -= Number(price);
        await user.save();

        await new Message({
            receiver: phone,
            title: "نجاح الشحن التلقائي ⚡",
            body: `تم شحن المعرف ${user_id} في لعبة [${game_code}] الفئة [${denomination_id}] بنجاح، وخصم ${price} YER`
        }).save();

        res.json({ success: true, currentBal: user.bal });
    } catch (e) { res.json({ success: false }); }
});


// ==========================================
// 💼 3️⃣ مسارات لوحة تحكم الأدمن والتحصين والمعالجة
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
        // جلب الرسائل الواردة من العملاء للإدارة
        const clientMessages = await Message.find({ receiver: "ADMIN" }).sort({ _id: -1 });
        
        res.json({ success: true, data: { orders, users, categories, products, ads, clientMessages } });
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

// إضافة قسم مع معالجة الرابط تلقائياً لحل مشكلة صور جوجل
app.post('/api/admin/category/add', async (req, res) => {
    const { adminPass, name, sub, img } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const safeImgUrl = processAndFixImageUrl(img); // معالجة وحفظ الرابط الأصلي النظيف
        await new Category({ name, sub, img: safeImgUrl }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إضافة منتج مع معالجة الرابط تلقائياً لحل مشكلة صور جوجل
app.post('/api/admin/product/add', async (req, res) => {
    const { adminPass, name, price, img, cat } = req.body;
    if (adminPass !== ADMIN_SECRET_KEY) return res.status(401).json({ success: false });
    try {
        const safeImgUrl = processAndFixImageUrl(img); // معالجة وحفظ الرابط الأصلي النظيف
        await new Product({ name, price: Number(price), img: safeImgUrl, cat }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 منظومة تمويناتي تعمل بنجاح واستقرار على المنفذ ${PORT}`);
});

