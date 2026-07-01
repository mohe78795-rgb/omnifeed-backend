const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const USERS_PATH = path.join(__dirname, 'users.json');
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const DB_PATH = path.join(__dirname, 'db.json');

// تهيئة الملفات
async function initFiles() {
    const files = [
        { path: USERS_PATH, default: { active_users: [] } },
        { path: ORDERS_PATH, default: [] },
        { path: DB_PATH, default: [] }
    ];
    for (const file of files) {
        try { await fs.access(file.path); } 
        catch { await fs.writeFile(file.path, JSON.stringify(file.default, null, 2)); }
    }
}
initFiles();

const readJ = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJ = async (p, d) => await fs.writeFile(p, JSON.stringify(d, null, 2));
const getTime = () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });

// --- مسارات المصادقة ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, pass } = req.body;
        let data = await readJ(USERS_PATH);
        if (data.active_users.find(u => u.phone === phone)) {
            return res.status(400).json({ success: false, message: "الرقم مسجل مسبقاً" });
        }
        const newUser = { name, phone, pass, bal: 0, joinDate: getTime() };
        data.active_users.push(newUser);
        await writeJ(USERS_PATH, data);
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        let data = await readJ(USERS_PATH);
        const user = data.active_users.find(u => u.phone === phone && u.pass === pass);
        if (user) res.json({ success: true, user });
        else res.status(401).json({ success: false, message: "خطأ في البيانات" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/user/:phone', async (req, res) => {
    try {
        let data = await readJ(USERS_PATH);
        const user = data.active_users.find(u => u.phone === req.params.phone);
        if (user) res.json({ success: true, user });
        else res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- مسارات المنتجات والطلبات ---

app.get('/api/products', async (req, res) => {
    try { res.json(await readJ(DB_PATH)); } catch (e) { res.status(500).json([]); }
});

app.post('/api/orders/add', async (req, res) => {
    try {
        const { phone, order } = req.body;
        let usersData = await readJ(USERS_PATH);
        let user = usersData.active_users.find(u => u.phone === phone);
        if (user && user.bal >= order.total) {
            user.bal -= order.total;
            await writeJ(USERS_PATH, usersData);
            let orders = await readJ(ORDERS_PATH);
            orders.unshift({ ...order, phone, time: getTime() });
            await writeJ(ORDERS_PATH, orders);
            res.json({ success: true });
        } else res.status(400).json({ success: false, message: "رصيد غير كافٍ" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
