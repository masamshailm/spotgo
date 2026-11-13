// Arabic versions of the sample data.
// Used by setup-db.js (new database) and by server.js (to fill an existing database).

const workspacesAr = {
  'The Desk Hub': {
    name: 'ذا ديسك هب',
    description: 'مساحة عمل مشتركة مشرقة مع إنترنت سريع وقهوة مجانية.'
  },
  'WorkSpace Cairo': {
    name: 'ورك سبيس كايرو',
    description: 'مساحة عمل في وسط المدينة قريبة من المترو، مثالية للاجتماعات.'
  },
  'Hive Workspace': {
    name: 'هايف ورك سبيس',
    description: 'مكان هادئ فيه غرف خاصة ومكاتب عمل مشتركة.'
  },
  'Nile Corner': {
    name: 'ركن النيل',
    description: 'مكان ودود للطلبة والفريلانسرز بالقرب من النيل.'
  },
  'Focus Lab': {
    name: 'فوكس لاب',
    description: 'مكان هادئ للمذاكرة فيه غرفة ورش للدورات التدريبية.'
  },
  'The Study Nook': {
    name: 'ركن المذاكرة',
    description: 'مكان هادئ بسعر مناسب لساعات المذاكرة الطويلة.'
  },
  'Orbit Coworking': {
    name: 'أوربت كووركينج',
    description: 'مساحة حديثة فيها غرف اجتماعات وغرف ورش عمل.'
  },
  'Quiet Hours Hub': {
    name: 'كوايت أورز هب',
    description: 'مكان للهدوء التام مصمم للتركيز العميق.'
  },
  'Garden City Desks': {
    name: 'مكاتب جاردن سيتي',
    description: 'مكان هادئ في حي أخضر.'
  },
  'Pioneer Hub': {
    name: 'بايونير هب',
    description: 'مساحة كبيرة فيها مكاتب عمل مشتركة وغرفة ورش.'
  },
  'Maadi Study Space': {
    name: 'مساحة مذاكرة المعادي',
    description: 'مكان مناسب للطلبة فيه مكاتب هادئة وغرف خاصة.'
  },
  'Sunrise Desks': {
    name: 'مكاتب صن رايز',
    description: 'مكان جديد في انتظار موافقة الأدمن.'
  }
};

const areasAr = {
  'Zamalek': 'الزمالك',
  'Downtown': 'وسط البلد',
  'Maadi': 'المعادي',
  'Dokki': 'الدقي',
  'Nasr City': 'مدينة نصر',
  'Heliopolis': 'مصر الجديدة',
  'New Cairo': 'القاهرة الجديدة',
  'Mohandessin': 'المهندسين',
  'Garden City': 'جاردن سيتي',
  '6th of October': '6 أكتوبر'
};

const reviewsAr = {
  'Bright place with fast internet. Perfect for studying.': 'مكان مشرق والإنترنت سريع. مثالي للمذاكرة.',
  'Great meeting room, a bit busy at noon.': 'غرفة اجتماعات ممتازة، لكنها مزدحمة قليلاً وقت الظهر.',
  'My favorite spot in Maadi.': 'مكاني المفضل في المعادي.',
  'Friendly staff and good value for the price.': 'العاملون ودودون والسعر مناسب جدًا.'
};

const roomTypesAr = {
  'Co-working Desk': 'مكتب عمل مشترك',
  'Meeting Room': 'غرفة اجتماعات',
  'Private Room': 'غرفة خاصة',
  'Quiet Desk Area': 'منطقة مكاتب هادئة',
  'Shared Space': 'مساحة مشتركة',
  'Workshop Room': 'غرفة ورش عمل'
};

// "10 Sample Street, Zamalek, Cairo" -> "10 شارع تجريبي، الزمالك، القاهرة"
function addressAr(address, area) {
  const number = (address || '').split(' ')[0];
  return number + ' شارع تجريبي، ' + (areasAr[area] || area) + '، القاهرة';
}

module.exports = { workspacesAr, areasAr, reviewsAr, roomTypesAr, addressAr };
