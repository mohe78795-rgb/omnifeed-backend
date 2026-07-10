// ==========================================
// 🔑 إعدادات ربط منظومة ميجا سنتر الحقيقية والمحدثة
// ==========================================
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "123456";
const MEGA_USERNAME = 'u_4082361957';
const MEGA_API_KEY = 'trrC6caLfhvod3HPxTE5ND9Ld6wvdsa5jm1Nlq2GrNdD7';
const MEGA_URL = 'https://megatec-center.com/api/rest.php';

// دالة موحدة لإنشاء وتجهيز بيانات الطلب لتفادي مشاكل الاتصال
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
// 🕹️ 2️⃣ مسارات قسم "السداد" المربوطة بميجا سنتر حقيقي
// ==========================================

app.get('/api/games', async (req, res) => {
    // تجهيز الفورم بالبيانات المطلوبة مباشرة في جسم الطلب لحل مشكلة الصلاحيات
    const form = createMegaFormData('servicelist');

    try {
        const response = await axios.post(MEGA_URL, form, {
            headers: {
                ...form.getHeaders() // تمرير الـ Headers الخاصة بالـ FormData فقط من دون تضارب
            },
            timeout: 15000 // مهلة اتصال 15 ثانية لتجنب تعليق سيرفر Render
        });

        // فحص الرد وتأمين حقول الاستقبال
        if (response.data && (response.data.status === true || response.data.status === "true")) {
            return res.json({
                success: true,
                game_list: response.data.ServiceList || response.data.services || []
            });
        }
        
        console.error("Mega Center API Refusal:", response.data);
        res.json({ success: false, message: response.data.message || "فشل المزود في جلب الخدمات" });
    } catch (e) {
        console.error("⚠️ خطأ الاتصال الفعلي بميجا سنتر:", e.message);
        res.status(500).json({ success: false, message: "خطأ اتصال مع سيرفر الشحن: " + e.message });
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

        // إنشاء الفورم وتمرير حقول الشحن الفوري الحية
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

            // إعادة الرصيد للمحفظة فوراً في حال الفشل
            user.bal += Number(price);
            await user.save();

            return res.json({ success: false, message: response.data.message || "رفض المزود تنفيذ العملية" });
        }

    } catch (e) {
        console.error("Topup Connection Error:", e.message);
        return res.json({ success: false, message: "العملية قيد المعالجة، يرجى مراجعة سجل العمليات" });
    }
});
