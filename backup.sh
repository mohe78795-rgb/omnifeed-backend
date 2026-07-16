#!/bin/bash

# كشف مسار المجلد الحالي للمشروع تلقائياً
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# مسار مجلد النسخ الاحتياطي في الذاكرة الداخلية للهاتف
PHONE_BACKUP_DIR="/sdcard/Gg 212"

# تعريف الألوان (ANSI Escape Codes)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # إعادة التعيين للوضع الافتراضي

# التأكد من وجود مجلد الحفظ في الهاتف
init_storage() {
    if [ ! -d "$PHONE_BACKUP_DIR" ]; then
        echo -e "${YELLOW}📁 جاري إنشاء مجلد النسخ الاحتياطي [Gg 212] في ذاكرة الهاتف...${NC}"
        mkdir -p "$PHONE_BACKUP_DIR"
    fi
}

# دالة لسحب مجموعة واحدة محددة ونقلها فوراً لتجنب بقاء البيانات في مجلد المشروع
backup_single() {
    local col_name=$1
    local file_name=$2
    local display_name=$3
    
    echo -e "${YELLOW}🔄 جاري تشغيل سحب $display_name...${NC}"
    node "$PROJECT_DIR/exporter.js" "$col_name"
    
    if [ -f "$PROJECT_DIR/$file_name" ]; then
        init_storage
        cp "$PROJECT_DIR/$file_name" "$PHONE_BACKUP_DIR/"
        rm "$PROJECT_DIR/$file_name"
        echo -e "${GREEN}✅ تم النقل بنجاح إلى الهاتف: Gg 212/$file_name${NC}"
    else
        echo -e "${RED}❌ فشل السحب لـ $display_name. تأكد من الإنترنت.${NC}"
    fi
}

# دالة سحب وتصدير كافة البيانات دفعة واحدة وتنظيف المجلد المحلي فوراً
backup_all() {
    echo -e "${CYAN}⚡ جاري سحب كافة المجموعات السحابية دفعة واحدة...${NC}"
    node "$PROJECT_DIR/exporter.js"
    
    init_storage
    
    local files=(
        "users.json" "users_ar.json" "devicetokens.json"
        "ads.json" "ads_ar.json" "products.json" "products_ar.json"
        "categories.json" "orders.json" "orders_ar.json"
        "transactions.json" "messages.json" "appsettings.json" "games.json"
    )
    
    local success_count=0
    for file in "${files[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            cp "$PROJECT_DIR/$file" "$PHONE_BACKUP_DIR/"
            rm "$PROJECT_DIR/$file"
            success_count=$((success_count + 1))
        fi
    done
    echo -e "${GREEN}✅ اكتمل النسخ الاحتياطي الشامل بنجاح! تم نقل ($success_count) ملفات إلى المجلد [Gg 212].${NC}"
}

# القائمة التفاعلية للمستخدم
show_menu() {
    clear
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${PURPLE}    🤖 نظام سحب وإدارة بيانات تموينات أبو حسين   ${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo -e " [${CYAN}1${NC}] سحب ونقل مجلد المستخدمين (${YELLOW}users.json${NC})"
    echo -e " [${CYAN}2${NC}] سحب ونقل مجلد المستخدمين بالعربي (${YELLOW}users_ar.json${NC})"
    echo -e " [${CYAN}3${NC}] سحب ونقل رموز أجهزة العملاء (${YELLOW}devicetokens.json${NC})"
    echo -e " [${CYAN}4${NC}] سحب ونقل الإعلانات الإنجليزية (${YELLOW}ads.json${NC})"
    echo -e " [${CYAN}5${NC}] سحب ونقل الإعلانات العربية (${YELLOW}ads_ar.json${NC})"
    echo -e " [${CYAN}6${NC}] سحب ونقل المنتجات الإنجليزية (${YELLOW}products.json${NC})"
    echo -e " [${CYAN}7${NC}] سحب ونقل المنتجات العربية (${YELLOW}products_ar.json${NC})"
    echo -e " [${CYAN}8${NC}] سحب ونقل الطلبات الإنجليزية (${YELLOW}orders.json${NC})"
    echo -e " [${CYAN}9${NC}] سحب ونقل الطلبات العربية (${YELLOW}orders_ar.json${NC})"
    echo -e " [${CYAN}10${NC}] سحب ونقل العمليات المالية (${YELLOW}transactions.json${NC})"
    echo -e " [${CYAN}11${NC}] سحب ونقل رسائل العملاء (${YELLOW}messages.json${NC})"
    echo -e "${BLUE}-------------------------------------------------${NC}"
    echo -e " [${YELLOW}212${NC}] 📁 عرض كود وملف backup.sh نفسه (cat)"
    echo -e " [${YELLOW}213${NC}] 📝 عرض كود وملف exporter.js (cat)"
    echo -e " [${GREEN}50${NC}] ⭐ سحب ونسخ كافة البيانات والملفات (الكل)"
    echo -e " [${RED}99${NC}] ❌ الخروج من السكربت"
    echo -e "${BLUE}=================================================${NC}"
    read -p "أدخل رقم الأمر المطلوب تنفيذه: " opt
    
    case $opt in
        1)  backup_single "users" "users.json" "المستخدمين (EN)" ;;
        2)  backup_single "المستخدمون" "users_ar.json" "المستخدمين (AR)" ;;
        3)  backup_single "devicetokens" "devicetokens.json" "رموز الهواتف" ;;
        4)  backup_single "ads" "ads.json" "الإعلانات (EN)" ;;
        5)  backup_single "إعلانات" "ads_ar.json" "الإعلانات (AR)" ;;
        6)  backup_single "products" "products.json" "المنتجات (EN)" ;;
        7)  backup_single "منتجات" "products_ar.json" "المنتجات (AR)" ;;
        8)  backup_single "orders" "orders.json" "الطلبات (EN)" ;;
        9)  backup_single "طلبات" "orders_ar.json" "الطلبات (AR)" ;;
        10) backup_single "transactions" "transactions.json" "العمليات والتحويلات" ;;
        11) backup_single "messages" "messages.json" "سجل الرسائل" ;;
        212)
            echo -e "\n${CYAN}📂 اسم المجلد الحالي:${NC} ${YELLOW}$(basename "$PROJECT_DIR")${NC}"
            echo -e "${CYAN}📝 محتوى ملف backup.sh الحالي:${NC}"
            echo -e "${BLUE}------------------------------------${NC}"
            cat "$PROJECT_DIR/backup.sh"
            echo -e "${BLUE}------------------------------------${NC}"
            ;;
        213)
            echo -e "\n${CYAN}📂 اسم المجلد الحالي:${NC} ${YELLOW}$(basename "$PROJECT_DIR")${NC}"
            if [ -f "$PROJECT_DIR/exporter.js" ]; then
                echo -e "${CYAN}📝 محتوى ملف exporter.js:${NC}"
                echo -e "${BLUE}------------------------------------${NC}"
                cat "$PROJECT_DIR/exporter.js"
                echo -e "${BLUE}------------------------------------${NC}"
            else
                echo -e "${RED}❌ ملف exporter.js غير موجود في هذا المجلد!${NC}"
            fi
            ;;
        50) backup_all ;;
        99) echo -e "${RED}👋 تم الخروج، بالتوفيق يا محمد!${NC}"; exit 0 ;;
        *)  echo -e "${RED}❌ رقم غير صحيح! جرب مجدداً...${NC}"; sleep 1; show_menu ;;
    esac
    
    echo ""
    read -p "اضغط Enter للعودة للقائمة..." dummy
    show_menu
}

show_menu
