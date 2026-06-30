#!/bin/bash
clear
echo -e "\033[1;33m👑 لوحة مستشار ذكاء أومني فيد التلقائية (v4.0) 👑\033[0m"
echo -e "\033[1;30m--------------------------------------------------\033[0m"
echo -e " \033[1;31m[1] ⚠️ إكمال كود منقطع من المحادثة السابقة فوراً\033[0m"
echo -e "\033[1;30m--------------------------------------------------\033[0m"
echo -e "\033[1;36mاختر رقم الملف ليقوم بكل شيء تلقائياً لـ أومني فيد:\033[0m"
echo -e " [4] واجهة المستخدم (index.html)"
echo -e " [5] سكريبت المستخدم (script.js)"
echo -e " [6] ستايل المستخدم (style.css)"
echo -e " [44] واجهة الأدمن (admin/index.html)"
echo -e " [55] سكريبت الأدمن (admin/script.js)"
echo -e " [66] ستايل الأدمن (admin/style.css)"
echo -e "\033[1;30m--------------------------------------------------\033[0m"
read -p "أدخل رقم الاختيار: " CHOICE

TEMP_FILE=$(mktemp)

if [ "$CHOICE" -eq "1" ]; then
    echo -e "\n\033[1;33m📝 الصق آخر سطر أو عبارة طبعها الـ AI قبل الانقطاع:\033[0m"
    read -p "> " LAST_LINE
    
    cat << INNER_EOF > $TEMP_FILE
تنبيه: الكود السابق انقطع عند السطر التالي تماماً:
"$LAST_LINE"

قم بمتابعة كتابة الكود وإكماله فوراً من بعد هذا السطر مباشرة وحتى نهاية الملف المطلوب لبراند أومني فيد. لا تعد كتابة ما سبق، ابدأ بالتكملة البرمجية مباشرة وبشكل مضغوط (Minified).
INNER_EOF

    echo -e "\n\033[0;35m🔄 جاري إرسال طلب إكمال الانقطاع تلقائياً لـ أومني فيد...\033[0m"
else
    case $CHOICE in
        4)  TARGET_NAME="index.html للمخدم" ; TARGET_RULE="واجهة HTML متكاملة ومتوافقة مع نظام السلة والموقع، مضغوطة بالكامل وبأعلى ضغط ممكن." ;;
        5)  TARGET_NAME="script.js للمستخدم" ; TARGET_RULE="كود JavaScript كامل لتشغيل العمليات، السلة، ومودال الموقع، مضغوط وبدون شرح." ;;
        6)  TARGET_NAME="style.css للمستخدم" ; TARGET_RULE="تنسيقات CSS مخصصة مكملة لـ Tailwind لتضفي الطابع الملكي والبرستيج العالي للمتجر، مضغوطة." ;;
        44) TARGET_NAME="admin/index.html للأدمن" ; TARGET_RULE="واجهة لوحة تحكم الإدارة كاملة لمتابعة طلبات أومني فيد وتعديل المنتجات، بستايل متناسق ومضغوط." ;;
        55) TARGET_NAME="admin/script.js للأدمن" ; TARGET_RULE="سكريبت إدارة لوحة التحكم، استقبال الطلبات وتحديث الحالة، مضغوط وبدون شرح." ;;
        66) TARGET_NAME="admin/style.css للأدمن" ; TARGET_RULE="تنسيقات CSS مخصصة للوحة تحكم الأدمن، مضغوطة بالكامل." ;;
        *) echo -e "\033[1;31m❌ اختيار غير صحيح!\033[0m" ; rm $TEMP_FILE ; exit 1 ;;
    esac

    echo -e "\n\033[0;35m🔄 جاري جمع الملفات الستة وبناء السياق التلقائي لـ أومني فيد...\033[0m"

    cat << INNER_EOF > $TEMP_FILE
أنا مبرمج محترف وأعمل على مشروع متكامل. بناءً على ملفات مشروعي المرفقة بالأسفل، قم بتحديث ملف ($TARGET_NAME) فقط بشكل احترافي ومطور جداً ليناسب الوضع الحالي ويرتبط بالملفات الأخرى بسلاسة.

تنبيه صارم:
1. أرسل كود ملف ($TARGET_NAME) كاملاً من أول سطر وحتى آخر سطر فيه.
2. لا تكتب أي مقدمات أو شرح، ابدأ بالكود مباشرة.
3. اكتب الكود بشكل مضغوط ومختصر جداً (Minified) وبدون أسطر فارغة لكي يظهر كاملاً في رسالة واحدة ولا ينقطع.
4. القاعدة المخصصة للملَف: $TARGET_RULE

إليك أكواد المشروع الحالية للمعاينة والربط:
INNER_EOF

    echo -e "\n--- [1] index.html ---\n" >> $TEMP_FILE ; cat ~/omnifeed-backend/public/index.html >> $TEMP_FILE
    echo -e "\n--- [2] script.js ---\n" >> $TEMP_FILE ; cat ~/omnifeed-backend/public/script.js >> $TEMP_FILE
    echo -e "\n--- [3] style.css ---\n" >> $TEMP_FILE ; cat ~/omnifeed-backend/public/style.css >> $TEMP_FILE
    echo -e "\n--- [4] admin/index.html ---\n" >> $TEMP_FILE ; cat ~/omnifeed-backend/public/admin/index.html >> $TEMP_FILE
    echo -e "\n--- [5] admin/script.js ---\n" >> $TEMP_FILE ; cat ~/omnifeed-backend/public/admin/script.js >> $TEMP_FILE
    echo -e "\n--- [6] admin/style.css ---\n" >> $TEMP_FILE ; cat ~/omnifeed-backend/public/admin/style.css >> $TEMP_FILE

    echo -e "\033[0;32m✅ تم سحب وقراءة كافة ملفات أومني فيد تلقائياً.\033[0m"
    echo -e "\033[1;34m🚀 جاري استدعاء الـ AI وضخ البيانات الآن...\033[0m"
fi

echo -e "\033[1;30m--------------------------------------------------\033[0m"
cat $TEMP_FILE | tgpt
rm $TEMP_FILE
