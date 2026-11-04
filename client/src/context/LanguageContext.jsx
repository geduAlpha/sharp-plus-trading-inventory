import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────
// SUPPORTED LANGUAGES LIST
// ─────────────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr', googleCode: 'en' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', dir: 'ltr', googleCode: 'am' },
  { code: 'om', name: 'Afaan Oromoo', nativeName: 'Afaan Oromoo', flag: '🇪🇹', dir: 'ltr', googleCode: 'om' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', flag: '🇪🇹', dir: 'ltr', googleCode: 'ti' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', flag: '🇪🇹', dir: 'ltr', googleCode: 'so' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', googleCode: 'ar' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', googleCode: 'fr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr', googleCode: 'zh-CN' },
];

// ─────────────────────────────────────────────────────────────
// BUILT-IN MULTILINGUAL ERP DICTIONARY
// ─────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // Topbar & Navigation
    app_title: 'Sharp Plus Trading & Inventory',
    dashboard: 'Dashboard',
    language: 'Language',
    select_language: 'Select Language',
    translate_system: 'Translate System',
    translate_data_info: 'Translate Info & System Data',
    live_translation_active: 'Live Translation Active',
    search_language: 'Search language...',
    theme_studio: 'Theme Studio',
    dark_mode: 'Dark Mode',
    bright_mode: 'Bright Mode',
    notifications: 'Notifications',
    fullscreen: 'Fullscreen',
    toggle_sidebar: 'Toggle Sidebar',
    system_developer: 'System Developer',
    profile_settings: 'Account Settings',
    logout: 'Sign Out',

    // Dashboard Quick Language Banner
    quick_language_title: 'System Language & Data Translation',
    quick_language_desc: 'Translate dashboard metrics, vouchers, menus, and transaction records across the system in real time.',
    active_lang_badge: 'Active Language',
    auto_translate_tables: 'Auto-translate tables & dynamic data',
    reset_to_english: 'Reset to English',
    more_languages: 'More Languages',

    // Dashboard KPIs
    cash_sales: 'Cash Sales',
    credit_sales: 'Credit Sales',
    total_sales: 'Total Sales (Cash + Credit)',
    total_stock_value: 'Total Stock Value',
    available_materials: 'Available Materials',
    monthly_purchases: 'Avg Treat. / Purchases',
    reorder_alerts: 'Reorder Alerts',
    view_transactions: 'View Transactions',
    view_all_sales: 'View All Sales',
    completed_transactions: 'completed transactions',
    credit_records: 'credit records',
    total_sales_vouchers: 'total sales vouchers',
    spend: 'Spend',
    in_categories: 'In {n} categories',
    monthly_inflow: 'Monthly inflow spend',
    out_of_stock: 'out of stock',

    // Charts & Sections
    stock_by_category: 'Stock by Category & Ratio',
    category_desc: 'Inventory safety & movement distribution',
    movement_trend: 'Outflow vs. Inflow Movement Trend',
    inbound_grv: 'Inbound (GRV)',
    outbound_sales: 'Outbound (Disposal/Sales)',
    top_fast_moving: 'Top Fast-Moving Materials',
    recent_activity: 'Recent Stock & Sales Activities',
    all_rights_reserved: 'All rights reserved.',

    // Navigation & Subsystem
    stock_management_system: 'Stock Management System',
    sales_marketing_ms: 'Sales and Marketing MS',
    sub_systems: 'Subsystems',
    cash_sales_voucher: 'Cash Sales Voucher',
    credit_sales_voucher: 'Credit Sales Voucher',
    zeroing_voucher: 'Zeroing Voucher',
    security_report: 'Security Report',
    sales_closing: 'Sales Closing',
    sales_route_mapping: 'Sales Route Mapping',
    sales_voucher_report: 'Sales & Marketing Voucher Report',
    stock_voucher_report: 'Stock Management Voucher Report',
    all_ids: "All ID's",
    analytics_pl: 'Analytics & P&L',
    items_materials: 'Items & Materials',
    purchases: 'Purchases & Approvals',
    suppliers: 'Suppliers',
    reports_analytics: 'Reports & Analytics',
    settings: 'Settings & Studio',

    // Actions & Common
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    export_excel: 'Export Excel',
    export_pdf: 'Export PDF',
    print: 'Print',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    approve: 'Approve',
    reject: 'Reject',
    status: 'Status',
    date: 'Date',
    voucher_code: 'Voucher Code',
    customer: 'Customer',
    total_amount: 'Total Amount',
    actions: 'Actions',
  },

  am: {
    // Topbar & Navigation
    app_title: 'ሻርፕ ፕላስ የንግድ እና ዕቃ መቆጣጠሪያ',
    dashboard: 'ዳሽቦርድ',
    language: 'ቋንቋ',
    select_language: 'ቋንቋ ይምረጡ',
    translate_system: 'ስርዓቱን ተርጉም',
    translate_data_info: 'መረጃዎችን እና የስርዓቱን ዳታ ተርጉም',
    live_translation_active: 'የቀጥታ ትርጉም እየሰራ ነው',
    search_language: 'ቋንቋ ፈልግ...',
    theme_studio: 'የገጽታ ማስተካከያ',
    dark_mode: 'ጨለማ ገጽታ',
    bright_mode: 'ብሩህ ገጽታ',
    notifications: 'ማሳወቂያዎች',
    fullscreen: 'ሙሉ ገጽ',
    toggle_sidebar: 'ማውጫውን አሳይ/ደብቅ',
    system_developer: 'የስርዓት አልሚ',
    profile_settings: 'የመለያ ቅንብሮች',
    logout: 'ውጣ',

    // Dashboard Quick Language Banner
    quick_language_title: 'የስርዓት ቋንቋ እና የዳታ ትርጉም',
    quick_language_desc: 'የዳሽቦርድ ቁጥሮችን፣ ደረሰኞችን፣ ማውጫዎችን እና የግብይት መረጃዎችን በቀጥታ በፈለጉት ቋንቋ ይመልከቱ።',
    active_lang_badge: 'አሁን የሚሰራበት ቋንቋ',
    auto_translate_tables: 'ሰንጠረዦችን እና ዳታዎችን በራስ-ሰር ተርጉም',
    reset_to_english: 'ወደ እንግሊዝኛ መልስ',
    more_languages: 'ተጨማሪ ቋንቋዎች',

    // Dashboard KPIs
    cash_sales: 'የጥሬ ገንዘብ ሽያጭ',
    credit_sales: 'የብድር ሽያጭ',
    total_sales: 'ጠቅላላ ሽያጭ (ጥሬ ገንዘብ + ብድር)',
    total_stock_value: 'ጠቅላላ የዕቃ ክምችት ዋጋ',
    available_materials: 'ያሉ ዕቃዎች / ቁሳቁሶች',
    monthly_purchases: 'ወርሃዊ ግዢዎች / ወጪዎች',
    reorder_alerts: 'የድጋሚ ትዕዛዝ ማስጠንቀቂያ',
    view_transactions: 'ግብይቶችን ይመልከቱ',
    view_all_sales: 'ሁሉንም ሽያጮች ይመልከቱ',
    completed_transactions: 'የተጠናቀቁ ግብይቶች',
    credit_records: 'የብድር መዝገቦች',
    total_sales_vouchers: 'አጠቃላይ የሽያጭ ደረሰኞች',
    spend: 'የወጣ ወጪ',
    in_categories: 'በ {n} ምድቦች ውስጥ',
    monthly_inflow: 'ወርሃዊ የገቢ ግዢ ወጪ',
    out_of_stock: 'ያለቀ ዕቃ',

    // Charts & Sections
    stock_by_category: 'የዕቃ ክምችት በምድብ እና መጠን',
    category_desc: 'የዕቃዎች ደህንነት እና የእንቅስቃሴ ስርጭት',
    movement_trend: 'የወጪ እና ገቢ ዕቃዎች እንቅስቃሴ ሂደት',
    inbound_grv: 'ገቢ ዕቃዎች (GRV)',
    outbound_sales: 'ወጪ ዕቃዎች (ሽያጭ/አወጋገድ)',
    top_fast_moving: 'በከፍተኛ ፍጥነት የሚንቀሳቀሱ ዕቃዎች',
    recent_activity: 'የቅርብ ጊዜ የዕቃ እና ሽያጭ እንቅስቃሴዎች',
    all_rights_reserved: 'መብቱ በህግ የተጠበቀ ነው።',

    // Navigation & Subsystem
    stock_management_system: 'የዕቃ ክምችት አስተዳደር ስርዓት',
    sales_marketing_ms: 'የሽያጭና ገበያ አስተዳደር',
    sub_systems: 'ንዑስ ስርዓቶች (Subsystems)',
    cash_sales_voucher: 'የጥሬ ገንዘብ ሽያጭ ደረሰኝ',
    credit_sales_voucher: 'የብድር ሽያጭ ደረሰኝ',
    zeroing_voucher: 'የዜሮ ማድረግ ደረሰኝ (Zeroing)',
    security_report: 'የደህንነት እና ኦዲት ሪፖርት',
    sales_closing: 'የሽያጭ ዝግ (Sales Closing)',
    sales_route_mapping: 'የሽያጭ መስመር ካርታ (Route)',
    sales_voucher_report: 'የሽያጭና ግብይት ደረሰኞች ሪፖርት',
    stock_voucher_report: 'የዕቃ ክምችት ደረሰኞች ሪፖርት',
    all_ids: 'መታወቂያዎች (All IDs)',
    analytics_pl: 'ትንታኔ እና ትርፍ/ኪሳራ',
    items_materials: 'ዕቃዎች እና ጥሬ ዕቃዎች',
    purchases: 'ግዢዎች እና ማጽደቂያዎች',
    suppliers: 'አቅራቢዎች',
    reports_analytics: 'ሪፖርቶች እና ትንታኔዎች',
    settings: 'ቅንብሮች እና ገጽታ',

    // Actions & Common
    search: 'ፈልግ',
    filter: 'አጣራ',
    refresh: 'አድስ',
    export_excel: 'ወደ ኤክሴል አውጣ',
    export_pdf: 'ወደ ፒዲኤፍ አውጣ',
    print: 'አትም',
    view: 'ተመልከት',
    edit: 'አስተካክል',
    delete: 'አስወግድ',
    save: 'አስቀምጥ',
    cancel: 'ሰርዝ',
    approve: 'አጽድቅ',
    reject: 'ውድቅ አድርግ',
    status: 'ሁኔታ',
    date: 'ቀን',
    voucher_code: 'የደረሰኝ ቁጥር',
    customer: 'ደንበኛ',
    total_amount: 'አጠቃላይ ዋጋ',
    actions: 'ተግባራት',
  },

  om: {
    // Topbar & Navigation
    app_title: 'Shaarp Pilaas Toora Daldalaa fi Meeshaa',
    dashboard: 'Daashboordii',
    language: 'Afaan',
    select_language: 'Afaan Filadhu',
    translate_system: 'Sirna Hiiki',
    translate_data_info: 'Oodeeffannoo fi Daataa Sirnaa Hiiki',
    live_translation_active: 'Hiikni Kallattii Hojjechaa Jira',
    search_language: 'Afaan barbaadi...',
    theme_studio: 'Haala Halluu',
    dark_mode: 'Haala Dukkanaa',
    bright_mode: 'Haala Ifaa',
    notifications: 'Beeksisa',
    fullscreen: 'Gara Guutuutti',
    toggle_sidebar: 'Saayidbaarii Cufi/Bani',
    system_developer: 'Ijaaraa Sirnichaa',
    profile_settings: 'Qindaa’ina Herregaa',
    logout: 'Bahi',

    // Dashboard Quick Language Banner
    quick_language_title: 'Afaan Sirnaa fi Hiika Daataa',
    quick_language_desc: 'Herrega daashboordii, nagahee, baafataalee fi galmee daldalaa yeroo ammaa keessatti hiikaa.',
    active_lang_badge: 'Afaan Ammaa',
    auto_translate_tables: 'Gabatee fi daataa ofumaan hiiki',
    reset_to_english: 'Gara Ingiliffaatti deebisi',
    more_languages: 'Afaanota Biroo',

    // Dashboard KPIs
    cash_sales: 'Gurgurtaa Qarshii',
    credit_sales: 'Gurgurtaa Liqii',
    total_sales: 'Waliigala Gurgurtaa (Qarshii + Liqii)',
    total_stock_value: 'Gatii Meeshaa Waliigalaa',
    available_materials: 'Meeshaalee Jiran',
    monthly_purchases: 'Bittaa Ji’aa / Baasii',
    reorder_alerts: 'Akeekkachiisa Ajaja Lammaffaa',
    view_transactions: 'Daldaloota Ilaali',
    view_all_sales: 'Gurgurtaa Hunda Ilaali',
    completed_transactions: 'daldaloota xumuraman',
    credit_records: 'galmee liqii',
    total_sales_vouchers: 'nagahee gurgurtaa waliigalaa',
    spend: 'Baasii',
    in_categories: 'Ramaddii {n} keessatti',
    monthly_inflow: 'Baasii galii ji’aa',
    out_of_stock: 'istookii dhumate',

    // Charts & Sections
    stock_by_category: 'Meeshaa Ramaddiidhaan',
    category_desc: 'Nageenya meeshaa fi raabsa sochii',
    movement_trend: 'Sochii Meeshaa Bahaa fi Galaa',
    inbound_grv: 'Meeshaa Galaa (GRV)',
    outbound_sales: 'Meeshaa Bahaa (Gurgurtaa/Balfeessa)',
    top_fast_moving: 'Meeshaalee Dafee Socho’an',
    recent_activity: 'Sochiiwwan Dhihoo',
    all_rights_reserved: 'Mirgi Qopheessaa Seeraan Kan Eegameedha.',

    // Navigation & Subsystem
    stock_management_system: 'Sirna Bulchiinsa Meeshaa',
    sales_marketing_ms: 'Bulchiinsa Gurgurtaa fi Beeksisuuf',
    sub_systems: 'Sirnoota Xiqqaa',
    cash_sales_voucher: 'Nagahee Gurgurtaa Qarshii',
    credit_sales_voucher: 'Nagahee Gurgurtaa Liqii',
    zeroing_voucher: 'Nagahee Qulqulleessuu (Zeroing)',
    security_report: 'Gabaasa Nageenyaa',
    sales_closing: 'Cufiinsa Gurgurtaa',
    sales_route_mapping: 'Kaartaa Karaa Gurgurtaa',
    sales_voucher_report: 'Gabaasa Nagahee Gurgurtaa',
    stock_voucher_report: 'Gabaasa Nagahee Meeshaa',
    all_ids: "Waraqaa Eenyummaa Hunda",
    analytics_pl: 'Xiinxala fi Bu’aa/Kasaaraa',
    items_materials: 'Meeshaalee',
    purchases: 'Bittaa fi Mirkaneessuu',
    suppliers: 'Dhiyeessitoota',
    reports_analytics: 'Gabaasaa fi Xiinxala',
    settings: 'Qindaa’ina',

    // Actions & Common
    search: 'Barbaadi',
    filter: 'Gingilchi',
    refresh: 'Haaromsi',
    export_excel: 'Gara Excel tti baasi',
    export_pdf: 'Gara PDF tti baasi',
    print: 'Maxxansi',
    view: 'Ilaali',
    edit: 'Gulaali',
    delete: 'Haqi',
    save: 'Olkaayi',
    cancel: 'Haqi/Dhiisi',
    approve: 'Mirkaneessi',
    reject: 'Kufaa Taasisi',
    status: 'Haala',
    date: 'Guyyaa',
    voucher_code: 'Koodii Nagahee',
    customer: 'Maamila',
    total_amount: 'Ida’ama Waliigalaa',
    actions: 'Tarkaanfiiwwan',
  },

  ti: {
    // Topbar & Navigation
    app_title: 'ሻርፕ ፕላስ ንግዲን ቁጽጽር ንብረትን',
    dashboard: 'ዳሽቦርድ',
    language: 'ቋንቋ',
    select_language: 'ቋንቋ ምረጽ',
    translate_system: 'ስርዓት ተርጉም',
    translate_data_info: 'ሓበሬታን ዳታ ስርዓትን ተርጉም',
    live_translation_active: 'ቀጥታዊ ትርጉም ይስራሕ ኣሎ',
    search_language: 'ቋንቋ ድለ...',
    theme_studio: 'ምስሊ መመላከዒ',
    dark_mode: 'ጸሊም ገጽ',
    bright_mode: 'ብርሁ ገጽ',
    notifications: 'መፍለጢታት',
    fullscreen: 'ምሉእ ስክሪን',
    toggle_sidebar: 'ሳይድባር ሓቢእ/ኣርኢ',
    system_developer: 'መማዕበሊ ስርዓት',
    profile_settings: 'ናይ ፕሮፋይል ቅጥዒ',
    logout: 'ውጻእ',

    // Dashboard Quick Language Banner
    quick_language_title: 'ናይ ስርዓት ቋንቋን ትርጉም ዳታን',
    quick_language_desc: 'ናይ ዳሽቦርድ ቑጽርታት፣ ደረሰኛታት፣ ሜኑታትን መዛግብቲ ንግድን ብቀጥታ ተርጒምካ ርአ።',
    active_lang_badge: 'ዝተመረጸ ቋንቋ',
    auto_translate_tables: 'ሰደቃታትን ዳታን ብኣውቶማቲክ ተርጉም',
    reset_to_english: 'ናብ እንግሊዝኛ ምለስ',
    more_languages: 'ተወሳኺ ቋንቋታት',

    // Dashboard KPIs
    cash_sales: 'ናይ ጥረ ገንዘብ መሸጣ',
    credit_sales: 'ናይ ልቓሕ መሸጣ',
    total_sales: 'ጠቕላላ መሸጣ (ጥረ + ልቓሕ)',
    total_stock_value: 'ጠቕላላ ዋጋ ንብረት',
    available_materials: 'ዘለዉ ኣቑሑት',
    monthly_purchases: 'ወርሓዊ ዕዳጋታት / ወጻኢታት',
    reorder_alerts: 'ናይ ዳግመ-ትእዛዝ ምልክታ',
    view_transactions: 'ግብይታት ርአ',
    view_all_sales: 'ኩሉ መሸጣ ርአ',
    completed_transactions: 'ዝተዛዘሙ ግብይታት',
    credit_records: 'ናይ ልቓሕ መዛግብቲ',
    total_sales_vouchers: 'ጠቕላላ ደረሰኛታት መሸጣ',
    spend: 'ወጻኢ',
    in_categories: 'ኣብ {n} ምድባት',
    monthly_inflow: 'ወርሓዊ ናይ ዕዳጋ ወጻኢ',
    out_of_stock: 'ዝወድአ ንብረት',

    // Charts & Sections
    stock_by_category: 'ንብረት ብምድብ',
    category_desc: 'ውሕስነትን ምንቅስቓስን ኣቑሑት',
    movement_trend: 'ዝወጸን ዝኣተወን ኣቑሑት',
    inbound_grv: 'ዝኣተዉ ኣቑሑት (GRV)',
    outbound_sales: 'ዝወጹ ኣቑሑት (መሸጣ/ምእላይ)',
    top_fast_moving: 'ብቅልጡፍ ዝንቀሳቐሱ ኣቑሑት',
    recent_activity: 'ናይ ቀረባ ግዜ ምንቅስቓሳት',
    all_rights_reserved: 'ኩሉ መሰል ብሕጊ ዝተሓለወ እዩ።',

    // Navigation & Subsystem
    stock_management_system: 'ስርዓት ምሕደራ ንብረት',
    sales_marketing_ms: 'ምሕደራ መሸጣን ዕዳጋን',
    sub_systems: 'ንኡሳን ስርዓታት',
    cash_sales_voucher: 'ናይ ጥረ ገንዘብ መሸጣ ደረሰኝ',
    credit_sales_voucher: 'ናይ ልቓሕ መሸጣ ደረሰኝ',
    zeroing_voucher: 'ናይ ዜሮ ምግባር ደረሰኝ',
    security_report: 'ናይ ድሕንነትን ኦዲትን ጸብጻብ',
    sales_closing: 'መሸጣ ምዕጻው',
    sales_route_mapping: 'ካርታ መስመር መሸጣ',
    sales_voucher_report: 'ጸብጻብ ደረሰኛታት መሸጣ',
    stock_voucher_report: 'ጸብጻብ ደረሰኛታት ንብረት',
    all_ids: 'ኩሎም መለለዪታት',
    analytics_pl: 'ትንታነን መኽሰብ/ኪሳራን',
    items_materials: 'ኣቑሑት',
    purchases: 'ዕዳጋታትን ምጽዳቕን',
    suppliers: 'ኣቕረብቲ',
    reports_analytics: 'ጸብጻባትን ትንታነታትን',
    settings: 'ቅጥዕታት',

    // Actions & Common
    search: 'ድለ',
    filter: 'ኣጻሪ',
    refresh: 'ሓድሽ',
    export_excel: 'ናብ Excel ኣውጽእ',
    export_pdf: 'ናብ PDF ኣውጽእ',
    print: 'ሕተም',
    view: 'ርአ',
    edit: 'ኣዐሪ',
    delete: 'ኣወግድ',
    save: 'ኣቀምጥ',
    cancel: 'ሰርዝ',
    approve: 'ኣጽድቕ',
    reject: 'ነጺግካ ኣውጽእ',
    status: 'ኩነታት',
    date: 'ዕለት',
    voucher_code: 'ኮድ ደረሰኝ',
    customer: 'ዓሚል',
    total_amount: 'ጠቕላላ ዋጋ',
    actions: 'ተግባራት',
  },

  ar: {
    app_title: 'شارب بلس لإدارة التجارة والمخزون',
    dashboard: 'لوحة التحكم',
    language: 'اللغة',
    select_language: 'اختر اللغة',
    translate_system: 'ترجمة النظام',
    translate_data_info: 'ترجمة البيانات والمعلومات في النظام',
    live_translation_active: 'الترجمة المباشرة مفعلة',
    search_language: 'البحث عن لغة...',
    theme_studio: 'مظهر النظام',
    dark_mode: 'الوضع الداكن',
    bright_mode: 'الوضع الفاتح',
    notifications: 'الإشعارات',
    fullscreen: 'ملء الشاشة',
    toggle_sidebar: 'تبديل القائمة الجانبية',
    system_developer: 'مطور النظام',
    profile_settings: 'إعدادات الحساب',
    logout: 'تسجيل الخروج',
    quick_language_title: 'لغة النظام وترجمة البيانات',
    quick_language_desc: 'ترجمة مؤشرات لوحة التحكم، الإيصالات، القوائم وسجلات المعاملات في النظام فورياً.',
    active_lang_badge: 'اللغة الحالية',
    auto_translate_tables: 'ترجمة الجداول والبيانات تلقائياً',
    reset_to_english: 'إعادة التعيين للإنجليزية',
    more_languages: 'لغات إضافية',
    cash_sales: 'المبيعات النقدية',
    credit_sales: 'المبيعات الآجلة',
    total_sales: 'إجمالي المبيعات (نقدي + آجل)',
    total_stock_value: 'إجمالي قيمة المخزون',
    available_materials: 'المواد المتاحة',
    monthly_purchases: 'متوسط المشتريات / الشهر',
    reorder_alerts: 'تنبيهات إعادة الطلب',
    view_transactions: 'عرض المعاملات',
    view_all_sales: 'عرض جميع المبيعات',
    completed_transactions: 'معاملة مكتملة',
    credit_records: 'سجل آجل',
    total_sales_vouchers: 'إجمالي إيصالات المبيعات',
    spend: 'المصروف',
    in_categories: 'في {n} تصنيفات',
    monthly_inflow: 'إنفاق الوارد الشهري',
    out_of_stock: 'نفد من المخزون',
    stock_by_category: 'المخزون حسب التصنيف',
    category_desc: 'أمان وتوزيع حركة المخزون',
    movement_trend: 'حركة الصادر والوارد',
    inbound_grv: 'الوارد (إيصال استلام)',
    outbound_sales: 'الصادر (مبيعات/إتلاف)',
    top_fast_moving: 'المواد الأكثر حركة',
    recent_activity: 'الأنشطة الأخيرة للمخزون والمبيعات',
    all_rights_reserved: 'جميع الحقوق محفوظة.',
    stock_management_system: 'نظام إدارة المخزون',
    sales_marketing_ms: 'نظام المبيعات والتسويق',
    sub_systems: 'الأنظمة الفرعية',
    cash_sales_voucher: 'إيصال المبيعات النقدية',
    credit_sales_voucher: 'إيصال المبيعات الآجلة',
    zeroing_voucher: 'إيصال التصفير (Zeroing)',
    security_report: 'تقرير الأمان والتدقيق',
    sales_closing: 'إغلاق المبيعات',
    sales_route_mapping: 'مسارات المبيعات',
    sales_voucher_report: 'تقرير إيصالات المبيعات',
    stock_voucher_report: 'تقرير إيصالات المخزون',
    all_ids: 'جميع المعرفات',
    analytics_pl: 'التحليلات والأرباح/الخسائر',
    items_materials: 'الأصناف والمواد',
    purchases: 'المشتريات والموافقات',
    suppliers: 'الموردون',
    reports_analytics: 'التقارير والتحليلات',
    settings: 'الإعدادات',
    search: 'بحث',
    filter: 'تصفية',
    refresh: 'تحديث',
    export_excel: 'تصدير إلى Excel',
    export_pdf: 'تصدير إلى PDF',
    print: 'طباعة',
    view: 'عرض',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    approve: 'موافقة',
    reject: 'رفض',
    status: 'الحالة',
    date: 'التاريخ',
    voucher_code: 'رمز الإيصال',
    customer: 'العميل',
    total_amount: 'المبلغ الإجمالي',
    actions: 'الإجراءات',
  },

  fr: {
    app_title: 'Sharp Plus Commerce & Inventaire',
    dashboard: 'Tableau de bord',
    language: 'Langue',
    select_language: 'Choisir la langue',
    translate_system: 'Traduire le système',
    translate_data_info: 'Traduire les données et informations',
    live_translation_active: 'Traduction en direct active',
    search_language: 'Rechercher une langue...',
    theme_studio: 'Studio de Thèmes',
    dark_mode: 'Mode Sombre',
    bright_mode: 'Mode Clair',
    notifications: 'Notifications',
    fullscreen: 'Plein écran',
    toggle_sidebar: 'Basculer la barre latérale',
    system_developer: 'Développeur Système',
    profile_settings: 'Paramètres du compte',
    logout: 'Déconnexion',
    quick_language_title: 'Langue du système & Traduction',
    quick_language_desc: 'Traduisez instantanément les métriques, reçus, menus et données de transactions.',
    active_lang_badge: 'Langue active',
    auto_translate_tables: 'Traduction automatique des tables',
    reset_to_english: 'Réinitialiser en anglais',
    more_languages: 'Autres langues',
    cash_sales: 'Ventes au comptant',
    credit_sales: 'Ventes à crédit',
    total_sales: 'Total des Ventes (Comptant + Crédit)',
    total_stock_value: 'Valeur totale du stock',
    available_materials: 'Articles disponibles',
    monthly_purchases: 'Achats mensuels',
    reorder_alerts: 'Alertes de réapprovisionnement',
    view_transactions: 'Voir les transactions',
    view_all_sales: 'Voir toutes les ventes',
    completed_transactions: 'transactions effectuées',
    credit_records: 'enregistrements à crédit',
    total_sales_vouchers: 'bons de vente au total',
    spend: 'Dépense',
    in_categories: 'Dans {n} catégories',
    monthly_inflow: 'Entrée mensuelle',
    out_of_stock: 'en rupture de stock',
    stock_by_category: 'Stock par catégorie',
    category_desc: 'Sécurité et répartition des mouvements',
    movement_trend: 'Tendance des entrées et sorties',
    inbound_grv: 'Entrées (Bon de Réception)',
    outbound_sales: 'Sorties (Ventes/Pertes)',
    top_fast_moving: 'Articles à rotation rapide',
    recent_activity: 'Activités récentes',
    all_rights_reserved: 'Tous droits réservés.',
    stock_management_system: 'Système de Gestion des Stocks',
    sales_marketing_ms: 'Gestion des Ventes & Marketing',
    sub_systems: 'Sous-systèmes',
    cash_sales_voucher: 'Bon de Vente au Comptant',
    credit_sales_voucher: 'Bon de Vente à Crédit',
    zeroing_voucher: 'Bon de Remise à Zéro',
    security_report: 'Rapport de Sécurité et Audit',
    sales_closing: 'Clôture des Ventes',
    sales_route_mapping: 'Cartographie des Ventes',
    sales_voucher_report: 'Rapport des Bons de Vente',
    stock_voucher_report: 'Rapport des Bons de Stock',
    all_ids: 'Tous les ID',
    analytics_pl: 'Analyses & Pertes/Profits',
    items_materials: 'Articles & Matériaux',
    purchases: 'Achats & Approbations',
    suppliers: 'Fournisseurs',
    reports_analytics: 'Rapports & Statistiques',
    settings: 'Paramètres',
    search: 'Rechercher',
    filter: 'Filtrer',
    refresh: 'Actualiser',
    export_excel: 'Exporter Excel',
    export_pdf: 'Exporter PDF',
    print: 'Imprimer',
    view: 'Voir',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    approve: 'Approuver',
    reject: 'Rejeter',
    status: 'Statut',
    date: 'Date',
    voucher_code: 'Code de Bon',
    customer: 'Client',
    total_amount: 'Montant Total',
    actions: 'Actions',
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  // Load initial language from localStorage or default to 'en'
  const [langCode, setLangCode] = useState(() => {
    try {
      const saved = localStorage.getItem('sharp_plus_language');
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch {}
    return 'en';
  });

  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(() => {
    try {
      return localStorage.getItem('sharp_plus_auto_translate') !== 'false';
    } catch {
      return true;
    }
  });

  const [isTranslating, setIsTranslating] = useState(false);

  // Active language object
  const currentLanguage = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  }, [langCode]);

  // Set document direction for RTL (Arabic) or LTR
  useEffect(() => {
    document.documentElement.setAttribute('dir', currentLanguage.dir || 'ltr');
    document.documentElement.setAttribute('lang', currentLanguage.code);
  }, [currentLanguage]);

  // ─────────────────────────────────────────────────────────────
  // GOOGLE TRANSLATE ENGINE LOADER
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Only inject script once
    if (window.googleTranslateElementInit) return;

    window.googleTranslateElementInit = () => {
      try {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,am,om,ti,so,ar,fr,zh-CN,es,de,it,ru,hi,tr',
              autoDisplay: false,
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            'google_translate_element'
          );
        }
      } catch (err) {
        console.warn('Google Translate initialization:', err);
      }
    };

    // Create container if not exists
    if (!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.display = 'none';
      document.body.appendChild(div);
    }

    // Add hidden CSS rules to prevent Google banner distortion
    if (!document.getElementById('sharp_translate_styles')) {
      const style = document.createElement('style');
      style.id = 'sharp_translate_styles';
      style.innerHTML = `
        .goog-te-banner-frame { display: none !important; }
        body { top: 0px !important; }
        .goog-te-combo { display: none !important; }
        #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        font { background: transparent !important; }
      `;
      document.head.appendChild(style);
    }

    // Load external script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // TRIGGER TRANSLATION ENGINE
  // ─────────────────────────────────────────────────────────────
  const triggerGoogleTranslate = useCallback((targetGoogleCode) => {
    setIsTranslating(true);
    try {
      const select = document.querySelector('#google_translate_element select.goog-te-combo');
      if (select) {
        select.value = targetGoogleCode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Fallback: set cookie so reload/engine captures it
        const domain = window.location.hostname;
        document.cookie = `googtrans=/en/${targetGoogleCode}; path=/; domain=${domain}`;
        document.cookie = `googtrans=/en/${targetGoogleCode}; path=/;`;
      }
    } catch (e) {
      console.warn('Failed to dispatch google translate change:', e);
    } finally {
      setTimeout(() => setIsTranslating(false), 600);
    }
  }, []);

  // Switch Language
  const setLanguage = useCallback((code) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!lang) return;

    setLangCode(code);
    try {
      localStorage.setItem('sharp_plus_language', code);
    } catch {}

    // If auto translate tables/data is enabled, trigger Google Translate
    if (autoTranslateEnabled) {
      if (code === 'en') {
        // Reset to original
        try {
          const select = document.querySelector('#google_translate_element select.goog-te-combo');
          if (select) {
            select.value = '';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        } catch {}
      } else {
        triggerGoogleTranslate(lang.googleCode || code);
      }
    }
  }, [autoTranslateEnabled, triggerGoogleTranslate]);

  const toggleAutoTranslate = useCallback(() => {
    setAutoTranslateEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sharp_plus_auto_translate', String(next));
      } catch {}
      if (next && currentLanguage.code !== 'en') {
        triggerGoogleTranslate(currentLanguage.googleCode || currentLanguage.code);
      }
      return next;
    });
  }, [currentLanguage, triggerGoogleTranslate]);

  // Translation helper function t(key, fallback)
  const t = useCallback((key, fallback) => {
    if (!key) return fallback !== undefined ? fallback : '';
    const langDict = TRANSLATIONS[langCode] || TRANSLATIONS.en;

    // 1. Direct exact match
    if (langDict && langDict[key]) {
      return langDict[key];
    }

    // 2. Normalized key (e.g. "Cash Sales" -> "cash_sales", "Stock Management System" -> "stock_management_system")
    const normalizedKey = String(key)
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (langDict && langDict[normalizedKey]) {
      return langDict[normalizedKey];
    }

    // 3. Fallback to English dictionary
    if (TRANSLATIONS.en && TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    if (TRANSLATIONS.en && TRANSLATIONS.en[normalizedKey]) {
      return TRANSLATIONS.en[normalizedKey];
    }

    return fallback !== undefined ? fallback : key;
  }, [langCode]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        langCode,
        setLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
        autoTranslateEnabled,
        toggleAutoTranslate,
        isTranslating,
        triggerGoogleTranslate,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
