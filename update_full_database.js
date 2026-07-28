const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { MongoClient } = require('mongodb');

// رابط الاتصال بقاعدة البيانات
const uri = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test";
const client = new MongoClient(uri);

// مسارات البحث في ذاكرة الهاتف
const possibleDirs = [
  './',
  '/sdcard/Download/',
  '/storage/emulated/0/Download/'
];

// إعدادات جميع الملفات وربطها برقم PSI والنسبة
const filesConfig = [
  {
    names: ['فائات رصيد مفتوح يوو كروت.xlsx', 'xlsx.فائات رصيد مفتوح يوو كروت', 'فائات رصيد مفتوح يوو كروت .xlsx'],
    psi: 6,
    provider: 'you',
    serviceName: 'سداد - YOU - رصيد',
    marginRate: 0.36363636 // نسبة 36.36% لشركة YOU (تحويل السعر من 220 إلى 300)
  },
  {
    names: ['باقات يوو شبكة .xlsx', 'xlsx. باقات يوو شبكة', 'باقات يوو شبكة.xlsx'],
    psi: 7,
    provider: 'you',
    serviceName: 'سداد - YOU - باقات',
    marginRate: 0.36363636 // نسبة 36.36% لشركة YOU
  },
  {
    names: ['باقات يمن موبايل .xlsx', 'xlsx. باقات يمن موبايل', 'باقات يمن موبايل.xlsx'],
    psi: 46,
    provider: 'yemen_mobile',
    serviceName: 'باقات يمن موبايل',
    marginRate: 0.12781955 // نسبة 12.78% لـ يمن موبايل وباقي الشركات (تحويل السعر من 266 إلى 300)
  },
  {
    names: ['باقات سبافون 71.xlsx', 'xlsx.71 باقات سبافون', 'باقات سبافون 71 .xlsx'],
    psi: 17,
    provider: 'sabafon',
    serviceName: 'باقات سبأفون',
    marginRate: 0.12781955
  },
  {
    names: ['سداد سبافون دفع مسبق.xlsx', 'xlsx.سداد سبافون دفع مسبق', 'سداد سبافون دفع مسبق .xlsx'],
    psi: 14,
    provider: 'sabafon',
    serviceName: 'سداد سبأفون دفع مسبق',
    marginRate: 0.12781955
  },
  {
    names: ['باقات واي .xlsx', 'xlsx. باقات واي', 'باقات واي.xlsx'],
    psi: 20,
    provider: 'y',
    serviceName: 'باقات واي',
    marginRate: 0.12781955
  }
];

// دالة البحث المرن عن الملفات داخل ذاكرة الهاتف
function findFilePath(nameVariations) {
  for (const dir of possibleDirs) {
    if (!fs.existsSync(dir)) continue;
    const filesInDir = fs.readdirSync(dir);
    for (const name of nameVariations) {
      const directPath = path.join(dir, name);
      if (fs.existsSync(directPath)) return directPath;

      const matched = filesInDir.find(f => f.includes(name.replace('.xlsx', '').replace('xlsx.', '').trim()));
      if (matched) return path.join(dir, matched);
    }
  }
  return null;
}

function processExcel(cfg) {
  const filePath = findFilePath(cfg.names);
  if (!filePath) {
    console.warn(`⚠️ لم يتم العثور على الملف لخدمة: [${cfg.serviceName}]`);
    return [];
  }

  console.log(`📖 استخراج ومعالجة الملف: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

  const items = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const name = String(row[1]).trim();
    const offerId = row[2] !== undefined ? String(row[2]).trim() : '';
    const originalPrice = row[3] !== undefined ? Number(row[3]) : 0;
    const numberType = row[4] ? String(row[4]).trim() : 'الكل';
    const internetType = row[5] ? String(row[5]).trim() : 'الكل';

    // حساب السعر الجديد بعد النسبة والتقريب
    const marginAmount = originalPrice * cfg.marginRate;
    const finalPrice = Math.round(originalPrice + marginAmount);
    const profitPercentage = (cfg.marginRate * 100).toFixed(2);

    items.push({
      psi: cfg.psi,
      provider: cfg.provider,
      serviceName: cfg.serviceName,
      name: name,
      offerId: offerId,
      amt: originalPrice,
      originalPrice: originalPrice,
      profitMarginPercentage: `${profitPercentage}%`,
      price: finalPrice, // السعر النهائي المعدل
      numberType: numberType,
      internetType: internetType,
      updatedAt: new Date()
    });
  }

  return items;
}

async function runMasterUpdate() {
  try {
    let completePackageList = [];

    // 1. استخراج ومعالجة وحساب جميع الباقات من جميع الشركات
    for (const cfg of filesConfig) {
      const pkgItems = processExcel(cfg);
      completePackageList = completePackageList.concat(pkgItems);
    }

    if (completePackageList.length === 0) {
      console.log("❌ لم يتم العثور على أي ملفات في مجلد التنزيلات.");
      return;
    }

    // 2. حفظ النسخة المنظمة الموحدة محلياً في ملف JSON واحد
    const localJsonPath = '/sdcard/Download/packages_database.json';
    fs.writeFileSync('packages_database.json', JSON.stringify(completePackageList, null, 2));
    fs.writeFileSync(localJsonPath, JSON.stringify(completePackageList, null, 2));
    
    console.log(`\n✅ تم تجميع وتنظيم كافة الباقات بنجاح!`);
    console.log(`💾 تم حفظ الملف الموحد المنظم في: ${localJsonPath}`);

    // 3. الاتصال بقاعدة البيانات واستبدال البيانات القديمة بالكامل في 'mdarahimpackages'
    await client.connect();
    const db = client.db('test');
    const collection = db.collection('mdarahimpackages');

    // تفريغ الملف/المجموعة السابقة لإعادة كتابتها بترتيب وبأسعار جديدة
    await collection.deleteMany({});
    const dbResult = await collection.insertMany(completePackageList);

    console.log(`\n🚀 تم تحديث واستبدال البيانات في مجموعة 'mdarahimpackages' بنجاح!`);
    console.log(`📊 إجمالي عدد الباقات المرفوقة بأسعارها المحدثة: ${dbResult.insertedCount}`);

  } catch (err) {
    console.error("❌ حدث خطأ أثناء تنفيذ التحديث:", err);
  } finally {
    await client.close();
  }
}

runMasterUpdate();
