/* 22 Jalan Elok — shared header/footer, galleries, lightbox, enquiry form.
   Contact details live in SITE below; change them once here. */
// Site root, worked out from this script's own URL, so pages in
// subfolders (e.g. calendar/) and project URLs (/22je/) both resolve.
const ROOT = document.currentScript.src.replace(/assets\/js\/main\.js.*$/, "");

const SITE = {
  name: "22 Jalan Elok",
  phone: "+65 8016 7691",
  whatsapp: "6580167691",
  email: "info@22je.sg",
  manager: "Kevin",
  address: ["22 Jalan Elok", "Singapore 229060"],
  occupancy: ROOT + "calendar/",
  directions: "https://www.google.com/maps/dir//22+Jln+Elok,+Singapore+229060",
};

// Languages: English pages sit at the root, translations in their own folder (zh/, ja/, es/, fr/).
// Each page declares its language in <html lang>; the header dropdown lists them all.
// To add a language: add it here and to STRINGS, then copy the pages into its folder.
const LANGS = {
  en: { dir: "", name: "English", short: "EN", tag: "en" },
  zh: { dir: "zh/", name: "中文", short: "中文", tag: "zh-Hans" },
  ja: { dir: "ja/", name: "日本語", short: "日本語", tag: "ja" },
  es: { dir: "es/", name: "Español", short: "ES", tag: "es" },
  fr: { dir: "fr/", name: "Français", short: "FR", tag: "fr" },
};
const LANG = Object.keys(LANGS).find((k) => k !== "en" && document.documentElement.lang.startsWith(k)) || "en";
const BASE = ROOT + LANGS[LANG].dir;

const STRINGS = {
  en: {
    nav: ["Home", "Rooms", "Features", "Availability", "FAQs", "Contact"],
    brandSub: "Singapore",
    enquire: "Enquire",
    language: "Language",
    menu: "Open menu",
    tagline: "Furnished ensuite rooms for stays of three months or more. Book direct — no agent fee.",
    visit: "Visit", directions: "Get directions →", contact: "Contact", explore: "Explore",
    guide: "House guide", love: "Powered with love ♥", waAria: "WhatsApp us",
    hello: "Hello! I'd like to enquire about a stay at 22 Jalan Elok.",
    copied: "Link copied", copyPrompt: "Copy this link:",
    subject: "Enquiry — 22 Jalan Elok",
    f: { sep: ": ", name: "Name", email: "Email", room: "Room", movein: "Move-in", flexible: "flexible", length: "Length of stay", pass: "Residency / pass" },
  },
  zh: {
    nav: ["首页", "房间", "设施", "空房", "常见问题", "联系"],
    brandSub: "新加坡",
    enquire: "咨询",
    language: "语言",
    menu: "打开菜单",
    tagline: "带独立卫浴的精装房间，三个月起租。直接预订，无中介费。",
    visit: "地址", directions: "获取路线 →", contact: "联系", explore: "浏览",
    guide: "住户指南", love: "用心打造 ♥", waAria: "WhatsApp 联系我们",
    hello: "您好！我想咨询入住 22 Jalan Elok。",
    copied: "链接已复制", copyPrompt: "复制此链接：",
    subject: "咨询 — 22 Jalan Elok",
    f: { sep: "：", name: "姓名", email: "电邮", room: "房间", movein: "入住日期", flexible: "灵活", length: "租期", pass: "居留身份 / 准证" },
  },
  ja: {
    nav: ["ホーム", "お部屋", "設備", "空室状況", "よくある質問", "お問い合わせ"],
    brandSub: "シンガポール",
    enquire: "お問い合わせ",
    language: "言語",
    menu: "メニューを開く",
    tagline: "バスルーム付きの家具付きルーム。3か月以上のご滞在に。直接予約で仲介手数料なし。",
    visit: "所在地", directions: "道順を見る →", contact: "連絡先", explore: "サイト内",
    guide: "入居者ガイド", love: "心を込めて ♥", waAria: "WhatsApp でお問い合わせ",
    // Messages from Japanese pages carry English too, so the manager can always read them.
    hello: "こんにちは。22 Jalan Elok への滞在について問い合わせたいです。\nHello! I'd like to enquire about a stay at 22 Jalan Elok.",
    copied: "リンクをコピーしました", copyPrompt: "このリンクをコピーしてください：",
    subject: "お問い合わせ Enquiry — 22 Jalan Elok",
    f: { sep: ": ", name: "お名前 / Name", email: "メール / Email", room: "お部屋 / Room", movein: "入居希望日 / Move-in", flexible: "未定 / flexible", length: "滞在期間 / Length of stay", pass: "在留資格 / Residency / pass" },
  },
  es: {
    nav: ["Inicio", "Habitaciones", "Servicios", "Disponibilidad", "Preguntas", "Contacto"],
    brandSub: "Singapur",
    enquire: "Consultar",
    language: "Idioma",
    menu: "Abrir menú",
    tagline: "Habitaciones amuebladas con baño privado para estancias de tres meses o más. Reserve directamente, sin comisión de agencia.",
    visit: "Dirección", directions: "Cómo llegar →", contact: "Contacto", explore: "Explorar",
    guide: "Guía de la casa", love: "Hecho con cariño ♥", waAria: "Escríbanos por WhatsApp",
    // Messages from Spanish pages carry English too, so the manager can always read them.
    hello: "¡Hola! Me gustaría informarme sobre una estancia en 22 Jalan Elok.\nHello! I'd like to enquire about a stay at 22 Jalan Elok.",
    copied: "Enlace copiado", copyPrompt: "Copie este enlace:",
    subject: "Consulta / Enquiry — 22 Jalan Elok",
    f: { sep: ": ", name: "Nombre / Name", email: "Correo / Email", room: "Habitación / Room", movein: "Entrada / Move-in", flexible: "flexible", length: "Duración / Length of stay", pass: "Residencia / Residency / pass" },
  },
  fr: {
    nav: ["Accueil", "Chambres", "Équipements", "Disponibilités", "FAQ", "Contact"],
    brandSub: "Singapour",
    enquire: "Nous écrire",
    language: "Langue",
    menu: "Ouvrir le menu",
    tagline: "Chambres meublées avec salle de bains privative, pour des séjours de trois mois ou plus. Réservez en direct, sans frais d'agence.",
    visit: "Adresse", directions: "Itinéraire →", contact: "Contact", explore: "Explorer",
    guide: "Guide de la maison", love: "Fait avec amour ♥", waAria: "Écrivez-nous sur WhatsApp",
    // Messages from French pages carry English too, so the manager can always read them.
    hello: "Bonjour ! Je souhaiterais me renseigner sur un séjour au 22 Jalan Elok.\nHello! I'd like to enquire about a stay at 22 Jalan Elok.",
    copied: "Lien copié", copyPrompt: "Copiez ce lien :",
    subject: "Demande / Enquiry — 22 Jalan Elok",
    f: { sep: ": ", name: "Nom / Name", email: "E-mail / Email", room: "Chambre / Room", movein: "Arrivée / Move-in", flexible: "flexible", length: "Durée / Length of stay", pass: "Statut / Residency / pass" },
  },
};
const T = STRINGS[LANG];

const NAV = ["index.html", "rooms.html", "features.html", "calendar/", "faqs.html", "contact.html"]
  .map((href, i) => [href, T.nav[i]]);

const waLink = (text) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

const WA_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z"/></svg>`;

function renderChrome() {
  const norm = (h) => h.replace(/index\.html$/, "");
  // This page's path within its language, e.g. "rooms.html" on rooms.html, zh/rooms.html and ja/rooms.html.
  const here = norm(location.href.replace(/[?#].*$/, "").replace(ROOT, "").replace(/^(zh|ja|es|fr)\//, ""));
  // Pages that exist in every language; anything else (e.g. the 404) switches to that language's home page.
  const translated = [...NAV.map(([href]) => href), "guide/"].some((href) => norm(href) === here);
  const langHref = (k) => ROOT + LANGS[k].dir + (translated ? here : "");

  const header = document.querySelector("[data-header]");
  if (header) {
    header.outerHTML = `
      <header class="site-header">
        <div class="wrap">
          <nav class="nav" id="site-nav" aria-label="Main">
            ${NAV.map(([href, label]) =>
              `<a href="${BASE + href}"${norm(href) === here ? ' aria-current="page"' : ""}>${label}</a>`
            ).join("")}
          </nav>
          <button class="menu-toggle" aria-label="${T.menu}" aria-controls="site-nav" aria-expanded="false"><span></span><span></span></button>
          <a class="brand" href="${BASE}index.html">
            <span class="brand__name">22 Jalan Elok</span>
            <span class="brand__sub">${T.brandSub}</span>
          </a>
          <div class="header-cta">
            <div class="lang-menu">
              <button class="lang-menu__btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="${T.language}: ${LANGS[LANG].name}">${LANGS[LANG].short}<span aria-hidden="true">▾</span></button>
              <ul class="lang-menu__list">
                ${Object.entries(LANGS).map(([k, l]) =>
                  `<li><a href="${langHref(k)}" hreflang="${l.tag}" lang="${l.tag}"${k === LANG ? ' aria-current="true"' : ""}>${l.name}</a></li>`
                ).join("")}
              </ul>
            </div>
            <a class="btn" href="${BASE}contact.html">${T.enquire}</a>
          </div>
        </div>
      </header>`;
  }

  const footer = document.querySelector("[data-footer]");
  if (footer) {
    footer.outerHTML = `
      <footer class="site-footer">
        <div class="wrap">
          <div class="footer-grid">
            <div>
              <a class="brand" href="${BASE}index.html" style="text-align:left">
                <span class="brand__name">22 Jalan Elok</span>
                <span class="brand__sub">${T.brandSub}</span>
              </a>
              <p style="margin-top:20px;max-width:22em;font-size:.92rem">${T.tagline}</p>
            </div>
            <div>
              <h4>${T.visit}</h4>
              <ul>${SITE.address.map((l) => `<li>${l}</li>`).join("")}
                <li><a href="${SITE.directions}" target="_blank" rel="noopener">${T.directions}</a></li></ul>
            </div>
            <div>
              <h4>${T.contact}</h4>
              <ul>
                <li><a href="tel:${SITE.phone.replace(/\s/g, "")}">${SITE.phone}</a></li>
                <li><a href="mailto:${SITE.email}">${SITE.email}</a></li>
                <li><a href="${waLink(T.hello)}" target="_blank" rel="noopener">WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <h4>${T.explore}</h4>
              <ul>
                ${NAV.slice(1).map(([href, label]) => `<li><a href="${BASE + href}">${label}</a></li>`).join("")}
                <li><a href="${BASE}guide/">${T.guide}</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-base">
            <span>© ${new Date().getFullYear()} 22 Jalan Elok</span>
            <span>${T.love}</span>
          </div>
        </div>
      </footer>
      <a class="wa-float" href="${waLink(T.hello)}" target="_blank" rel="noopener" aria-label="${T.waAria}">${WA_ICON}</a>
      <div class="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button class="lightbox__close" aria-label="Close">×</button>
        <button class="lightbox__prev" aria-label="Previous photo">‹</button>
        <img alt="">
        <button class="lightbox__next" aria-label="Next photo">›</button>
        <div class="lightbox__count"></div>
      </div>
      <div class="toast" role="status"></div>`;
  }


  // Fill any element carrying data-wa="message" with a WhatsApp deep link.
  document.querySelectorAll("[data-wa]").forEach((a) => {
    a.href = waLink(a.dataset.wa);
    a.target = "_blank";
    a.rel = "noopener";
  });
}

function initLangMenu() {
  const menu = document.querySelector(".lang-menu");
  if (!menu) return;
  const btn = menu.querySelector(".lang-menu__btn");
  const set = (open) => { menu.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", open); };
  btn.addEventListener("click", (e) => { e.stopPropagation(); set(!menu.classList.contains("is-open")); });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  // Keep the reader's place (e.g. rooms.html#elysia) when switching language.
  menu.querySelectorAll(".lang-menu__list a").forEach((a) =>
    a.addEventListener("click", () => { if (location.hash) a.href = a.href.replace(/#.*$/, "") + location.hash; })
  );
}

function initMenu() {
  const btn = document.querySelector(".menu-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    btn.setAttribute("aria-expanded", open);
  });
  document.querySelectorAll(".nav a").forEach((a) =>
    a.addEventListener("click", () => document.body.classList.remove("menu-open"))
  );
}

function initGalleries() {
  document.querySelectorAll(".gallery").forEach((g) => {
    const track = g.querySelector(".gallery__track");
    const count = g.querySelector(".gallery__count");
    const items = track.querySelectorAll("figure");
    const step = () => items[0].getBoundingClientRect().width + 12;
    g.querySelector("[data-prev]")?.addEventListener("click", () =>
      track.scrollBy({ left: -step(), behavior: "smooth" })
    );
    g.querySelector("[data-next]")?.addEventListener("click", () =>
      track.scrollBy({ left: step(), behavior: "smooth" })
    );
    const update = () => {
      if (!count) return;
      const i = Math.round(track.scrollLeft / step()) + 1;
      count.textContent = `${String(Math.min(i, items.length)).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    };
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    update();
  });
}

function initLightbox() {
  const box = document.querySelector(".lightbox");
  if (!box) return;
  const img = box.querySelector("img");
  const counter = box.querySelector(".lightbox__count");
  let set = [];
  let idx = 0;
  const show = () => {
    img.src = set[idx].src;
    img.alt = set[idx].alt;
    counter.textContent = `${idx + 1} / ${set.length}`;
  };
  const open = (group, i) => {
    set = group;
    idx = i;
    show();
    box.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    box.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  const move = (d) => {
    idx = (idx + d + set.length) % set.length;
    show();
  };

  document.querySelectorAll("[data-lightbox]").forEach((scope) => {
    const imgs = [...scope.querySelectorAll("img")];
    imgs.forEach((im, i) => im.addEventListener("click", () => open(imgs, i)));
  });
  box.querySelector(".lightbox__close").addEventListener("click", close);
  box.querySelector(".lightbox__prev").addEventListener("click", () => move(-1));
  box.querySelector(".lightbox__next").addEventListener("click", () => move(1));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
  });
}

function toast(msg) {
  const t = document.querySelector(".toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("is-on");
  setTimeout(() => t.classList.remove("is-on"), 2200);
}

// "Copy link to this room" — shareable deep links like rooms.html#elysia
function initShareLinks() {
  document.querySelectorAll("[data-share]").forEach((b) =>
    b.addEventListener("click", async () => {
      const url = `${location.origin}${location.pathname}#${b.dataset.share}`;
      try {
        await navigator.clipboard.writeText(url);
        toast(T.copied);
      } catch {
        prompt(T.copyPrompt, url);
      }
    })
  );
}

// Enquiry form: no backend — composes a WhatsApp message or an email.
function initEnquiry() {
  const form = document.querySelector("#enquiry");
  if (!form) return;
  const compose = () => {
    const f = Object.fromEntries(new FormData(form));
    const L = T.f;
    // Japanese, Spanish and French options carry their English name in data-en, so the manager can read the message.
    const pick = (sel) => {
      const o = sel.selectedOptions[0];
      return o.dataset.en && o.dataset.en !== o.text ? `${o.text} / ${o.dataset.en}` : o.text;
    };
    return [
      T.hello,
      ``,
      `${L.name}${L.sep}${f.name || "-"}`,
      f.email ? `${L.email}${L.sep}${f.email}` : null,
      `${L.room}${L.sep}${pick(form.room)}`,
      `${L.movein}${L.sep}${f.movein || L.flexible}`,
      `${L.length}${L.sep}${pick(form.length)}`,
      `${L.pass}${L.sep}${pick(form.pass)}`,
      f.message ? `\n${f.message}` : null,
    ].filter((l) => l !== null).join("\n");
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    window.open(waLink(compose()), "_blank", "noopener");
  });
  form.querySelector("[data-email]").addEventListener("click", () => {
    if (!form.reportValidity()) return;
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(T.subject)}&body=${encodeURIComponent(compose())}`;
  });
  const room = new URLSearchParams(location.search).get("room");
  if (room) form.room.value = room;
}

function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("is-in"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}

renderChrome();
initLangMenu();
initMenu();
initGalleries();
initLightbox();
initShareLinks();
initEnquiry();
initReveal();
