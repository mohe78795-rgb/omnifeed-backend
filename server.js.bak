const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// قائمة الحسابات المعتمدة فقط
const users = [
  { name: 'عمر', phone: '333333333', pass: 'ه', bal: 0 },
  { name: 'محمد', phone: '735429057', pass: '123', bal: 0 }
];

const jawaliTransactions = [];
const usedTransactions = [];

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digitsOnly = phone.toString().replace(/\D/g, '');
  return digitsOnly.slice(-9);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 📩 استقبال إشعار جوالي من الأتمتة (Webhook)
app.post('/api/jawali', (req, res) => {
  try {
    let { amount, sender, raw, transid } = req.body;

    if (raw && typeof raw === 'string') {
      const extractedAmount = raw.match(/مبلغ\s*([0-9,.]+)/i);
      if (extractedAmount) {
        amount = parseFloat(extractedAmount[1].replace(/,/g, ''));
      }

      const extractedSender = raw.match(/من\s*(\d+)/i);
      if (extractedSender) {
        sender = extractedSender[1];
      }
    }

    const cleanSender = cleanPhoneNumber(sender);

    if (!transid) {
      transid = `JW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const newTx = {
      amount: Number(amount) || 0,
      sender: cleanSender || 'غير معروف',
      rawSender: sender || '',
      transid,
      raw: raw || '',
      createdAt: new Date()
    };

    jawaliTransactions.push(newTx);
    console.log("📩 تم تسجيل الحوالة بنجاح:", newTx);

    return res.status(200).json({ status: 'success', message: 'تم حفظ الحوالة بنجاح', data: newTx });
  } catch (error) {
    console.error("❌ خطأ استقبال الحوالة:", error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 💳 مطابقة الحوالة والشحن للحسابات المسجلة فقط
app.post('/api/user/recharge', async (req, res) => {
  try {
    const { amount, sender } = req.body;

    if (!sender || !amount) {
      return res.status(400).json({ success: false, message: 'رقم المرسل والمبلغ مطلوبان' });
    }

    const inputSenderClean = cleanPhoneNumber(sender);
    const inputAmount = Number(amount);

    // 1. التحقق أولاً من أن الحساب مسجل في النظام
    const user = users.find(u => cleanPhoneNumber(u.phone) === inputSenderClean);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'عذراً، هذا الرقم غير مسجل كحساب لدينا في النظام.' 
      });
    }

    // 2. المطابقة الصارمة للحوالة في الذاكرة (الرقم + المبلغ)
    const matchedJawaliTx = jawaliTransactions
      .filter(tx => tx.sender === inputSenderClean && Number(tx.amount) === inputAmount)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!matchedJawaliTx) {
      return res.status(404).json({ 
        success: false, 
        message: 'لم يتم العثور على حوالة بهذه البيانات، يرجى التأكد من كتابة المبلغ الصحيح والمطابق للرسالة.' 
      });
    }

    // 3. منع تكرار استخدام الحوالة
    const isAlreadyUsed = usedTransactions.some(tx => tx.transid === matchedJawaliTx.transid);
    if (isAlreadyUsed) {
      return res.status(400).json({ success: false, message: 'تم استخدام هذه الحوالة وتأكيدها سابقاً!' });
    }

    // 4. إضافة الرصيد لحساب العميل الموجود
    user.bal += inputAmount;

    usedTransactions.push({
      transid: matchedJawaliTx.transid,
      phone: inputSenderClean,
      amount: inputAmount,
      usedAt: new Date()
    });

    console.log(`✅ تم شحن رصيد ${user.name} (${inputSenderClean}) بمبلغ ${inputAmount}. الرصيد الجديد: ${user.bal}`);

    return res.status(200).json({
      success: true,
      message: `أهلاً ${user.name}، تم اعتماد الحوالة بمبلغ ${inputAmount} ريال وشحن رصيدك بنجاح.`,
      newBalance: user.bal
    });

  } catch (error) {
    console.error('❌ خطأ معالجة الشحن:', error.message);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الحوالة',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`);
});

