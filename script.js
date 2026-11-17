(function () {
  "use strict";

  const CFG = window.SITE_CONFIG;
  const TG_USER = CFG.telegramUsername;
  const TG_LINK = "https://t.me/" + TG_USER;

  const $ = (sel) => document.querySelector(sel);
  const form = $("#orderForm");
  const fields = $("#orderFields");
  const otherNote = $("#otherNote");
  const volumeInput = $("#volume");
  const range = $("#volumeRange");
  const minusBtn = $("#minusBtn");
  const plusBtn = $("#plusBtn");
  const volumeLabel = $("#volumeLabel");
  const volumeHint = $("#volumeHint");
  const formulaEl = $("#formula");
  const totalEl = $("#total");
  const submitSum = $("#submitSum");
  const submitBtn = $("#submitBtn");
  const fileInput = $("#files");
  const drop = $("#drop");
  const previews = $("#previews");
  const filesError = $("#filesError");

  // ---------- Состояние ----------
  let type = "presentation";
  const volumes = { presentation: 10, project: 10 }; // помним объём для каждого типа отдельно
  let files = [];

  // ---------- Вспомогательное ----------
  // Склонение: 1 слайд, 2 слайда, 5 слайдов
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function unitWord(n, t) {
    return t === "presentation"
      ? plural(n, "слайд", "слайда", "слайдов")
      : plural(n, "лист", "листа", "листов");
  }
  const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function currentVolume() {
    const c = CFG[type];
    const n = parseInt(volumeInput.value, 10);
    return Number.isFinite(n) ? clamp(n, c.min, c.max) : c.min;
  }
  function price() {
    return currentVolume() * CFG[type].pricePerUnit;
  }

  // ---------- Калькулятор ----------
  function render() {
    const c = CFG[type];
    const n = currentVolume();
    const sum = price();

    formulaEl.textContent = `${n} ${unitWord(n, type)} × ${c.pricePerUnit} ₽`;
    totalEl.textContent = rub(sum);
    submitSum.textContent = rub(sum);

    const sliderMax = c.sliderMax || c.max;
    range.min = c.min;
    range.max = sliderMax;
    range.value = Math.min(n, sliderMax);
    range.style.setProperty("--fill", ((range.value - c.min) / (sliderMax - c.min)) * 100 + "%");

    minusBtn.disabled = n <= c.min;
    plusBtn.disabled = n >= c.max;
  }

  function setVolume(n) {
    const c = CFG[type];
    n = clamp(n, c.min, c.max);
    volumes[type] = n;
    volumeInput.value = n;
    render();
  }

  function setType(t) {
    type = t;
    const c = CFG[t];
    volumeInput.min = c.min;
    volumeInput.max = c.max;
    volumeInput.value = volumes[t];
    if (t === "presentation") {
      volumeLabel.textContent = "Количество слайдов";
      volumeHint.textContent = `от ${c.min} до ${c.max} слайдов`;
    } else {
      volumeLabel.textContent = "Количество листов";
      volumeHint.textContent = `от ${c.min} листов — объём любой, можно ввести число вручную`;
    }
    render();
  }

  minusBtn.addEventListener("click", () => setVolume(currentVolume() - 1));
  plusBtn.addEventListener("click", () => setVolume(currentVolume() + 1));
  range.addEventListener("input", () => setVolume(parseInt(range.value, 10)));
  // Пока человек печатает — не мешаем, итог считаем по допустимому значению
  volumeInput.addEventListener("input", render);
  volumeInput.addEventListener("change", () => setVolume(currentVolume()));

  // ---------- Выбор типа ----------
  function openTelegram(text) {
    const url = text ? `${TG_LINK}?text=${encodeURIComponent(text)}` : TG_LINK;
    const win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url; // если браузер заблокировал новую вкладку
  }

  form.querySelectorAll('input[name="type"]').forEach((radio) => {
    // click срабатывает даже при повторном нажатии на «Другое»
    radio.addEventListener("click", () => {
      if (radio.value === "other") {
        fields.hidden = true;
        otherNote.hidden = false;
        openTelegram("Здравствуйте! Хочу заказать работу: ");
      } else {
        fields.hidden = false;
        otherNote.hidden = true;
        setType(radio.value);
      }
    });
  });

  // ---------- Файлы ----------
  function showFilesError(msg) {
    filesError.textContent = msg;
    filesError.hidden = !msg;
  }

  function addFiles(list) {
    const errors = [];
    for (const f of list) {
      if (files.length >= CFG.maxFiles) {
        errors.push(`Можно прикрепить не больше ${CFG.maxFiles} файлов.`);
        break;
      }
      if (f.size > CFG.maxFileSizeMb * 1024 * 1024) {
        errors.push(`«${f.name}» больше ${CFG.maxFileSizeMb} МБ — сожмите его или отправьте в Telegram.`);
        continue;
      }
      if (files.some((x) => x.name === f.name && x.size === f.size)) continue; // дубликат
      const totalMb = (files.reduce((s, x) => s + x.size, 0) + f.size) / 1024 / 1024;
      if (totalMb > CFG.maxTotalMb) {
        errors.push(`Все файлы вместе — не больше ${CFG.maxTotalMb} МБ. Остальное отправьте в Telegram.`);
        break;
      }
      files.push(f);
    }
    showFilesError(errors.join(" "));
    renderPreviews();
  }

  function renderPreviews() {
    previews.querySelectorAll("img").forEach((img) => URL.revokeObjectURL(img.src));
    previews.innerHTML = "";
    files.forEach((f, i) => {
      const li = document.createElement("li");
      li.className = "preview";
      if (f.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        img.alt = f.name;
        li.appendChild(img);
      } else {
        const ext = (f.name.split(".").pop() || "файл").toUpperCase();
        const doc = document.createElement("div");
        doc.className = "preview__doc";
        doc.innerHTML = `<span><b></b><span></span></span>`;
        doc.querySelector("b").textContent = ext;
        doc.querySelector("span span").textContent = f.name.length > 22 ? f.name.slice(0, 20) + "…" : f.name;
        li.appendChild(doc);
      }
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "preview__remove";
      rm.setAttribute("aria-label", "Убрать файл " + f.name);
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        files.splice(i, 1);
        showFilesError("");
        renderPreviews();
      });
      li.appendChild(rm);
      previews.appendChild(li);
    });
  }

  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = ""; // чтобы можно было выбрать тот же файл ещё раз
  });
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); })
  );
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  // ---------- Проверка полей ----------
  const required = ["fio", "group", "subject", "contact"];
  function validate() {
    let firstBad = null;
    required.forEach((id) => {
      const input = document.getElementById(id);
      const ok = input.value.trim().length > 0;
      input.closest(".field").classList.toggle("is-invalid", !ok);
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return !firstBad;
  }
  required.forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      if (input.value.trim()) input.closest(".field").classList.remove("is-invalid");
    });
  });

  // ---------- Текст заявки ----------
  function collect() {
    const n = currentVolume();
    return {
      type,
      typeName: type === "presentation" ? "Презентация" : "Проект",
      volume: n,
      volumeText: `${n} ${unitWord(n, type)}`,
      price: price(),
      fio: $("#fio").value.trim(),
      group: $("#group").value.trim(),
      subject: $("#subject").value.trim(),
      contact: $("#contact").value.trim(),
      wishes: $("#wishes").value.trim(),
    };
  }

  function messageText(d, maxWishes) {
    let wishes = d.wishes || "—";
    if (maxWishes && wishes.length > maxWishes) wishes = wishes.slice(0, maxWishes) + "…";
    const lines = [
      "📝 Новая заявка",
      `Тип: ${d.typeName}`,
      `Объём: ${d.volumeText}`,
      `Стоимость: ${rub(d.price)}`,
      "",
      `ФИО: ${d.fio}`,
      `Группа: ${d.group}`,
      `Предмет: ${d.subject}`,
      `Контакт: ${d.contact}`,
      "",
      `Пожелания: ${wishes}`,
    ];
    if (files.length) lines.push("", `📎 Файлов к заявке: ${files.length} (прикреплю в этом чате)`);
    return lines.join("\n");
  }

  // ---------- Модальное окно ----------
  const modal = $("#modal");
  function showModal({ ok, title, text, actions = [] }) {
    $("#modalIcon").textContent = ok ? "✓" : "!";
    $("#modalIcon").classList.toggle("is-warn", !ok);
    $("#modalTitle").textContent = title;
    $("#modalText").textContent = text;
    const box = $("#modalActions");
    box.innerHTML = "";
    actions.forEach((a) => {
      const el = document.createElement("a");
      el.className = "btn btn--wide";
      el.href = a.href;
      el.target = "_blank";
      el.rel = "noopener";
      el.textContent = a.label;
      box.appendChild(el);
    });
    modal.hidden = false;
    $("#modalClose").focus();
  }
  function hideModal() { modal.hidden = true; }
  $("#modalClose").addEventListener("click", hideModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) hideModal(); });

  // Файл → { name, type, data(base64) } для отправки в JSON
  function fileToBase64(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, type: f.type, data: String(r.result).split(",")[1] || "" });
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    });
  }

  function resetForm() {
    ["fio", "group", "subject", "contact", "wishes"].forEach((id) => (document.getElementById(id).value = ""));
    files = [];
    renderPreviews();
    showFilesError("");
  }

  // ---------- Отправка ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website.value) return; // заполнил бот-спамер
    if (!validate()) return;

    const data = collect();

    // Вариант 1: сервер ещё не подключён — открываем Telegram с готовым текстом
    if (!CFG.workerUrl) {
      openTelegram(messageText(data, 1500));
      showModal({
        ok: true,
        title: "Почти готово!",
        text: files.length
          ? "Открылся Telegram с текстом заявки. Нажмите «Отправить», а затем прикрепите в этом же чате ваши фото и файлы."
          : "Открылся Telegram с текстом заявки — осталось нажать «Отправить» в чате.",
        actions: [{ label: "Открыть Telegram ещё раз", href: `${TG_LINK}?text=${encodeURIComponent(messageText(data, 1500))}` }],
      });
      return;
    }

    // Вариант 2: заявка уходит через сервер (Google Apps Script) прямо вам в Telegram вместе с файлами
    submitBtn.disabled = true;
    submitBtn.querySelector(".btn__text").textContent = "Отправляю…";
    try {
      const payload = { ...data, files: await Promise.all(files.map(fileToBase64)) };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90000);
      // text/plain — чтобы браузер не делал лишний предварительный запрос, который Google не поддерживает
      const res = await fetch(CFG.workerUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Ошибка сервера");

      showModal({
        ok: true,
        title: "Заявка отправлена!",
        text: `Заявка на ${data.type === "presentation" ? "презентацию" : "проект"} (${data.volumeText}, ${rub(data.price)}) получена. Скоро напишу вам: ${data.contact}.`,
      });
      resetForm();
    } catch (err) {
      showModal({
        ok: false,
        title: "Не получилось отправить",
        text: "Что-то пошло не так. Отправьте заявку через Telegram — текст уже готов.",
        actions: [{ label: "Отправить через Telegram", href: `${TG_LINK}?text=${encodeURIComponent(messageText(data, 1500))}` }],
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn__text").textContent = "Отправить заявку";
    }
  });

  // ---------- Плавающая кнопка на телефоне ----------
  const cta = $("#mobileCta");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((en) => cta.classList.toggle("is-hidden", en.isIntersecting)),
      { rootMargin: "0px 0px -20% 0px" }
    ).observe($("#order"));
  }

  // старт
  setType("presentation");
})();
