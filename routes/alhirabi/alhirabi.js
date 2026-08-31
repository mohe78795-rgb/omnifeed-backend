const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');

// النماذج (تم تصحيحها لتعمل محلياً دون الحاجة لمجلد models خارجي)
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    bal: { type: Number, default: 0 },
    joinDate: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'users');

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: String,
    type: { type: String, default: 'alhirabi_service' },
    targetId: { type: String, required: true },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    price: Number,
    referenceId: { type: String, unique: true },
    status: { type: String, default: 'قيد التنفيذ ⏳' },
    errorCode: String,
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'transactions');

const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
    sender: { type: String, default: "ADMIN" },
    receiver: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    date: { type: String, default: () => new Date().toLocaleString('ar-YE', { timeZone: 'Asia/Aden' }) }
}), 'messages');

// إعدادات الحرابي تيليكوم
const ALHIRABI_BASE_URL = process.env.ALHIRABI_API_URL || 'https://alhirabi.yemoney.net/api/yr/';
const ALHIRABI_SIM_URL = process.env.ALHIRABI_SIM_URL || 'https://alhirabi.yemoney.net/api/yr/sim';

// بيانات الحساب الثابتة
const ALHIRABI_ACCOUNT_PHONE = "735429057";
const ALHIRABI_ACCOUNT_PASS = "moh737465252";

// 1. مسار جلب الخدمات
router.get('/services', async (req, res) => {
    try {
        const response = await axios.get(ALHIRABI_SIM_URL, { timeout: 15000 });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, message: "تعذر جلب بيانات خدمات الحرابي", error: error.message });
    }
});

// 2. مسار تنفيذ الطلبات والشحن
router.post('/topup', async (req, res) => {
    const { phone, price, serviceId, targetNumber, serviceName } = req.body;

    const targetNum = targetNumber || req.body.number;
    const finalServiceId = serviceId;

    if (!phone || !finalServiceId || !targetNum) {
        return res.status(400).json({ success: false, message: "بيانات الطلب ناقصة (رقم الحساب، خدمة الحرابي، أو الرقم المستهدف مفقود)" });
    }

    const itemPrice = price ? Number(price) : 0;

    try {
        let user = null;
        if (itemPrice > 0) {
            user = await User.findOneAndUpdate(
                { phone, bal: { $gte: itemPrice } },
                { $inc: { bal: -itemPrice } },
                { new: true }
            );

            if (!user) {
                return res.json({ success: false, message: "رصيدك الحالي غير كافٍ لإتمام العملية" });
            }
        } else {
            user = await User.findOne({ phone });
        }

        const referenceId = 'ALH-' + Math.floor(10000000 + Math.random() * 90000000).toString();

        const newTxn = new Transaction({
            userId: user ? user._id : null,
            phone,
            type: 'alhirabi_service',
            targetId: String(targetNum),
            serviceId: String(finalServiceId),
            serviceName: serviceName || 'الحرابي تيليكوم',
            price: itemPrice,
            referenceId: referenceId
        });
        await newTxn.save();

        try {
            const payload = {
                ip: "185.11.8.23",
                type: "alhirabi",
                username: ALHIRABI_ACCOUNT_PHONE,
                password: ALHIRABI_ACCOUNT_PASS,
                target: String(targetNum),
                service_id: String(finalServiceId),
                reference: referenceId,
                amount: itemPrice
            };

            console.log("📤 [الحرابي تيليكوم] البيانات المرسلة للمزود:", payload);

            const response = await axios.post(ALHIRABI_BASE_URL, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 45000
            });

            const result = response.data;

            if (result && (Number(result.RC) === 1 || result.status === true || result.status === "true" || result.success === true)) {
                newTxn.status = 'ناجحة ✅';
                await newTxn.save();

                const nTitle = "نجاح العملية عبر الحرابي تيليكوم ⚡";
                const nBody = `تم تنفيذ طلب ${serviceName || 'الخدمة'} للرقم ${targetNum} بنجاح.`;
                await new Message({ receiver: phone, title: nTitle, body: nBody }).save();

                if (typeof global.sendPushNotification === 'function') {
                    global.sendPushNotification(phone, nTitle, nBody);
                }

                return res.json({ success: true, currentBal: user ? user.bal : 0, response: result });
            } else {
                if (user && itemPrice > 0) {
                    await User.findByIdAndUpdate(user._id, { $inc: { bal: itemPrice } });
                }
                newTxn.status = 'فاشلة ❌';
                newTxn.errorCode = String(result ? (result.RC || result.code) : 'UNKNOWN');
                await newTxn.save();

                let failureMsg = result ? (result.RD || result.message || "رفض الطلب من مزود الحرابي") : "استجابة غير صالحة";
                return res.json({ success: false, message: failureMsg, providerDetails: result });
            }

        } catch (error) {
            if (user && itemPrice > 0) {
                await User.findByIdAndUpdate(user._id, { $inc: { bal: itemPrice } });
            }
            newTxn.status = 'معلقة ⚠️';
            newTxn.errorCode = 'TIMEOUT_ERROR';
            await newTxn.save();

            return res.json({
                success: false,
                message: "خطأ في الاتصال بسيرفر الحرابي تيليكوم، تم إعادة الرصيد لحسابك.",
                error: error.response?.data || error.message
            });
        }

    } catch (dbError) {
        return res.status(500).json({ success: false, message: "خطأ داخلي في قاعدة البيانات" });
    }
});

module.exports = router;
