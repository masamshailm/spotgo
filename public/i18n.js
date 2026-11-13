// ---------- Arabic / English ----------
// How it works:
// 1) The pages are written in English.
// 2) When the user chooses Arabic, this file looks at every text on the page,
//    and if it finds it in the dictionary below, it replaces it with the Arabic text.
// 3) It also sets dir="rtl" so the page is laid out from right to left.
// 4) A MutationObserver watches the page, so text that JavaScript adds later
//    (cards, bookings, messages...) is translated too.

// The chosen language is saved in the browser (localStorage)
function getLanguage() {
  try {
    return localStorage.getItem('spotgo-lang') || 'en';
  } catch (e) {
    return 'en';
  }
}

function setLanguage(lang) {
  try {
    localStorage.setItem('spotgo-lang', lang);
  } catch (e) {
    // the browser blocked storage; the language will not be remembered
  }
}

const LANG = getLanguage();

// Dates are written in Arabic or English depending on the language
function dateLocale() {
  return LANG === 'ar' ? 'ar-EG' : 'en-US';
}

// The refund policy of a workspace as one line of text (used on several pages).
// hours = the workspace's "full refund" hours, for example 6.
function refundPolicyText(hours) {
  if (!hours) {
    return 'No refund if you cancel';
  }
  const half = Math.round(hours / 2 * 10) / 10;   // 6 -> 3, 1 -> 0.5
  return 'Full refund up to ' + hours + ' hours before · ' +
    '50% refund up to ' + half + ' hours before · ' +
    'No refund after that';
}

// Data from the database can have an Arabic copy in a column ending with "_ar"
// (name_ar, description_ar, comment_ar...). pick() returns the right one:
// pick(workspace, 'name') -> workspace.name_ar in Arabic (if it exists), else workspace.name
function pick(obj, field) {
  if (LANG === 'ar' && obj[field + '_ar']) {
    return obj[field + '_ar'];
  }
  return obj[field];
}

// English text -> Arabic text
const AR = {
  // Navigation and common words
  'Home': 'الرئيسية',
  'Map': 'الخريطة',
  'Compare': 'المقارنة',
  'Log in': 'تسجيل الدخول',
  'Log out': 'تسجيل الخروج',
  'Dashboard': 'لوحة التحكم',
  'My Bookings': 'حجوزاتي',
  'Loading...': 'جارٍ التحميل...',
  'Search': 'بحث',
  'Save': 'حفظ',
  'Delete': 'حذف',
  'Cancel': 'إلغاء',
  'Confirm': 'تأكيد',
  'Reject': 'رفض',
  'Report': 'إبلاغ',
  'Not available': 'غير متاح',
  'Workspace not found': 'المكان غير موجود',
  'View and book': 'عرض وحجز',
  'Total:': 'الإجمالي:',
  'Manager': 'المدير',
  'Admin': 'الأدمن',
  'Payment': 'الدفع',

  // Areas
  'Zamalek': 'الزمالك',
  'Downtown': 'وسط البلد',
  'Maadi': 'المعادي',
  'Dokki': 'الدقي',
  'Nasr City': 'مدينة نصر',
  'Heliopolis': 'مصر الجديدة',
  'New Cairo': 'القاهرة الجديدة',
  'Mohandessin': 'المهندسين',
  'Garden City': 'جاردن سيتي',
  '6th of October': '6 أكتوبر',

  // Room types
  'Co-working Desk': 'مكتب عمل مشترك',
  'Meeting Room': 'غرفة اجتماعات',
  'Private Room': 'غرفة خاصة',
  'Quiet Desk Area': 'منطقة مكاتب هادئة',
  'Shared Space': 'مساحة مشتركة',
  'Workshop Room': 'غرفة ورش عمل',

  // Statuses and roles
  'pending': 'قيد الانتظار',
  'confirmed': 'مؤكد',
  'rejected': 'مرفوض',
  'cancelled': 'ملغي',
  'completed': 'مكتمل',
  'not confirmed': 'لم يتأكد',
  'visible': 'ظاهر',
  'hidden': 'مخفي',
  'active': 'نشط',
  'blocked': 'محظور',
  'reported': 'تم الإبلاغ',
  'waiting for admin approval': 'في انتظار موافقة الأدمن',
  'user': 'مستخدم',
  'manager': 'مدير',
  'admin': 'أدمن',

  // Home page
  'Find Your Perfect Workspace': 'اعثر على مكان العمل المناسب لك',
  'Study, work, create. Discover the best workspaces in Cairo.': 'ذاكر، اشتغل، أبدع. اكتشف أفضل أماكن العمل في القاهرة.',
  'Search by area, name, or room type (English or عربي)': 'ابحث بالمنطقة أو الاسم أو نوع الغرفة (عربي أو English)',
  'All room types': 'كل أنواع الغرف',
  'Any price': 'أي سعر',
  'Near me': 'الأقرب لي',
  'Popular Workspaces': 'أماكن العمل',
  'No workspaces found.': 'لا توجد أماكن مطابقة.',
  'No ratings yet': 'لا توجد تقييمات بعد',
  'No rooms yet': 'لا توجد غرف بعد',
  'No rooms yet.': 'لا توجد غرف بعد.',
  'Finding your location...': 'جارٍ تحديد موقعك...',
  'Sorted by distance from your location.': 'تم الترتيب حسب المسافة من موقعك.',
  'We could not get your location. Please allow location access and try again.': 'لم نتمكن من تحديد موقعك. اسمح بالوصول إلى الموقع وحاول مرة أخرى.',
  'Your browser does not support location.': 'المتصفح لا يدعم تحديد الموقع.',

  // Workspace page
  'Back to all workspaces': 'الرجوع لكل الأماكن',
  'Address:': 'العنوان:',
  'Phone:': 'الهاتف:',
  'Cancellation policy:': 'سياسة الإلغاء:',
  'Get Directions': 'الاتجاهات',
  'Compare with others': 'قارن بأماكن أخرى',
  'Rooms': 'الغرف',
  'Choose a room to see its time slots': 'اختر غرفة لعرض أوقاتها',
  'Choose a date': 'اختر التاريخ',
  'Available Time Slots': 'الأوقات المتاحة',
  'No available days.': 'لا توجد أيام متاحة.',
  'No time selected.': 'لم يتم اختيار وقت.',
  'Book now': 'احجز الآن',
  'Busy': 'محجوز',
  'Passed': 'انتهى',
  'Reviews': 'التقييمات',
  'No reviews yet.': 'لا توجد تقييمات بعد.',
  'Write a review': 'اكتب تقييمًا',
  'Rating': 'التقييم',
  'Comment': 'التعليق',
  '5 - Excellent': '5 - ممتاز',
  '4 - Good': '4 - جيد',
  '3 - Okay': '3 - مقبول',
  '2 - Poor': '2 - ضعيف',
  '1 - Bad': '1 - سيئ',
  'Submit review': 'إرسال التقييم',
  'Sending...': 'جارٍ الإرسال...',
  'Please choose at least one time slot first.': 'من فضلك اختر وقتًا واحدًا على الأقل.',
  'Why are you reporting this review?': 'لماذا تبلغ عن هذا التقييم؟',
  'Thank you. The admin will review your report.': 'شكرًا لك. سيراجع الأدمن البلاغ.',

  // Login and sign up
  'Email': 'البريد الإلكتروني',
  'Password': 'كلمة المرور',
  'Your password': 'كلمة المرور',
  'New to SpotGo?': 'جديد على SpotGo؟',
  'Create an account': 'أنشئ حسابًا',
  'Create account': 'إنشاء حساب',
  'Full name': 'الاسم بالكامل',
  'Your name': 'اسمك',
  'Phone (optional)': 'الهاتف (اختياري)',
  'Password (at least 8 characters)': 'كلمة المرور (8 أحرف على الأقل)',
  'Choose a password': 'اختر كلمة مرور',
  'Sign up': 'إنشاء الحساب',
  'Already have an account?': 'لديك حساب بالفعل؟',

  // Payment page
  'Complete your booking': 'أكمل حجزك',
  'Transfer the total amount directly to the workspace, then upload a photo of the transfer so the manager can confirm your booking.':
    'حوّل المبلغ الإجمالي مباشرة للمكان، ثم ارفع صورة التحويل ليؤكد المدير حجزك.',
  'Payment proof (JPG or PNG)': 'إثبات الدفع (JPG أو PNG)',
  'Upload proof': 'رفع الإثبات',
  'A payment proof was already uploaded. You can upload a new one to replace it.': 'تم رفع إثبات دفع من قبل. يمكنك رفع صورة جديدة بدلاً منه.',
  'Please choose an image first.': 'من فضلك اختر صورة أولاً.',
  'Proof uploaded. Your booking is waiting for the manager to confirm it.': 'تم رفع الإثبات. حجزك في انتظار تأكيد المدير.',

  // My bookings
  'User': 'مستخدم',
  'Track your bookings and their status.': 'تابع حجوزاتك وحالتها.',
  'Upcoming': 'القادمة',
  'Past': 'السابقة',
  'Cancelled': 'الملغاة',
  'Upload payment proof': 'ارفع إثبات الدفع',
  'Waiting for the manager to confirm': 'في انتظار تأكيد المدير',
  'Reviewed': 'تم التقييم',
  'Nothing here yet.': 'لا يوجد شيء هنا بعد.',
  'Cancel this booking?': 'هل تريد إلغاء هذا الحجز؟',

  // Manager pages
  'Owner Panel': 'لوحة صاحب المكان',
  'My Workspaces': 'أماكني',
  'Availability': 'المواعيد المتاحة',
  'Earnings': 'الأرباح',
  'Hi!': 'أهلاً!',
  'Here is what is happening with your workspaces.': 'هذا ملخص ما يحدث في أماكنك.',
  'Pending requests': 'طلبات قيد الانتظار',
  'Total bookings': 'إجمالي الحجوزات',
  'Income (EGP)': 'الدخل (جنيه)',
  'Rejected / cancelled': 'مرفوضة / ملغاة',
  'Rejected / Cancelled': 'مرفوضة / ملغاة',
  'Bookings': 'الحجوزات',
  'Pending': 'قيد الانتظار',
  'Confirmed': 'المؤكدة',
  'All': 'الكل',
  'No proof yet': 'لا يوجد إثبات بعد',
  'View payment proof': 'عرض إثبات الدفع',
  'No bookings in this tab.': 'لا توجد حجوزات هنا.',
  'Edit your workspace details and manage the rooms and their prices.': 'عدّل بيانات أماكنك وتحكم في الغرف وأسعارها.',
  'Add a new workspace': 'إضافة مكان جديد',
  'A new workspace stays hidden until the admin approves it.': 'المكان الجديد يظل مخفيًا حتى يوافق عليه الأدمن.',
  'Workspace name': 'اسم المكان',
  'Area': 'المنطقة',
  'Address': 'العنوان',
  'Phone': 'الهاتف',
  'Latitude': 'خط العرض',
  'Longitude': 'خط الطول',
  'Free cancellation (hours before)': 'الإلغاء المجاني (عدد الساعات قبل الموعد)',
  'Description': 'الوصف',
  'Add workspace': 'إضافة المكان',
  'You have no workspaces yet. Add one above.': 'ليس لديك أماكن بعد. أضف مكانًا من الأعلى.',
  'Edit workspace details': 'تعديل بيانات المكان',
  'Save details': 'حفظ البيانات',
  'Type': 'النوع',
  'Capacity': 'السعة',
  'EGP / hour': 'جنيه / الساعة',
  'Add room': 'إضافة غرفة',
  'Workspace added. It will appear to customers after the admin approves it.': 'تمت إضافة المكان. سيظهر للعملاء بعد موافقة الأدمن.',
  'Workspace details saved.': 'تم حفظ بيانات المكان.',
  'Room saved.': 'تم حفظ الغرفة.',
  'Room added with time slots for the next 14 days.': 'تمت إضافة الغرفة مع مواعيد الأيام الـ 14 القادمة.',
  'Room deleted.': 'تم حذف الغرفة.',
  'Delete this room and its time slots?': 'هل تريد حذف هذه الغرفة ومواعيدها؟',
  'Close a time slot when the room is not available (for example, maintenance), or open it again.':
    'أغلق موعدًا عندما تكون الغرفة غير متاحة (مثل الصيانة)، أو افتحه مرة أخرى.',
  'Room': 'الغرفة',
  'Date': 'التاريخ',
  'Open 7 more days': 'فتح 7 أيام إضافية',
  'Available': 'متاح',
  'Closed by you': 'مغلق بواسطتك',
  'Booked': 'محجوز',
  'Click a free slot to close it. Click a closed slot to open it again.': 'اضغط على موعد متاح لإغلاقه، واضغط على موعد مغلق لفتحه مرة أخرى.',
  'Add a room first from My Workspaces.': 'أضف غرفة أولاً من صفحة أماكني.',
  'This day is not open yet. Use "Open 7 more days".': 'هذا اليوم غير مفتوح بعد. استخدم "فتح 7 أيام إضافية".',
  '7 more days are now open for booking.': 'تم فتح 7 أيام إضافية للحجز.',
  'Customers pay you directly. These numbers come from the bookings you confirmed.': 'العملاء يدفعون لك مباشرة. هذه الأرقام محسوبة من الحجوزات التي أكدتها.',
  'Income from confirmed bookings (EGP)': 'الدخل من الحجوزات المؤكدة (جنيه)',
  'Waiting for your confirmation (EGP)': 'في انتظار تأكيدك (جنيه)',
  'Confirmed bookings': 'الحجوزات المؤكدة',
  'By workspace': 'حسب المكان',
  'By month': 'حسب الشهر',
  'Workspace': 'المكان',
  'Pending (EGP)': 'قيد الانتظار (جنيه)',
  'Month': 'الشهر',
  'No confirmed bookings yet.': 'لا توجد حجوزات مؤكدة بعد.',
  'What customers say about your workspaces. Report a review to the admin if it breaks the rules.':
    'آراء العملاء في أماكنك. أبلغ الأدمن عن أي تقييم مخالف للقواعد.',
  'Average rating': 'متوسط التقييم',
  'Report sent to the admin.': 'تم إرسال البلاغ للأدمن.',

  // Admin page
  'Admin Panel': 'لوحة الأدمن',
  'Users': 'المستخدمون',
  'Workspaces': 'الأماكن',
  'Reports': 'البلاغات',
  'Admin dashboard': 'لوحة تحكم الأدمن',
  'Manage users and workspaces.': 'إدارة المستخدمين والأماكن.',
  'Open reports': 'البلاغات المفتوحة',
  'Block': 'حظر',
  'Unblock': 'إلغاء الحظر',
  'Approve': 'موافقة',
  'Hide': 'إخفاء',
  'No open reports.': 'لا توجد بلاغات مفتوحة.',
  'Delete review': 'حذف التقييم',
  'Keep review': 'إبقاء التقييم',
  'Delete this workspace permanently?': 'هل تريد حذف هذا المكان نهائيًا؟',
  'Delete this review permanently?': 'هل تريد حذف هذا التقييم نهائيًا؟',
  'Your session has ended. Please log in again.': 'انتهت جلستك. سجّل الدخول مرة أخرى.',

  // Map and compare pages
  'Workspaces on the map': 'الأماكن على الخريطة',
  'Click a pin to see the workspace, or find the nearest one to you.': 'اضغط على أي علامة لعرض المكان، أو اعثر على أقرب مكان لك.',
  'Find the nearest workspace': 'اعثر على أقرب مكان',
  'You are here': 'أنت هنا',
  'Compare workspaces': 'قارن بين الأماكن',
  'Choose up to 3 workspaces to compare them side by side. The best value in each row is highlighted.':
    'اختر حتى 3 أماكن للمقارنة بينها. أفضل قيمة في كل صف تظهر بلون مميز.',
  'Choose a workspace': 'اختر مكانًا',
  'Choose at least one workspace above.': 'اختر مكانًا واحدًا على الأقل من الأعلى.',
  'Price from': 'السعر يبدأ من',
  'Free cancellation': 'الإلغاء المجاني',

  // Favorites, events, add-ons, visitors
  'Events': 'الفعاليات',
  'Favorites': 'المفضلة',
  'Free': 'مجاني',
  'Save to favorites': 'حفظ في المفضلة',
  'Remove from favorites': 'إزالة من المفضلة',
  'The workspaces you saved. Click the heart on any workspace to save it.': 'الأماكن التي حفظتها. اضغط على القلب في أي مكان لحفظه.',
  'You have no favorites yet.': 'ليس لديك أماكن مفضلة بعد.',
  'Removed from favorites.': 'تمت الإزالة من المفضلة.',
  'Add-ons': 'الإضافات',
  '(optional, added once to the booking)': '(اختياري، يضاف مرة واحدة للحجز)',
  'Upcoming events here': 'فعاليات قادمة في هذا المكان',
  'See all events and register': 'شوف كل الفعاليات وسجّل',
  'Previous month': 'الشهر السابق',
  'Next month': 'الشهر التالي',
  'Workshops and study sessions held in our workspaces. Register for free or pay at the workspace.':
    'ورش عمل وجلسات مذاكرة في أماكننا. سجّل مجانًا أو ادفع في المكان.',
  'All upcoming events': 'كل الفعاليات القادمة',
  'My events': 'فعالياتي',
  'Register': 'تسجيل',
  'Cancel registration': 'إلغاء التسجيل',
  'registered': 'مسجّل',
  'full': 'مكتمل العدد',
  'ended': 'انتهت',
  'You did not register for any event yet.': 'لم تسجل في أي فعالية بعد.',
  'No upcoming events.': 'لا توجد فعاليات قادمة.',
  'You are registered. See you there!': 'تم تسجيلك. نراك هناك!',
  'Your registration was cancelled.': 'تم إلغاء تسجيلك.',
  'Cancel your registration?': 'هل تريد إلغاء تسجيلك؟',
  'Manager Events': 'فعاليات المدير',
  'Create workshops or study sessions in your workspaces and see who registered.': 'أنشئ ورش عمل أو جلسات مذاكرة في أماكنك وشوف مين سجّل.',
  'Create an event': 'إنشاء فعالية',
  'Title': 'العنوان',
  'Title in Arabic (optional)': 'العنوان بالعربي (اختياري)',
  'Start hour (8 to 22)': 'ساعة البداية (من 8 إلى 22)',
  'Duration (hours)': 'المدة (ساعات)',
  'Price (EGP, 0 = free)': 'السعر (جنيه، 0 = مجاني)',
  'Create event': 'إنشاء الفعالية',
  'No events yet.': 'لا توجد فعاليات بعد.',
  'No one registered yet.': 'لم يسجل أحد بعد.',
  'Event created. Customers can now register on the Events page.': 'تم إنشاء الفعالية. يمكن للعملاء التسجيل من صفحة الفعاليات.',
  'Delete this event and its registrations?': 'هل تريد حذف هذه الفعالية وتسجيلاتها؟',
  'Event deleted.': 'تم حذف الفعالية.',
  'Name in Arabic (optional)': 'الاسم بالعربي (اختياري)',
  'Address in Arabic (optional)': 'العنوان بالعربي (اختياري)',
  'Description in Arabic (optional)': 'الوصف بالعربي (اختياري)',
  'Extras the customer can add to a booking (for example coffee or a projector).': 'إضافات يقدر العميل يضيفها للحجز (مثل القهوة أو البروجكتور).',
  'No add-ons yet.': 'لا توجد إضافات بعد.',
  'Name': 'الاسم',
  'Name in Arabic': 'الاسم بالعربي',
  'Price (EGP)': 'السعر (جنيه)',
  'Add add-on': 'إضافة',
  'Add-on added.': 'تمت إضافة الإضافة.',
  'Add-on deleted.': 'تم حذف الإضافة.',
  'Delete this add-on?': 'هل تريد حذف هذه الإضافة؟',
  'Workspace page visitors': 'زوار صفحات الأماكن',
  'Refund policy:': 'سياسة الاسترداد:',
  'Full refund': 'استرداد كامل',
  'Full refund until (hours before)': 'استرداد كامل حتى (عدد الساعات قبل الموعد)',
  'No refund after that': 'بعد ذلك لا يوجد استرداد',
  'No refund if you cancel': 'لا يوجد استرداد عند الإلغاء',
  'No refund': 'لا يوجد استرداد',
  'Refund sent': 'تم إرسال المبلغ',
  'Did you send the refund to the customer?': 'هل أرسلت المبلغ المسترد للعميل؟',
  'You have not paid yet, so cancelling costs nothing.': 'لم تدفع بعد، لذلك الإلغاء بدون أي تكلفة.',
  'Booking cancelled.': 'تم إلغاء الحجز.',
  'This booking cannot be cancelled': 'لا يمكن إلغاء هذا الحجز',
  'This booking has already started, so it cannot be cancelled': 'هذا الحجز بدأ بالفعل، لذلك لا يمكن إلغاؤه',
  'There is no refund waiting for this booking': 'لا يوجد مبلغ مستحق لهذا الحجز',
  'Full refund hours must be a whole number from 0 to 72': 'ساعات الاسترداد الكامل يجب أن تكون رقمًا صحيحًا من 0 إلى 72',
  'Thank you': 'شكرًا',
  'Thank you!': 'شكرًا لك!',
  'We received your payment proof.': 'استلمنا إثبات الدفع بتاعك.',
  'waiting for confirmation': 'في انتظار التأكيد',
  'Booking created': 'تم إنشاء الحجز',
  'Payment proof sent': 'تم إرسال إثبات الدفع',
  'The workspace confirms your booking': 'المكان يأكد حجزك',
  'Enjoy your session': 'استمتع بوقتك',
  'We will send you a notification as soon as the workspace confirms your booking.': 'هيوصلك إشعار أول ما المكان يأكد حجزك.',
  'Go to my bookings': 'روح لحجوزاتي',
  'Back to home': 'الرجوع للرئيسية',
  'Booking number': 'رقم الحجز',
  'Time': 'الوقت',
  'Total': 'الإجمالي',
  'Workspace phone': 'هاتف المكان',
  'Theme': 'المظهر',
  'Mode': 'الوضع',
  'Color': 'اللون',
  'Light': 'فاتح',
  'Dark': 'داكن',
  'Full': 'مكتمل',
  'Selected': 'المختار',
  'Good morning': 'صباح الخير',
  'Good afternoon': 'نهارك سعيد',
  'Good evening': 'مساء الخير',
  'Notifications': 'الإشعارات',
  'Updates about your bookings and workspaces.': 'آخر الأخبار عن حجوزاتك وأماكنك.',
  'You have no notifications yet.': 'لا توجد إشعارات بعد.',
  'This booking is no longer pending': 'هذا الحجز لم يعد قيد الانتظار',

  // Messages from the server
  'Only customers can register for events': 'التسجيل في الفعاليات للعملاء فقط',
  'Event not found': 'الفعالية غير موجودة',
  'This event has already started': 'هذه الفعالية بدأت بالفعل',
  'This event is full': 'هذه الفعالية مكتملة العدد',
  'You are already registered for this event': 'أنت مسجل في هذه الفعالية بالفعل',
  'Please write the event title': 'من فضلك اكتب عنوان الفعالية',
  'Please choose a date from today onwards': 'من فضلك اختر تاريخًا من اليوم أو بعده',
  'Start hour must be from 8 to 22': 'ساعة البداية يجب أن تكون من 8 إلى 22',
  'Duration must be from 1 to 8 hours': 'المدة يجب أن تكون من 1 إلى 8 ساعات',
  'Price must be from 0 to 10000 EGP': 'السعر يجب أن يكون من 0 إلى 10000 جنيه',
  'Capacity must be a whole number from 1 to 500': 'السعة يجب أن تكون رقمًا صحيحًا من 1 إلى 500',
  'Please write the add-on name': 'من فضلك اكتب اسم الإضافة',
  'Add-on price must be from 0 to 10000 EGP': 'سعر الإضافة يجب أن يكون من 0 إلى 10000 جنيه',
  'This add-on is part of old bookings, so it cannot be deleted.': 'هذه الإضافة موجودة في حجوزات سابقة، لذلك لا يمكن حذفها.',
  'Add-on not found': 'الإضافة غير موجودة',
  'One of the add-ons is not available': 'إحدى الإضافات غير متاحة',
  'Wrong email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'This account is blocked': 'هذا الحساب محظور',
  'Please fill in your name, email, and password': 'من فضلك اكتب الاسم والبريد الإلكتروني وكلمة المرور',
  'Please enter a valid email': 'من فضلك اكتب بريدًا إلكترونيًا صحيحًا',
  'Password must be at least 8 characters': 'كلمة المرور يجب ألا تقل عن 8 أحرف',
  'This email is already registered': 'هذا البريد الإلكتروني مسجل بالفعل',
  'Please log in first': 'من فضلك سجّل الدخول أولاً',
  'Booking not found': 'الحجز غير موجود',
  'Please upload a JPG or PNG image': 'من فضلك ارفع صورة JPG أو PNG',
  'File is too large (maximum 5 MB)': 'الملف كبير جدًا (الحد الأقصى 5 ميجا)',
  'One of the time slots is no longer available': 'أحد الأوقات لم يعد متاحًا',
  'One of the time slots has already passed': 'أحد الأوقات انتهى بالفعل',
  'Please choose a rating from 1 to 5': 'من فضلك اختر تقييمًا من 1 إلى 5',
  'You need a confirmed booking without a review to write a new review': 'تحتاج إلى حجز مؤكد لم تقيّمه بعد لكتابة تقييم جديد',
  'Please write the reason for the report': 'من فضلك اكتب سبب البلاغ',
  'You cannot report your own review': 'لا يمكنك الإبلاغ عن تقييمك',
  'You already reported this review': 'لقد أبلغت عن هذا التقييم من قبل',
  'Please fill in the workspace name and area': 'من فضلك اكتب اسم المكان والمنطقة',
  'Cancellation hours must be a whole number from 0 to 48': 'ساعات الإلغاء يجب أن تكون رقمًا صحيحًا من 0 إلى 48',
  'Please enter a valid latitude and longitude': 'من فضلك اكتب خط عرض وخط طول صحيحين',
  'Please choose a valid room type': 'من فضلك اختر نوع غرفة صحيحًا',
  'Capacity must be a whole number from 1 to 200': 'السعة يجب أن تكون رقمًا صحيحًا من 1 إلى 200',
  'Price per hour must be from 1 to 10000 EGP': 'سعر الساعة يجب أن يكون من 1 إلى 10000 جنيه',
  'This room has bookings, so it cannot be deleted.': 'هذه الغرفة عليها حجوزات، لذلك لا يمكن حذفها.',
  'This time slot is booked by a customer': 'هذا الموعد محجوز لعميل',
  'This time slot has already passed': 'هذا الموعد انتهى بالفعل',
  'This workspace has bookings. Hide it instead of deleting it.': 'هذا المكان عليه حجوزات. قم بإخفائه بدلاً من حذفه.',
  'Admin accounts cannot be blocked': 'لا يمكن حظر حسابات الأدمن',
  'Cannot reach the server': 'لا يمكن الوصول إلى السيرفر'
};

// Texts that have changing parts (numbers, names). $1, $2 are the changing parts.
// A function is used when one of the parts also needs translating.
const AR_PATTERNS = [
  [/^Log out \((.+)\)$/, 'تسجيل الخروج ($1)'],
  [/^Hi, (.+)!$/, 'أهلاً، $1!'],
  [/^Rating (.+)$/, 'التقييم $1'],
  [/^From EGP (.+) \/ hour$/, 'من $1 جنيه / الساعة'],
  [/^Up to EGP (.+) \/ hour$/, 'حتى $1 جنيه / الساعة'],
  [/^EGP (.+) \/ hour$/, '$1 جنيه / الساعة'],
  [/^EGP (.+)$/, '$1 جنيه'],
  [/^(.+) km away$/, 'على بعد $1 كم'],
  [/^Capacity: (.+) people$/, 'السعة: $1 أشخاص'],
  [/^Available time slots \((.+)\)$/, function (m, a) { return 'الأوقات المتاحة (' + translateText(a) + ')'; }],
  [/^(.+) \((Busy|Passed)\)$/, function (m, a, b) { return a + ' (' + AR[b] + ')'; }],
  [/^Selected \((.+)\): (.+) \| Total: EGP (.+)$/, 'المختار ($1): $2 | الإجمالي: $3 جنيه'],
  [/^Free cancellation up to (\d+) hours? before the booking\.$/, 'إلغاء مجاني حتى $1 ساعة قبل الحجز.'],
  [/^You can cancel for free up to (\d+) hours? before your booking\.$/, 'يمكنك الإلغاء مجانًا حتى $1 ساعة قبل موعد حجزك.'],
  [/^Cancellation policy: you can cancel for free up to (\d+) hours? before your booking\. After that, the booking cannot be cancelled\.$/,
    'سياسة الإلغاء: يمكنك الإلغاء مجانًا حتى $1 ساعة قبل موعد حجزك. بعد ذلك لا يمكن إلغاء الحجز.'],
  [/^Cancellation is only allowed up to (\d+) hours? before the booking$/, 'الإلغاء مسموح فقط حتى $1 ساعة قبل الحجز'],
  [/^Up to (\d+) hours? before$/, 'حتى $1 ساعة قبل الموعد'],
  [/^Booked on (.+)$/, 'تم الحجز في $1'],
  [/^(\d+) bookings$/, '$1 حجوزات'],
  [/^Open until (.+)$/, 'متاح حتى $1'],
  [/^This room is open for booking until (.+)\.$/, 'هذه الغرفة متاحة للحجز حتى $1.'],
  [/^Manager: (.+)$/, 'المدير: $1'],
  [/^by (.+)$/, 'بواسطة $1'],
  [/^Reported by (.+) \((\w+)\): (.+)$/, function (m, a, b, c) { return 'أبلغ عنه ' + a + ' (' + (AR[b] || b) + '): ' + c; }],
  [/^Workspace phone: (.+)$/, 'هاتف المكان: $1'],
  [/^Status: (.+)$/, function (m, a) { return 'الحالة: ' + (AR[a] || a); }],
  [/^The nearest workspace is (.+) \((.+) km away\)\.$/, 'أقرب مكان هو $1 (على بعد $2 كم).'],
  [/^Server error \((\d+)\)$/, 'خطأ في السيرفر ($1)'],
  [/^(\d+) free$/, '$1 متاح'],
  [/^Full refund up to ([\d.]+) hours before$/, 'استرداد كامل حتى $1 ساعة قبل الموعد'],
  [/^50% refund up to ([\d.]+) hours before$/, 'استرداد 50% حتى $1 ساعة قبل الموعد'],
  [/^You will get a full refund: EGP (.+)\.$/, 'هيرجعلك المبلغ كله: $1 جنيه.'],
  [/^You will get 50% back: EGP (.+) of EGP (.+)\.$/, 'هيرجعلك النص: $1 جنيه من $2 جنيه.'],
  [/^Your booking starts in less than ([\d.]+) hours, so you will not get a refund\.$/, 'حجزك هيبدأ بعد أقل من $1 ساعة، لذلك مفيش فلوس هترجع.'],
  [/^Booking cancelled\. EGP (.+) will be refunded to you\.$/, 'تم إلغاء الحجز. هيرجعلك $1 جنيه.'],
  [/^Refund of EGP (.+) \((\d+)%\) is on its way$/, 'المبلغ المسترد $1 جنيه ($2%) في الطريق إليك'],
  [/^Refund of EGP (.+) was sent$/, 'تم إرسال المبلغ المسترد $1 جنيه'],
  [/^Refund due: EGP (.+) \((\d+)%\)$/, 'مبلغ مستحق للعميل: $1 جنيه ($2%)'],
  [/^([♡♥]) Save$/, '$1 حفظ'],
  [/^([♡♥]) Saved$/, '$1 محفوظ'],
  [/^Viewed by (\d+) visitors$/, 'شاهده $1 زائر'],
  [/^(\d+) visitors$/, '$1 زائر'],
  [/^\((\d+) bookings\)$/, '($1 حجوزات)'],
  [/^(\d+) seats left$/, 'متبقي $1 مقعد'],
  [/^(\d+) \/ (\d+) registered$/, '$1 / $2 مسجّل'],
  [/^Add-ons: (.+)$/, function (m, a) { return 'الإضافات: ' + a.replace(/EGP ([\d.]+)/g, '$1 جنيه'); }],
  [/^(.+): EGP (.+)$/, function (m, a, b) { return translateText(a) + ': ' + b + ' جنيه'; }],
  [/^(.+) \((.+)\)$/, function (m, a, b) { return a + ' (' + translateText(b) + ')'; }]
];

// Returns the Arabic version of a text (or the same text if we don't know it)
function translateText(text) {
  if (LANG !== 'ar') return text;

  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean === '') return text;

  // 1) The whole text is in the dictionary
  if (AR[clean]) return AR[clean];

  // 2) Texts like "Zamalek · Rating 4.8" or "· Maadi": translate each part
  if (clean.includes('·')) {
    const parts = clean.split('·');
    for (let i = 0; i < parts.length; i++) {
      parts[i] = parts[i].trim() === '' ? '' : translateText(parts[i].trim());
    }
    return parts.join(' · ').trim();
  }

  // 3) Texts with changing parts
  for (let i = 0; i < AR_PATTERNS.length; i++) {
    if (AR_PATTERNS[i][0].test(clean)) {
      return clean.replace(AR_PATTERNS[i][0], AR_PATTERNS[i][1]);
    }
  }

  return text;
}

// Translates one text node, keeping the spaces around it
function translateTextNode(node) {
  const text = node.nodeValue;
  const translated = translateText(text);
  if (translated === text) return;

  const before = text.match(/^\s*/)[0];
  const after = text.match(/\s*$/)[0];
  const newValue = before + translated.trim() + after;

  // Only change the text if it is really different. Changing it to the same value
  // would wake the MutationObserver again and again (an endless loop).
  if (newValue !== text) {
    node.nodeValue = newValue;
  }
}

// Translates everything inside an element (texts, placeholders, labels)
function translateElement(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  // Do not touch what the user types, or code
  const skip = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (node.parentNode && skip.includes(node.parentNode.nodeName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  for (let i = 0; i < nodes.length; i++) {
    translateTextNode(nodes[i]);
  }

  const withAttributes = root.querySelectorAll('[placeholder], [aria-label]');
  for (let i = 0; i < withAttributes.length; i++) {
    const el = withAttributes[i];
    if (el.placeholder) el.placeholder = translateText(el.placeholder);
    if (el.getAttribute('aria-label')) el.setAttribute('aria-label', translateText(el.getAttribute('aria-label')));
  }
}

// The button that switches the language
function addLanguageButton() {
  const button = document.createElement('button');
  button.className = 'lang-btn';
  button.type = 'button';
  button.textContent = LANG === 'ar' ? 'English' : 'عربي';

  button.addEventListener('click', function () {
    setLanguage(LANG === 'ar' ? 'en' : 'ar');
    window.location.reload();
  });

  const navLinks = document.querySelector('nav .links');
  const sideBar = document.querySelector('.dash-side');

  if (navLinks) {
    navLinks.appendChild(button);
  } else if (sideBar) {
    const logout = sideBar.querySelector('.logout');
    sideBar.insertBefore(button, logout);
  }
}

addLanguageButton();

if (LANG === 'ar') {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  // Page title, e.g. "My Bookings - SpotGo"
  const titleParts = document.title.split(' - ');
  titleParts[0] = translateText(titleParts[0]);
  document.title = titleParts.join(' - ');

  translateElement(document.body);

  // Translate anything that is added or changed later
  const observer = new MutationObserver(function (mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'characterData') {
        translateTextNode(m.target);
      }
      for (let j = 0; j < m.addedNodes.length; j++) {
        translateElement(m.addedNodes[j]);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // Pop-up messages (alert, confirm, prompt) are translated too
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  const originalPrompt = window.prompt;

  // .call(window, ...) is needed because these browser functions must run "on" window
  window.alert = function (message) {
    return originalAlert.call(window, translateText(String(message)));
  };
  window.confirm = function (message) {
    return originalConfirm.call(window, translateText(String(message)));
  };
  window.prompt = function (message, value) {
    return originalPrompt.call(window, translateText(String(message)), value);
  };
}
