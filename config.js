// ================== НАСТРОЙКИ САЙТА ==================
// Здесь меняются цены, ник в Telegram и адрес сервера для заявок.

window.SITE_CONFIG = {
  // Ваш ник в Telegram (без @)
  telegramUsername: "Salfetka16",

  // Адрес сервера заявок (Google Apps Script, заканчивается на /exec).
  // Пока строка пустая, сайт откроет Telegram с готовым текстом заявки
  // (фото тогда нужно будет прикрепить в чате вручную).
  workerUrl: "https://script.google.com/macros/s/AKfycbwCwWhxYB5omqPAb0Ct_RpY-0IjAngwGM_DeUtwwmjjRzLmUySsqRUsbh3bsHYLxEs70g/exec",

  presentation: { pricePerUnit: 45, min: 5, max: 20 },
  project:      { pricePerUnit: 30, min: 5, max: 1000, sliderMax: 100 },

  maxFiles: 10,
  maxFileSizeMb: 10,
  maxTotalMb: 25,
};
