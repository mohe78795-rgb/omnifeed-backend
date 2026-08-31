const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";

async function checkCollections() {
  try {
    console.log("⏳ جاري الاتصال بقاعدة البيانات...");
    await mongoose.connect(MONGO_URI);
    console.log("\n✅ تم الاتصال بنجاح!\n");
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("📌 الكولكشنات وعدد المستندات داخل كل منها:\n----------------------------------------");
    
    for (let col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(` 📂 الكولكشن: [ ${col.name} ] ---> يحتوي على (${count}) عنصر`);
    }
    console.log("----------------------------------------\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ خطأ:", err.message);
    process.exit(1);
  }
}
checkCollections();
