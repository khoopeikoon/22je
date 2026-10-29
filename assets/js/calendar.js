/* 22 Jalan Elok — availability calendar, shared by calendar/ and its zh/, ja/, es/ and fr/ twins.
   Needs main.js loaded first (LANG, waLink).

   ============================================================
   EDIT ME #1 — Rooms and bookings
   For each room, list the date ranges that are BOOKED using
   "YYYY-MM-DD". The end date is shown as booked too, e.g.
     bookings: [{ start: "2026-11-01", end: "2027-01-31" }]
   The id is the link anchor: calendar/#aurelia opens that room.
   zh / ja / es / fr are the room's name on the Chinese / Japanese / Spanish / French pages.
   Bump LAST_CHECKED on every edit, and whenever the calendar is
   confirmed still correct (aim for every week or two).
   ============================================================ */
const LAST_CHECKED = "2026-10-29";
const ROOMS = [
  { id: "aurelia", name: "Aurelia Suite",          zh: "Aurelia 金曦套房", ja: "Aurelia スイート", es: "Suite Aurelia", fr: "Suite Aurelia",         sub: "Suite",        bookings: [{ start: "2026-11-06", end: "2026-11-23" }] },
  { id: "elysia3", name: "Elysia Suite 3 (Twin)",  zh: "Elysia 怡境套房 3（双床）", ja: "Elysia スイート 3（ツイン）", es: "Suite Elysia 3 (dos camas)", fr: "Suite Elysia 3 (lits jumeaux)", sub: "Suite",        bookings: [] },
  { id: "elysia",  name: "Elysia Suite 4 (Queen)", zh: "Elysia 怡境套房 4（大床）", ja: "Elysia スイート 4（クイーン）", es: "Suite Elysia 4 (queen)", fr: "Suite Elysia 4 (queen)", sub: "Suite",        bookings: [{ start: "2026-10-09", end: "2027-02-08" }] },
  { id: "dq1",     name: "Deluxe Queen Room 1",    zh: "豪华大床房 1", ja: "デラックスクイーン 1", es: "Habitación Deluxe Queen 1", fr: "Chambre Deluxe Queen 1",         sub: "Deluxe Queen", bookings: [] },
  { id: "dq3",     name: "Deluxe Queen Room 3",    zh: "豪华大床房 3", ja: "デラックスクイーン 3", es: "Habitación Deluxe Queen 3", fr: "Chambre Deluxe Queen 3",         sub: "Deluxe Queen", bookings: [] },
  { id: "dq4",     name: "Deluxe Queen Room 4",    zh: "豪华大床房 4", ja: "デラックスクイーン 4", es: "Habitación Deluxe Queen 4", fr: "Chambre Deluxe Queen 4",         sub: "Deluxe Queen", bookings: [] },
  { id: "dt1",     name: "Deluxe Twin Room 1",     zh: "豪华双床房 1", ja: "デラックスツイン 1", es: "Habitación Deluxe Twin 1", fr: "Chambre Deluxe Twin 1",         sub: "Deluxe Twin",  bookings: [] },
  { id: "dt3",     name: "Deluxe Twin Room 3",     zh: "豪华双床房 3", ja: "デラックスツイン 3", es: "Habitación Deluxe Twin 3", fr: "Chambre Deluxe Twin 3",         sub: "Deluxe Twin",  bookings: [] },
  { id: "dt4",     name: "Deluxe Twin Room 4",     zh: "豪华双床房 4", ja: "デラックスツイン 4", es: "Habitación Deluxe Twin 4", fr: "Chambre Deluxe Twin 4",         sub: "Deluxe Twin",  bookings: [{ start: "2026-10-09", end: "2026-10-13" }] },
];

/* ============================================================
   EDIT ME #2 — Calendar range
   Calendars run from the current month through this end point.
   (The WhatsApp number comes from SITE in assets/js/main.js.)
   ============================================================ */
const CAL_END_YEAR = 2028;
const CAL_END_MONTH = 11; // 0 = Jan ... 11 = Dec

/* ------------------------------------------------------------
   No edits needed below this line.
   ------------------------------------------------------------ */
const CAL = {
  en: {
    locale: "en-SG", checked: "Availability last checked: ", dows: ["S", "M", "T", "W", "T", "F", "S"],
    name: (r) => r.name, sub: (r) => r.sub, through: `availability through December ${CAL_END_YEAR}`,
    checkout: "Now tap a check-out date", nights: (n) => `${n} night${n === 1 ? "" : "s"}`,
    wa: (r, a, b) => `Hello! I'd like to check availability for the ${r.name} from ${a} to ${b}.`,
  },
  zh: {
    locale: "zh-CN", checked: "空房情况最后核对：", dows: ["日", "一", "二", "三", "四", "五", "六"],
    name: (r) => r.zh, sub: (r) => ({ Suite: "套房", "Deluxe Queen": "豪华大床房", "Deluxe Twin": "豪华双床房" })[r.sub],
    through: `显示至 ${CAL_END_YEAR} 年 12 月`,
    checkout: "请再点击退房日期", nights: (n) => `${n} 晚`,
    wa: (r, a, b) => `您好！我想查询 ${r.zh} 在 ${a} 至 ${b} 是否有空房。`,
  },
  ja: {
    locale: "ja-JP", checked: "空室状況の最終確認：", dows: ["日", "月", "火", "水", "木", "金", "土"],
    name: (r) => r.ja, sub: (r) => ({ Suite: "スイート", "Deluxe Queen": "デラックスクイーン", "Deluxe Twin": "デラックスツイン" })[r.sub],
    through: `${CAL_END_YEAR}年12月まで表示`,
    checkout: "次にチェックアウト日をタップしてください", nights: (n) => `${n}泊`,
    // Sent in Japanese and English so the manager can always read it.
    wa: (r, a, b) => `こんにちは。${r.ja}の ${a} から ${b} までの空室状況を確認したいです。\nHello! I'd like to check availability for the ${r.name} from ${a} to ${b}.`,
  },
  es: {
    locale: "es-ES", checked: "Disponibilidad revisada por última vez: ", dows: ["D", "L", "M", "X", "J", "V", "S"],
    name: (r) => r.es, sub: (r) => r.sub,
    through: `disponibilidad hasta diciembre de ${CAL_END_YEAR}`,
    checkout: "Ahora toque la fecha de salida", nights: (n) => `${n} noche${n === 1 ? "" : "s"}`,
    // Sent in Spanish and English so the manager can always read it.
    wa: (r, a, b) => `¡Hola! Me gustaría consultar la disponibilidad de la ${r.es} del ${a} al ${b}.\nHello! I'd like to check availability for the ${r.name} from ${a} to ${b}.`,
  },
  fr: {
    locale: "fr-FR", checked: "Disponibilités vérifiées le ", dows: ["D", "L", "M", "M", "J", "V", "S"],
    name: (r) => r.fr, sub: (r) => r.sub,
    through: `disponibilités jusqu'en décembre ${CAL_END_YEAR}`,
    checkout: "Touchez maintenant la date de départ", nights: (n) => `${n} nuit${n > 1 ? "s" : ""}`,
    // Sent in French and English so the manager can always read it.
    wa: (r, a, b) => `Bonjour ! Je souhaiterais connaître les disponibilités de la ${r.fr} du ${a} au ${b}.\nHello! I'd like to check availability for the ${r.name} from ${a} to ${b}.`,
  },
}[LANG];

document.getElementById("calChecked").textContent = CAL.checked +
  new Date(LAST_CHECKED + "T00:00:00").toLocaleDateString({ en: "en-GB", zh: "zh-CN", ja: "ja-JP", es: "es-ES", fr: "fr-FR" }[LANG], { day: "numeric", month: "long", year: "numeric" });
const tabsEl = document.getElementById("roomTabs");
const titleEl = document.getElementById("roomTitle");
const subEl = document.getElementById("roomSub");
const areaEl = document.getElementById("calendarArea");

const fmtDate = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const isBooked = (dateStr, ranges) =>
  ranges.some((r) => dateStr >= r.start && dateStr <= r.end);

let currentRoom = null;
let selStart = null;
let selEnd = null;

function renderRoom(room) {
  currentRoom = room;
  selStart = null;
  selEnd = null;

  titleEl.textContent = CAL.name(room);
  subEl.textContent = `${CAL.sub(room)} · ${CAL.through}`;
  areaEl.innerHTML = "";

  const today = new Date();
  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
  const dows = CAL.dows;

  let y = today.getFullYear();
  let m = today.getMonth();
  let currentYear = null;
  let grid = null;

  while (y < CAL_END_YEAR || (y === CAL_END_YEAR && m <= CAL_END_MONTH)) {
    if (y !== currentYear) {
      currentYear = y;
      const label = document.createElement("div");
      label.className = "year-label";
      label.textContent = y;
      areaEl.appendChild(label);
      grid = document.createElement("div");
      grid.className = "cal-months";
      areaEl.appendChild(grid);
    }

    const monthEl = document.createElement("div");
    monthEl.className = "cal-month";
    const title = document.createElement("h4");
    title.textContent = new Date(y, m, 1).toLocaleDateString(CAL.locale, { month: "long", year: "numeric" });
    monthEl.appendChild(title);

    const g = document.createElement("div");
    g.className = "cal-grid";
    dows.forEach((l) => {
      const el = document.createElement("div");
      el.className = "cal-dow";
      el.textContent = l;
      g.appendChild(el);
    });
    const firstDow = new Date(y, m, 1).getDay();
    for (let b = 0; b < firstDow; b++) {
      const el = document.createElement("div");
      el.className = "cal-day blank";
      g.appendChild(el);
    }
    const totalDays = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = fmtDate(y, m, day);
      const el = document.createElement("div");
      el.className = "cal-day";
      el.dataset.date = dateStr;
      const booked = isBooked(dateStr, room.bookings);
      const isPast = dateStr < todayStr;
      if (booked) el.classList.add("booked");
      if (isPast) el.classList.add("past");
      if (dateStr === todayStr) el.classList.add("today");
      if (!booked && !isPast) {
        el.classList.add("selectable");
        el.addEventListener("click", () => handleDayClick(dateStr));
      }
      el.textContent = day;
      g.appendChild(el);
    }
    monthEl.appendChild(g);
    grid.appendChild(monthEl);

    m++;
    if (m > 11) { m = 0; y++; }
  }

  applySelectionClasses();
  updateFab();
}

/* Date-range selection + WhatsApp handoff */
const fmtNice = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString(CAL.locale, { day: "numeric", month: "short", year: "numeric" });
const nightsBetween = (a, b) =>
  Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

function rangeHasBooked(start, end, ranges) {
  const d = new Date(start + "T00:00:00");
  const endD = new Date(end + "T00:00:00");
  while (d <= endD) {
    if (isBooked(fmtDate(d.getFullYear(), d.getMonth(), d.getDate()), ranges)) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}

function handleDayClick(dateStr) {
  if (!selStart || selEnd) {
    selStart = dateStr; selEnd = null;
  } else if (dateStr === selStart) {
    selStart = null; selEnd = null;
  } else if (dateStr < selStart || rangeHasBooked(selStart, dateStr, currentRoom.bookings)) {
    selStart = dateStr; selEnd = null;
  } else {
    selEnd = dateStr;
  }
  applySelectionClasses();
  updateFab();
}

function applySelectionClasses() {
  document.querySelectorAll(".cal-day[data-date]").forEach((el) => {
    el.classList.remove("in-range", "range-start", "range-end");
    const ds = el.dataset.date;
    if (!selStart) return;
    if (ds === selStart) el.classList.add("range-start");
    else if (selEnd && ds === selEnd) el.classList.add("range-end");
    else if (selEnd && ds > selStart && ds < selEnd) el.classList.add("in-range");
  });
}

function updateFab() {
  const fab = document.getElementById("dateFab");
  const textEl = document.getElementById("dateFabText");
  const waBtn = document.getElementById("dateFabWhatsapp");

  if (!selStart) {
    fab.classList.remove("visible");
    return;
  }
  fab.classList.add("visible");

  if (!selEnd) {
    textEl.innerHTML = `${fmtNice(selStart)}<small>${CAL.checkout}</small>`;
    waBtn.classList.add("disabled");
    waBtn.href = "#";
  } else {
    const nights = nightsBetween(selStart, selEnd);
    textEl.innerHTML = `${fmtNice(selStart)} – ${fmtNice(selEnd)}<small>${CAL.nights(nights)}</small>`;
    waBtn.classList.remove("disabled");
    waBtn.href = waLink(CAL.wa(currentRoom, selStart, selEnd));
  }
}

document.getElementById("dateFabClear").addEventListener("click", () => {
  selStart = null; selEnd = null;
  applySelectionClasses();
  updateFab();
});

const tabButtons = [];

function activateRoom(room, updateHash) {
  tabButtons.forEach((b) => {
    const on = b.dataset.roomId === room.id;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  renderRoom(room);
  if (updateHash) history.replaceState(null, "", "#" + room.id);
}

ROOMS.forEach((room) => {
  const btn = document.createElement("button");
  btn.className = "room-tab";
  btn.textContent = CAL.name(room);
  btn.dataset.roomId = room.id;
  btn.setAttribute("role", "tab");
  btn.addEventListener("click", () => {
    activateRoom(room, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  tabsEl.appendChild(btn);
  tabButtons.push(btn);
});

/* Deep links — calendar/#aurelia opens straight to that room. */
const roomFromHash = () => ROOMS.find((r) => r.id === location.hash.slice(1));
activateRoom(roomFromHash() || ROOMS[0], false);
window.addEventListener("hashchange", () => {
  const match = roomFromHash();
  if (match) activateRoom(match, false);
});
