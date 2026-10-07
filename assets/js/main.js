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

const NAV = [
  ["index.html", "Home"],
  ["rooms.html", "Rooms"],
  ["features.html", "Features"],
  ["calendar/", "Availability"],
  ["faqs.html", "FAQs"],
  ["contact.html", "Contact"],
];

const waLink = (text) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

const WA_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z"/></svg>`;

function renderChrome() {
  const norm = (h) => h.replace(/index\.html$/, "");
  const here = norm(location.href.replace(/[?#].*$/, "").replace(ROOT, ""));

  const header = document.querySelector("[data-header]");
  if (header) {
    header.outerHTML = `
      <header class="site-header">
        <div class="wrap">
          <nav class="nav" id="site-nav" aria-label="Main">
            ${NAV.map(([href, label]) =>
              `<a href="${ROOT + href}"${norm(href) === here ? ' aria-current="page"' : ""}>${label}</a>`
            ).join("")}
          </nav>
          <button class="menu-toggle" aria-label="Open menu" aria-controls="site-nav" aria-expanded="false"><span></span><span></span></button>
          <a class="brand" href="${ROOT}index.html">
            <span class="brand__name">22 Jalan Elok</span>
            <span class="brand__sub">Residences · Singapore</span>
          </a>
          <div class="header-cta"><a class="btn" href="${ROOT}contact.html">Enquire</a></div>
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
              <a class="brand" href="${ROOT}index.html" style="text-align:left">
                <span class="brand__name">22 Jalan Elok</span>
                <span class="brand__sub">Residences · Singapore</span>
              </a>
              <p style="margin-top:20px;max-width:22em;font-size:.92rem">Furnished ensuite rooms for stays of three months or more. Book direct — no agent fee.</p>
            </div>
            <div>
              <h4>Visit</h4>
              <ul>${SITE.address.map((l) => `<li>${l}</li>`).join("")}
                <li><a href="${SITE.directions}" target="_blank" rel="noopener">Get directions →</a></li></ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li><a href="tel:${SITE.phone.replace(/\s/g, "")}">${SITE.phone}</a></li>
                <li><a href="mailto:${SITE.email}">${SITE.email}</a></li>
                <li><a href="${waLink("Good day! I'd like to enquire about a stay at 22 Jalan Elok.")}" target="_blank" rel="noopener">WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <h4>Explore</h4>
              <ul>
                ${NAV.slice(1).map(([href, label]) => `<li><a href="${ROOT + href}">${label}</a></li>`).join("")}
              </ul>
            </div>
          </div>
          <div class="footer-base">
            <span>© ${new Date().getFullYear()} 22 Jalan Elok</span>
            <span>Minimum stay 3 months · CEA standard tenancy agreement</span>
          </div>
        </div>
      </footer>
      <a class="wa-float" href="${waLink("Good day! I'd like to enquire about a stay at 22 Jalan Elok.")}" target="_blank" rel="noopener" aria-label="WhatsApp us">${WA_ICON}</a>
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
        toast("Link copied");
      } catch {
        prompt("Copy this link:", url);
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
    return [
      `Good day! I'd like to enquire about a stay at 22 Jalan Elok.`,
      ``,
      `Name: ${f.name || "-"}`,
      f.email ? `Email: ${f.email}` : null,
      `Room: ${form.room.selectedOptions[0].text}`,
      `Move-in: ${f.movein || "flexible"}`,
      `Length of stay: ${f.length}`,
      `Residency / pass: ${f.pass}`,
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
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent("Enquiry — 22 Jalan Elok")}&body=${encodeURIComponent(compose())}`;
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
initMenu();
initGalleries();
initLightbox();
initShareLinks();
initEnquiry();
initReveal();
