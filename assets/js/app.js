const APP_VERSION = "2.7.0";
const DEFAULT_LOGO = "assets/images/eternal-blooms-logo.png";
const DEFAULT_UI_LOGO = "assets/images/eternal-blooms-logo-alt.png";
const blank = {
  orders: [],
  expenses: [],
  inventory: [],
  customers: [],
  invoices: [],
  settings: {
    businessName: "Eternal Blooms",
    businessUser: "@eternalblooms.ie",
    logoData: DEFAULT_LOGO,
    currency: "EUR",
    locale: "en-IE",
    theme: "system",
    measurement: "metric",
    invoicePolicy:
      "A booking is confirmed once the agreed retainer is received. The remaining balance is due by the date agreed with the florist. Changes and cancellations are subject to the florist’s written terms and applicable consumer law.",
  },
  meta: { updatedAt: null },
  version: APP_VERSION,
};
let db;
try {
  db =
    JSON.parse(localStorage.ebFloristStudioConnected || "null") ||
    structuredClone(blank);
} catch (e) {
  db = structuredClone(blank);
}
normalize();
let localFileHandle = null,
  localFileName = "";
let calendarViewDate = new Date(),
  calendarSelectedDate = today();
calendarViewDate = new Date(
  calendarViewDate.getFullYear(),
  calendarViewDate.getMonth(),
  1,
);
const pages = [
  ["home", "Home", "🏠"],
  ["calculator", "Pricing", "🧮"],
  ["orders", "Orders", "📋"],
  ["inventory", "Inventory", "📦"],
  ["expenses", "Expenses", "💸"],
  ["calendar", "Calendar", "📅"],
  ["customers", "Customers", "👥"],
  ["invoices", "Invoices", "🧾"],
  ["content", "Ideas", "💡"],
  ["analytics", "Analytics", "📈"],
];
const MOBILE_PRIMARY_PAGES = ["home", "calendar", "studio", "orders"];
const NAV_ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
  calculator: '<rect x="4" y="2.5" width="16" height="19" rx="3"/><path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
  studio: '<path d="M12 3c2.5 3.1 4.7 5.8 4.7 9A4.7 4.7 0 1 1 7.3 12C7.3 8.8 9.5 6.1 12 3Z"/><path d="M12 8v13M8.5 13.5 12 16l3.5-2.5"/>',
  orders: '<path d="M8 4h8M9 2.5h6a1 1 0 0 1 1 1V6H8V3.5a1 1 0 0 1 1-1Z"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 10h8M8 14h8M8 18h5"/>',
  inventory: '<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
  expenses: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.6-1.8-1-3-1-1.7 0-3 .9-3 2.2 0 3.3 6 1.4 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.7-.5-3.5-1.3M12 5.5v13"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01"/>',
  customers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  invoices: '<path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 11h6M9 15h6M9 19h3"/>',
  content: '<path d="M9 18h6M10 22h4"/><path d="M8.2 14.8A7 7 0 1 1 15.8 14.8C14.8 15.5 14.3 16.2 14.2 18h-4.4c-.1-1.8-.6-2.5-1.6-3.2Z"/>',
  analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m3 8 6-5 6 7 6-5"/>',
  install: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
function navIcon(id) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${NAV_ICONS[id] || NAV_ICONS.home}</svg>`;
}
function $(id) {
  return document.getElementById(id);
}
function money(n) {
  try {
    return new Intl.NumberFormat(db?.settings?.locale || "en-IE", {
      style: "currency",
      currency: db?.settings?.currency || "EUR",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch (e) {
    return Number(n || 0).toFixed(2);
  }
}
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function val(id) {
  return parseFloat($(id).value) || 0;
}
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
  );
}
function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(db.settings.locale || "en-IE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value + "T12:00:00"));
  } catch (e) {
    return value;
  }
}

function parseLocalDate(value) {
  if (!value) return null;
  const parts = String(value).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part)))
    return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}
function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatTimeValue(value) {
  if (!value) return "All day";
  try {
    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date(2000, 0, 1, hours, minutes || 0);
    return new Intl.DateTimeFormat(db.settings.locale || "en-IE", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    return value;
  }
}
function orderScheduleLabel(order) {
  if (!order.startTime) return "All day";
  const start = formatTimeValue(order.startTime);
  return order.endTime ? `${start}–${formatTimeValue(order.endTime)}` : start;
}
function firstDayOfCalendarWeek() {
  try {
    const locale = new Intl.Locale(db.settings.locale || "en-IE");
    const weekInfo = locale.weekInfo || locale.getWeekInfo?.();
    if (weekInfo?.firstDay) return weekInfo.firstDay % 7;
  } catch (error) {
    // Fall through to a locale-friendly default.
  }
  return String(db.settings.locale || "").startsWith("en-US") ? 0 : 1;
}
function calendarWeekdayNames(firstDay) {
  const sunday = new Date(2024, 0, 7, 12);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + ((firstDay + index) % 7));
    return new Intl.DateTimeFormat(db.settings.locale || "en-IE", {
      weekday: "short",
    }).format(day);
  });
}
function ordersForDate(dateKey) {
  return db.orders
    .filter((order) => order.date === dateKey)
    .sort((a, b) =>
      `${a.startTime || "99:99"}-${a.name || ""}`.localeCompare(
        `${b.startTime || "99:99"}-${b.name || ""}`,
      ),
    );
}
function calendarCellKeydown(event, dateKey) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectCalendarDate(dateKey);
  }
}
function selectCalendarDate(dateKey) {
  calendarSelectedDate = dateKey;
  const selected = parseLocalDate(dateKey);
  if (selected) {
    calendarViewDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
  }
  renderCalendar();
}
function changeCalendarMonth(offset) {
  calendarViewDate = new Date(
    calendarViewDate.getFullYear(),
    calendarViewDate.getMonth() + Number(offset || 0),
    1,
  );
  renderCalendar();
}
function goToCalendarToday() {
  const now = new Date();
  calendarSelectedDate = today();
  calendarViewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar();
}
function renderCalendar() {
  const grid = $("calendarGrid");
  const weekdays = $("calendarWeekdays");
  const monthLabel = $("calendarMonthLabel");
  const selectedLabel = $("calendarSelectedLabel");
  const selectedOrders = $("calendarDayOrders");
  if (!grid || !weekdays || !monthLabel || !selectedLabel || !selectedOrders)
    return;

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const monthStart = new Date(year, month, 1, 12);
  const firstDay = firstDayOfCalendarWeek();
  const offset = (monthStart.getDay() - firstDay + 7) % 7;
  const gridStart = new Date(year, month, 1 - offset, 12);
  monthLabel.textContent = new Intl.DateTimeFormat(
    db.settings.locale || "en-IE",
    { month: "long", year: "numeric" },
  ).format(monthStart);
  weekdays.innerHTML = calendarWeekdayNames(firstDay)
    .map((name) => `<span>${esc(name)}</span>`)
    .join("");

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    const dateKey = localDateKey(day);
    const dayOrders = ordersForDate(dateKey);
    const outside = day.getMonth() !== month;
    const isToday = dateKey === today();
    const isSelected = dateKey === calendarSelectedDate;
    const visibleOrders = dayOrders.slice(0, 3);
    cells.push(`<div
      class="calendar-day${outside ? " is-outside" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}"
      role="gridcell"
      tabindex="0"
      aria-label="${esc(formatDate(dateKey))}, ${dayOrders.length} order${dayOrders.length === 1 ? "" : "s"}"
      onclick="selectCalendarDate('${dateKey}')"
      onkeydown="calendarCellKeydown(event,'${dateKey}')"
    >
      <div class="calendar-day-number"><span>${day.getDate()}</span>${dayOrders.length ? `<b>${dayOrders.length}</b>` : ""}</div>
      <div class="calendar-events">
        ${visibleOrders
          .map(
            (
              order,
            ) => `<button type="button" class="calendar-event ${orderStatus(order) === "Done" ? "is-completed" : "is-upcoming"}" onclick="event.stopPropagation();selectCalendarDate('${dateKey}')" title="${esc(order.name)} — ${esc(orderScheduleLabel(order))}">
              <span class="calendar-event-time">${order.startTime ? esc(formatTimeValue(order.startTime)) : "•"}</span>
              <span class="calendar-event-label">${esc(order.name)}</span>
            </button>`,
          )
          .join("")}
        ${dayOrders.length > 3 ? `<span class="calendar-more">+${dayOrders.length - 3} more</span>` : ""}
      </div>
    </div>`);
  }
  grid.innerHTML = cells.join("");

  const selectedDate = parseLocalDate(calendarSelectedDate) || new Date();
  selectedLabel.textContent = new Intl.DateTimeFormat(
    db.settings.locale || "en-IE",
    { weekday: "long", day: "numeric", month: "long" },
  ).format(selectedDate);
  const dayOrders = ordersForDate(calendarSelectedDate);
  selectedOrders.innerHTML = dayOrders.length
    ? dayOrders
        .map(
          (order) => `<article class="calendar-agenda-order">
            <div class="calendar-agenda-head"><b>${esc(order.name)}</b><span class="pill ${orderStatus(order) === "Done" ? "done" : "notdone"}">${orderStatus(order)}</span></div>
            <p>${esc(orderScheduleLabel(order))}${order.customerName ? ` · ${esc(order.customerName)}` : ""}</p>
            ${order.location ? `<p class="mini">📍 ${esc(order.location)}</p>` : ""}
            <div class="mini-metrics"><span>Sale <b>${money(order.price)}</b></span><span>Balance <b>${money(Math.max(0, (+order.price || 0) - (+order.depositAmount || 0)))}</b></span></div>
            <div class="actions calendar-order-actions">
              <button onclick="openGoogleCalendar(${order.id})">Google</button>
              <button onclick="downloadOrderICS(${order.id})">Apple / .ics</button>
              <button onclick="showPage('orders')">Open orders</button>
            </div>
          </article>`,
        )
        .join("")
    : '<div class="empty-state calendar-empty">No orders booked for this day.</div>';
}
function getOrderDateRange(order) {
  const baseDate = parseLocalDate(order.date || today()) || new Date();
  if (!order.startTime) {
    const end = new Date(baseDate);
    end.setDate(end.getDate() + 1);
    return { allDay: true, start: baseDate, end };
  }
  const [startHour, startMinute] = order.startTime.split(":").map(Number);
  const start = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    startHour || 0,
    startMinute || 0,
    0,
    0,
  );
  let end;
  if (order.endTime) {
    const [endHour, endMinute] = order.endTime.split(":").map(Number);
    end = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      endHour || 0,
      endMinute || 0,
      0,
      0,
    );
  }
  if (!end || end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
  return { allDay: false, start, end };
}
function compactDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
function compactUTC(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
function escapeICSText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
function orderCalendarDescription(order) {
  return [
    order.customerName ? `Customer: ${order.customerName}` : "",
    `Status: ${orderStatus(order)}`,
    `Order value: ${money(order.price)}`,
    order.notes || "",
    `Created in ${db.settings.businessName || "Florist Studio"}`,
  ]
    .filter(Boolean)
    .join("\n");
}
function orderICSEvent(order) {
  const range = getOrderDateRange(order);
  const dateLines = range.allDay
    ? `DTSTART;VALUE=DATE:${compactDate(range.start)}\r\nDTEND;VALUE=DATE:${compactDate(range.end)}`
    : `DTSTART:${compactUTC(range.start)}\r\nDTEND:${compactUTC(range.end)}`;
  return [
    "BEGIN:VEVENT",
    `UID:order-${order.id}@florist-studio.local`,
    `DTSTAMP:${compactUTC(new Date())}`,
    dateLines,
    `SUMMARY:${escapeICSText(order.name || "Florist order")}`,
    `DESCRIPTION:${escapeICSText(orderCalendarDescription(order))}`,
    order.location ? `LOCATION:${escapeICSText(order.location)}` : "",
    "STATUS:CONFIRMED",
    `X-FLORIST-STATUS:${escapeICSText(orderStatus(order))}`,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}
function buildOrdersICS(orders) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eternal Blooms//Florist Studio//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICSText(db.settings.businessName || "Florist Studio Orders")}`,
    ...orders.map(orderICSEvent),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
function calendarFilename(label = "orders") {
  return (
    String(label || "orders")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "orders"
  );
}
function downloadCalendarFile(content, filename) {
  const href = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
function downloadOrderICS(id) {
  const order = db.orders.find((item) => item.id === Number(id));
  if (!order) return;
  downloadCalendarFile(
    buildOrdersICS([order]),
    `${calendarFilename(order.name)}-${order.date || today()}.ics`,
  );
  setSaveStatus("Calendar event downloaded", "saved");
}
function exportAllOrdersICS() {
  const orders = [...db.orders]
    .filter((order) => order.date)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!orders.length) return alert("Add an order before exporting a calendar.");
  downloadCalendarFile(
    buildOrdersICS(orders),
    `${calendarFilename(db.settings.businessName)}-orders.ics`,
  );
  setSaveStatus(`${orders.length} orders exported`, "saved");
}
async function shareAllOrdersICS() {
  const orders = db.orders.filter((order) => order.date);
  if (!orders.length) return alert("Add an order before sharing a calendar.");
  let file;
  try {
    file = new File(
      [buildOrdersICS(orders)],
      `${calendarFilename(db.settings.businessName)}-orders.ics`,
      { type: "text/calendar" },
    );
  } catch (error) {
    exportAllOrdersICS();
    return;
  }
  try {
    if (
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files: [file] }))
    ) {
      await navigator.share({
        title: `${db.settings.businessName} order calendar`,
        text: "Import these florist orders into your calendar.",
        files: [file],
      });
      setSaveStatus("Calendar shared", "saved");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  exportAllOrdersICS();
}
function openGoogleCalendar(id) {
  const order = db.orders.find((item) => item.id === Number(id));
  if (!order) return;
  const range = getOrderDateRange(order);
  const dates = range.allDay
    ? `${compactDate(range.start)}/${compactDate(range.end)}`
    : `${compactUTC(range.start)}/${compactUTC(range.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: order.name || "Florist order",
    dates,
    details: orderCalendarDescription(order),
    location: order.location || "",
  });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone) params.set("ctz", timezone);
  window.open(
    `https://calendar.google.com/calendar/render?${params.toString()}`,
    "_blank",
    "noopener,noreferrer",
  );
}
function openGoogleCalendarHome() {
  window.open(
    "https://calendar.google.com/calendar/u/0/r",
    "_blank",
    "noopener,noreferrer",
  );
  setSaveStatus("Use an order’s Google button for one-tap adding", "saved");
}

function normalize() {
  ["orders", "expenses", "inventory", "customers", "invoices"].forEach(
    (k) => (db[k] ||= []),
  );
  db.settings ||= {};
  db.meta ||= { updatedAt: null };
  db.version = APP_VERSION;
  db.settings.businessName ||= "Eternal Blooms";
  db.settings.businessUser ||= "@eternalblooms.ie";
  db.settings.logoData ||= DEFAULT_LOGO;
  db.settings.currency ||= "EUR";
  db.settings.locale ||= "en-IE";
  db.settings.theme ||= "system";
  db.settings.measurement ||= "metric";
  db.settings.invoicePolicy ||=
    "A booking is confirmed once the agreed retainer is received. The remaining balance is due by the date agreed with the florist. Changes and cancellations are subject to the florist’s written terms and applicable consumer law.";
  db.orders.forEach((o) => {
    o.depositPaid = !!o.depositPaid;
    o.depositAmount = Math.max(0, +o.depositAmount || 0);
    o.startTime ||= "";
    o.endTime ||= "";
    o.location ||= "";
  });
  db.invoices.forEach((i) => {
    i.depositPaid = !!i.depositPaid;
    i.depositAmount = Math.max(0, +i.depositAmount || 0);
  });
}
let saveFlashTimer = null;
function setSaveStatus(text, state = "saved") {
  let box = $("saveIndicator"),
    label = $("saveIndicatorText");
  if (!box || !label) return;
  label.textContent = text;
  box.dataset.state = state;
  box.classList.add("visible");
  clearTimeout(saveFlashTimer);
  saveFlashTimer = setTimeout(() => box.classList.remove("visible"), 2400);
}
function openStudioDB() {
  return new Promise((resolve, reject) => {
    let req = indexedDB.open("FloristStudioDB", 2);
    req.onupgradeneeded = () => {
      let d = req.result;
      if (!d.objectStoreNames.contains("workspace"))
        d.createObjectStore("workspace");
      if (!d.objectStoreNames.contains("snapshots"))
        d.createObjectStore("snapshots", { keyPath: "savedAt" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function mirrorToIndexedDB() {
  if (!("indexedDB" in window)) return;
  try {
    let d = await openStudioDB(),
      tx = d.transaction("workspace", "readwrite");
    tx.objectStore("workspace").put(structuredClone(db), "current");
    await new Promise((r, j) => {
      tx.oncomplete = r;
      tx.onerror = () => j(tx.error);
    });
    d.close();
  } catch (e) {
    console.warn("IndexedDB mirror failed", e);
  }
}
async function createSnapshot() {
  if (!("indexedDB" in window)) return;
  let last = +(localStorage.ebLastSnapshot || 0);
  if (Date.now() - last < 21600000) return;
  try {
    let d = await openStudioDB(),
      tx = d.transaction("snapshots", "readwrite"),
      store = tx.objectStore("snapshots"),
      savedAt = new Date().toISOString();
    store.put({ savedAt, data: structuredClone(db) });
    let all = store.getAllKeys();
    all.onsuccess = () =>
      all.result
        .sort()
        .slice(0, -8)
        .forEach((k) => store.delete(k));
    await new Promise((r, j) => {
      tx.oncomplete = r;
      tx.onerror = () => j(tx.error);
    });
    localStorage.ebLastSnapshot = String(Date.now());
    d.close();
  } catch (e) {
    console.warn("Snapshot failed", e);
  }
}
async function restoreFromIndexedDB() {
  if (localStorage.ebFloristStudioConnected || !("indexedDB" in window)) return;
  try {
    let d = await openStudioDB(),
      tx = d.transaction("workspace", "readonly"),
      req = tx.objectStore("workspace").get("current");
    req.onsuccess = () => {
      if (req.result) {
        db = req.result;
        normalize();
        localStorage.ebFloristStudioConnected = JSON.stringify(db);
        render();
        setSaveStatus("Restored on this device", "saved");
      }
    };
    d.close();
  } catch (e) {
    console.warn("Restore failed", e);
  }
}
function save() {
  normalize();
  db.meta.updatedAt = new Date().toISOString();
  localStorage.ebFloristStudioConnected = JSON.stringify(db);
  render();
  setSaveStatus("Saved on this device", "saved");
  mirrorToIndexedDB();
  createSnapshot();
  saveToLocalFile(true);
}
function isMobilePrimaryPage(id) {
  return MOBILE_PRIMARY_PAGES.includes(id);
}
function closeMobileMore() {
  const menu = $("mobileMoreMenu");
  const backdrop = $("mobileMoreBackdrop");
  if (menu) {
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
  }
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.classList.remove("open");
  }
  document.body.classList.remove("mobile-more-open");
}
function toggleMobileMore() {
  const menu = $("mobileMoreMenu");
  const backdrop = $("mobileMoreBackdrop");
  if (!menu || !backdrop) return;
  const open = !menu.classList.contains("open");
  menu.classList.toggle("open", open);
  menu.setAttribute("aria-hidden", String(!open));
  backdrop.hidden = !open;
  requestAnimationFrame(() => backdrop.classList.toggle("open", open));
  document.body.classList.toggle("mobile-more-open", open);
}
function navButtonMarkup(id, label, extra = "") {
  return `<button type="button" data-page="${id}" onclick="showPage('${id}')" title="${label}" aria-label="${label}" ${extra}><span class="nav-icon" aria-hidden="true">${navIcon(id)}</span><span class="nav-label">${label}</span></button>`;
}
function showPage(id) {
  const target = document.getElementById(id) ? id : "home";
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.toggle("active", page.id === target));
  document
    .querySelectorAll("[data-page]")
    .forEach((button) => {
      const active = button.dataset.page === target;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
  const moreButton = document.querySelector('[data-mobile-more="true"]');
  if (moreButton) {
    const secondaryActive = !isMobilePrimaryPage(target);
    moreButton.classList.toggle("active", secondaryActive);
    moreButton.setAttribute("aria-current", secondaryActive ? "page" : "false");
  }
  closeMobileMore();
  document.body.dataset.page = target;
  const label = pages.find((page) => page[0] === target)?.[1] || "Workspace";
  document.title = `${label} · ${db.settings.businessName || "Florist Studio"}`;
  $("pages")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function setupNav() {
  nav.innerHTML = pages
    .map(([id, label]) => navButtonMarkup(id, label))
    .join("");

  const primary = pages.filter(([id]) => isMobilePrimaryPage(id));
  bottomNav.innerHTML = primary
    .map(([id, label]) => navButtonMarkup(id, label))
    .join("") +
    `<button type="button" data-mobile-more="true" onclick="toggleMobileMore()" title="More tools" aria-label="More tools"><span class="nav-icon" aria-hidden="true">${navIcon("more")}</span><span class="nav-label">More</span></button>`;

  const secondary = pages.filter(([id]) => !isMobilePrimaryPage(id));
  if ($("mobileMoreMenuList")) {
    $("mobileMoreMenuList").innerHTML = secondary
      .map(([id, label]) => navButtonMarkup(id, label))
      .join("");
  }

  const active = document.querySelector(".page.active")?.id || "home";
  document.querySelectorAll(`[data-page="${active}"]`).forEach((button) => {
    button.classList.add("active");
    button.setAttribute("aria-current", "page");
  });
  const moreButton = document.querySelector('[data-mobile-more="true"]');
  if (moreButton && !isMobilePrimaryPage(active)) moreButton.classList.add("active");
}
function supportsFiles() {
  return "showSaveFilePicker" in window && "showOpenFilePicker" in window;
}
async function writeFile(h, data) {
  const w = await h.createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}
async function createLocalFile() {
  if (!supportsFiles()) {
    fileStatus.textContent =
      "Direct file connection is not available here. Opening the device share/download flow instead.";
    return shareBackup();
  }
  try {
    localFileHandle = await showSaveFilePicker({
      suggestedName: "florist-studio-data.json",
      types: [
        {
          description: "Florist Studio data",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    localFileName = localFileHandle.name;
    await writeFile(localFileHandle, db);
    fileStatus.textContent =
      "Connected to " + localFileName + ". Changes now autosave to it.";
    setSaveStatus("Device file connected", "saved");
  } catch (e) {
    if (e.name !== "AbortError") fileStatus.textContent = "No file created.";
  }
}
async function openLocalFile() {
  if (!supportsFiles()) {
    fileStatus.textContent =
      "Use Import on this device to choose a Florist Studio backup.";
    return importFile.click();
  }
  try {
    [localFileHandle] = await showOpenFilePicker({
      types: [
        {
          description: "Florist Studio data",
          accept: { "application/json": [".json"] },
        },
      ],
      multiple: false,
    });
    localFileName = localFileHandle.name;
    const f = await localFileHandle.getFile();
    db = JSON.parse((await f.text()) || "{}");
    normalize();
    save();
    fileStatus.textContent =
      "Connected to " + localFileName + ". Changes now autosave to it.";
  } catch (e) {
    if (e.name !== "AbortError") fileStatus.textContent = "No file opened.";
  }
}
async function saveToLocalFile(silent = false) {
  if (!localFileHandle) {
    if (!silent) fileStatus.textContent = "No local file connected yet.";
    return;
  }
  try {
    await writeFile(localFileHandle, db);
    if (!silent)
      fileStatus.textContent =
        "Saved to " + localFileName + " at " + new Date().toLocaleTimeString();
  } catch (e) {
    if (!silent)
      fileStatus.textContent = "Could not save to file. Download a backup.";
  }
}
function backupFileName() {
  return "florist-studio-" + today() + ".json";
}
function backupBlob() {
  return new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
}
function exportData() {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(backupBlob());
  a.download = backupFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 800);
  setSaveStatus("Backup downloaded", "saved");
}
async function shareBackup() {
  let file = new File([backupBlob()], backupFileName(), {
    type: "application/json",
  });
  try {
    if (
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files: [file] }))
    ) {
      await navigator.share({
        title: "Florist Studio backup",
        text: "Private Florist Studio device backup",
        files: [file],
      });
      setSaveStatus("Backup shared", "saved");
    } else exportData();
  } catch (e) {
    if (e.name !== "AbortError") exportData();
  }
}
importFile.onchange = (e) => {
  let f = e.target.files && e.target.files[0];
  if (!f) return;
  let r = new FileReader();
  r.onload = () => {
    try {
      let incoming = JSON.parse(r.result);
      if (!incoming || typeof incoming !== "object")
        throw new Error("Invalid backup");
      db = incoming;
      normalize();
      save();
      fileStatus.textContent = "Backup imported and saved on this device.";
    } catch (err) {
      alert("This file is not a valid Florist Studio backup.");
    }
  };
  r.readAsText(f);
  e.target.value = "";
};
function applyTheme() {
  let pref = db.settings.theme || "system",
    dark =
      pref === "dark" ||
      (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  let meta = $("themeColorMeta");
  if (meta) meta.content = dark ? "#211820" : "#5f3046";
}
function saveBrand() {
  db.settings.businessName = businessName.value || "My Florist Studio";
  db.settings.businessUser = businessUser.value || "";
  db.settings.currency = currencySetting.value || "EUR";
  db.settings.locale = localeSetting.value || "en-IE";
  db.settings.theme = themeSetting.value || "system";
  db.settings.measurement = measurementSetting.value || "metric";
  db.settings.invoicePolicy =
    invoicePolicy.value.trim() || db.settings.invoicePolicy;
  applyTheme();
  save();
}
function resetBrand() {
  db.settings = {
    businessName: "Eternal Blooms",
    businessUser: "@eternalblooms.ie",
    logoData: DEFAULT_LOGO,
    currency: "EUR",
    locale: "en-IE",
    theme: "system",
    measurement: "metric",
    invoicePolicy:
      "A booking is confirmed once the agreed retainer is received. The remaining balance is due by the date agreed with the florist. Changes and cancellations are subject to the florist’s written terms and applicable consumer law.",
  };
  applyTheme();
  save();
}
logoFile.onchange = (e) => {
  let f = e.target.files[0];
  if (!f) return;
  let r = new FileReader();
  r.onload = () => {
    db.settings.logoData = r.result;
    save();
  };
  r.readAsDataURL(f);
};
function customerOptions() {
  let opts =
    '<option value="">No customer selected</option>' +
    db.customers
      .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
      .join("");
  calcCustomer.innerHTML = orderCustomer.innerHTML = opts;
}
function stockOptions(selected = "") {
  return (
    '<option value="">Choose stock</option>' +
    db.inventory
      .map(
        (i) =>
          `<option value="${i.id}" ${String(i.id) === String(selected) ? "selected" : ""}>${esc(i.name)} (${i.qty} ${esc(i.unit)} · ${money(i.cost)})</option>`,
      )
      .join("")
  );
}
function addCalcLine(itemId = "", qty = 1) {
  let div = document.createElement("div");
  div.className = "lineitem";
  div.innerHTML = `<div><label>Stock item</label><select onchange="calc()">${stockOptions(itemId)}</select></div><div><label>Qty used</label><input type="number" min="0" step="0.1" value="${qty}" oninput="calc()"></div><button class="danger" onclick="this.parentElement.remove();calc()">Remove</button>`;
  calcItems.appendChild(div);
  calc();
}
function getCalcStock() {
  return [...calcItems.querySelectorAll(".lineitem")]
    .map((row) => {
      let id = +row.querySelector("select").value,
        qty = +row.querySelector("input").value || 0,
        item = db.inventory.find((i) => i.id === id);
      return item && qty
        ? {
            id,
            name: item.name,
            qty,
            unit: item.unit,
            cost: +item.cost || 0,
            total: qty * (+item.cost || 0),
          }
        : null;
    })
    .filter(Boolean);
}
function calc() {
  let stock = getCalcStock(),
    stockCost = stock.reduce((a, i) => a + i.total, 0),
    base = stockCost + val("labour") + val("supplies"),
    price = base * (1 + val("markup") / 100) + val("fees"),
    profit = price - base;
  cStock.textContent = money(stockCost);
  cPrice.textContent = money(price);
  cProfit.textContent = money(profit);
  return { stock, stockCost, base, price, profit };
}
["labour", "supplies", "markup", "fees"].forEach((id) =>
  setTimeout(() => $(id).addEventListener("input", calc), 0),
);
function reserveStock(stock) {
  stock.forEach((s) => {
    let item = db.inventory.find((i) => i.id === s.id);
    if (item) item.qty = Math.max(0, (+item.qty || 0) - (+s.qty || 0));
  });
}
function orderStatus(o) {
  if (o.manualStatus === "Done" || o.manualStatus === "Not done")
    return o.manualStatus;
  return (o.date || today()) < today() ? "Done" : "Not done";
}
function saveCalcAsOrder() {
  let c = calc();
  let customer = db.customers.find(
    (x) => String(x.id) === String(calcCustomer.value),
  );
  let order = {
    id: Date.now(),
    name: calcName.value || "Bouquet order",
    date: calcDate.value || today(),
    price: c.price,
    cost: c.base,
    customerId: calcCustomer.value || "",
    customerName: customer ? customer.name : "",
    notes: calcNotes.value,
    stockUsed: c.stock,
    fromCalculator: true,
    depositPaid: false,
    depositAmount: 0,
    startTime: "",
    endTime: "",
    location: "",
  };
  reserveStock(c.stock);
  db.orders.push(order);
  save();
  alert("Saved as order and connected to stock.");
}
function clearCalc() {
  calcName.value = calcNotes.value = "";
  calcItems.innerHTML = "";
  ["labour", "supplies", "fees"].forEach((id) => ($(id).value = 0));
  markup.value = 100;
  addCalcLine();
  calc();
}
function addManualOrder() {
  let customer = db.customers.find(
      (x) => String(x.id) === String(orderCustomer.value),
    ),
    deposit = Math.min(val("orderDepositAmount"), val("orderPrice"));
  db.orders.push({
    id: Date.now(),
    name: orderName.value || "Order",
    date: orderDate.value || today(),
    price: val("orderPrice"),
    cost: val("orderCost"),
    customerId: orderCustomer.value || "",
    customerName: customer ? customer.name : "",
    manualStatus: orderStatus.value === "Auto by date" ? "" : orderStatus.value,
    notes: orderNotes.value,
    stockUsed: [],
    depositPaid: orderDepositPaid.checked,
    depositAmount: deposit,
    startTime: orderStartTime.value || "",
    endTime: orderEndTime.value || "",
    location: orderLocation.value.trim(),
  });
  orderName.value =
    orderPrice.value =
    orderCost.value =
    orderNotes.value =
    orderDepositAmount.value =
    orderStartTime.value =
    orderEndTime.value =
    orderLocation.value =
      "";
  orderDepositPaid.checked = false;
  save();
}
function addInventory() {
  db.inventory.push({
    id: Date.now(),
    name: iName.value || "Stock item",
    cat: iCat.value,
    qty: val("iQty"),
    unit: iUnit.value || "items",
    cost: val("iCost"),
    min: val("iMin"),
  });
  iName.value = iQty.value = iUnit.value = iCost.value = iMin.value = "";
  save();
}
function adjInv(id, n) {
  let i = db.inventory.find((x) => x.id === id);
  if (i) i.qty = Math.max(0, (+i.qty || 0) + n);
  save();
}
function addExpense() {
  db.expenses.push({
    id: Date.now(),
    name: eName.value || "Expense",
    date: eDate.value || today(),
    amount: val("eAmount"),
    cat: eCat.value,
  });
  eName.value = eAmount.value = "";
  save();
}
function addCustomer() {
  db.customers.push({
    id: Date.now(),
    name: cuName.value || "Customer",
    phone: cuPhone.value,
    email: cuEmail.value,
    pref: cuPref.value,
    notes: cuNotes.value,
  });
  cuName.value =
    cuPhone.value =
    cuEmail.value =
    cuPref.value =
    cuNotes.value =
      "";
  save();
}
function addInvoice() {
  let total = val("invAmount"),
    deposit = Math.min(val("invDepositAmount"), total);
  db.invoices.push({
    id: Date.now(),
    customer: invCustomer.value || "Customer",
    date: invDate.value || today(),
    item: invItem.value || "Bouquet",
    amount: total,
    depositAmount: deposit,
    depositPaid: invDepositPaid.checked,
    status: invStatus.value,
    orderId: "",
  });
  invCustomer.value =
    invItem.value =
    invAmount.value =
    invDepositAmount.value =
      "";
  invDepositPaid.checked = false;
  save();
}
function invoiceFromOrder() {
  let o = db.orders.find((x) => String(x.id) === String(invoiceOrder.value));
  if (!o) return alert("Choose an order first.");
  let deposit = Math.min(+o.depositAmount || 0, +o.price || 0),
    balance = Math.max(0, (+o.price || 0) - deposit);
  db.invoices.push({
    id: Date.now(),
    customer: o.customerName || "Customer",
    date: today(),
    item: o.name,
    amount: +o.price || 0,
    depositAmount: deposit,
    depositPaid: !!o.depositPaid,
    status:
      balance <= 0 && o.depositPaid
        ? "Paid"
        : o.depositPaid && deposit > 0
          ? "Part-paid"
          : "Unpaid",
    orderId: o.id,
  });
  save();
  showPage("invoices");
}
function del(type, id) {
  db[type] = db[type].filter((x) => x.id !== id);
  save();
}
function invoiceHTML(i) {
  let biz = esc(db.settings.businessName),
    user = esc(db.settings.businessUser),
    logo = db.settings.logoData || DEFAULT_LOGO,
    deposit = Math.min(+i.depositAmount || 0, +i.amount || 0),
    balance = Math.max(0, (+i.amount || 0) - deposit),
    policy = esc(db.settings.invoicePolicy || "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice</title><style>:root{--ink:#241d19;--muted:#756b63;--line:#eadfd5;--blush:#f7e6e5;--sage:#eaf1e8}*{box-sizing:border-box}body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:linear-gradient(145deg,#fbf7f1,#fff);color:var(--ink);margin:0;padding:24px}.invoice{max-width:840px;margin:auto;background:white;border:1px solid var(--line);border-radius:30px;padding:38px;box-shadow:0 24px 70px rgba(57,42,32,.10)}.top{display:flex;justify-content:space-between;gap:22px;border-bottom:1px solid var(--line);padding-bottom:22px}.brand{display:flex;gap:16px;align-items:center}.brand img{width:86px;height:86px;object-fit:contain;border-radius:22px}.brand h1{margin:0 0 6px;font-family:Georgia,serif;font-size:32px}.muted{color:var(--muted)}.box{border:1px solid var(--line);border-radius:20px;padding:18px;margin:20px 0;background:#fffdf9}table{width:100%;border-collapse:collapse}td,th{padding:15px;border-bottom:1px solid var(--line);text-align:left}.money{text-align:right}.payment-summary{margin:22px 0 0 auto;max-width:390px;border:1px solid var(--line);border-radius:22px;overflow:hidden}.payment-row{display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--line)}.payment-row:last-child{border:0;background:var(--blush);font-size:20px;font-weight:900}.paid{display:inline-block;padding:6px 10px;border-radius:999px;background:var(--sage);font-weight:800}.unpaid{background:#fff2ec}.policy{margin-top:28px;padding:18px;border-left:4px solid #b99861;background:#fffaf3;border-radius:0 16px 16px 0;font-size:13px;line-height:1.55}.actions{text-align:center;margin:18px}.actions button{border:0;border-radius:999px;padding:12px 18px;font-weight:800}@media(max-width:650px){body{padding:0}.invoice{margin:0;border-radius:0;padding:24px}.top{display:block}.top>div:last-child{margin-top:18px}.brand h1{font-size:27px}}@media print{body{background:white;padding:0}.actions{display:none}.invoice{border:0;margin:0;box-shadow:none}}</style></head><body><div class="invoice"><div class="top"><div class="brand"><img src="${logo}"><div><h1>${biz}</h1><div class="muted">${user}</div></div></div><div><b>Invoice #${String(i.id).slice(-6)}</b><br>Date: ${esc(i.date)}<br>Status: <span class="paid ${i.status === "Paid" ? "" : "unpaid"}">${esc(i.status)}</span></div></div><div class="box"><b>Bill to</b><p>${esc(i.customer)}</p></div><table><thead><tr><th>Description</th><th class="money">Amount</th></tr></thead><tbody><tr><td>${esc(i.item)}</td><td class="money">${money(i.amount)}</td></tr></tbody></table><div class="payment-summary"><div class="payment-row"><span>Order total</span><b>${money(i.amount)}</b></div><div class="payment-row"><span>Retainer / deposit ${i.depositPaid ? "received" : "recorded"}</span><b>− ${money(deposit)}</b></div><div class="payment-row"><span>Balance due</span><span>${money(balance)}</span></div></div>${policy ? `<div class="policy"><b>Booking & payment policy</b><br>${policy}</div>` : ""}<p class="muted">Thank you for supporting a small florist business.</p></div><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div></body></html>`;
}
function previewInvoice(id) {
  let i = db.invoices.find((x) => x.id === id);
  if (!i) return;
  let deposit = Math.min(+i.depositAmount || 0, +i.amount || 0),
    balance = Math.max(0, (+i.amount || 0) - deposit);
  invoicePreview.innerHTML = `<div class="preview-sheet"><div class="preview-brand"><img class="invoice-mini-logo" src="${db.settings.logoData || DEFAULT_LOGO}"><div><b>${esc(db.settings.businessName)}</b><small>${esc(db.settings.businessUser)}</small></div></div><hr><p><b>Invoice #${String(i.id).slice(-6)}</b><br>${esc(i.date)} · <span class="pill ${i.status === "Paid" ? "done" : "notdone"}">${esc(i.status)}</span></p><p><b>Bill to:</b> ${esc(i.customer)}</p><p><b>${esc(i.item)}</b></p><div class="preview-totals"><span>Total <b>${money(i.amount)}</b></span><span>Deposit <b>${money(deposit)}</b></span><span>Balance <b>${money(balance)}</b></span></div><p class="invoice-policy-preview"><b>Policy:</b> ${esc(db.settings.invoicePolicy)}</p><div class="actions"><button onclick="downloadInvoice(${id})">Download invoice</button><button onclick="printInvoice(${id})">Print / Save PDF</button></div></div>`;
}
function downloadInvoice(id) {
  let i = db.invoices.find((x) => x.id === id);
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([invoiceHTML(i)], { type: "text/html" }),
  );
  a.download = `invoice-${String(i.id).slice(-6)}-${(db.settings.businessName || "florist").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
function printInvoice(id) {
  let i = db.invoices.find((x) => x.id === id);
  let w = window.open("", "_blank");
  w.document.write(invoiceHTML(i));
  w.document.close();
  setTimeout(() => w.print(), 350);
}
function drawBar(id, labels, values, title) {
  let c = $(id),
    ctx = c.getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    w = c.clientWidth * dpr,
    h = 260 * dpr;
  c.width = w;
  c.height = h;
  ctx.scale(dpr, dpr);
  let W = c.clientWidth,
    H = 260;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#251d18";
  ctx.font = "bold 15px Arial";
  ctx.fillText(title, 16, 24);
  let max = Math.max(1, ...values),
    barW = (W - 48) / Math.max(1, values.length);
  values.forEach((v, i) => {
    let bh = (v / max) * (H - 78),
      x = 24 + i * barW,
      y = H - 34 - bh;
    ctx.fillStyle = i % 2 ? "#eaf1e8" : "#f7e6e5";
    ctx.fillRect(x, y, Math.max(10, barW - 10), bh);
    ctx.fillStyle = "#251d18";
    ctx.font = "11px Arial";
    ctx.fillText(labels[i], x, H - 12);
    ctx.fillText(money(v), x, y - 5);
  });
}
function drawLine(id, labels, values, title) {
  let c = $(id),
    ctx = c.getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    w = c.clientWidth * dpr,
    h = 260 * dpr;
  c.width = w;
  c.height = h;
  ctx.scale(dpr, dpr);
  let W = c.clientWidth,
    H = 260;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#251d18";
  ctx.font = "bold 15px Arial";
  ctx.fillText(title, 16, 24);
  let max = Math.max(1, ...values),
    pts = values.map((v, i) => [
      30 + (i * (W - 60)) / Math.max(1, values.length - 1),
      H - 38 - (v / max) * (H - 78),
    ]);
  ctx.strokeStyle = "#2c241f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.stroke();
  pts.forEach((p, i) => {
    ctx.fillStyle = "#f7e6e5";
    ctx.beginPath();
    ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#251d18";
    ctx.font = "11px Arial";
    ctx.fillText(labels[i], p[0] - 12, H - 12);
    ctx.fillText(money(values[i]), p[0] - 20, p[1] - 10);
  });
}
function downloadChart(id, name) {
  let a = document.createElement("a");
  a.href = $(id).toDataURL("image/png");
  a.download = name + ".png";
  a.click();
}
function generateIdea() {
  let theme = (ideaTheme.value || "seasonal bouquet").trim(),
    type = ideaType.value;
  ideaOutput.innerHTML = `<b>${type} idea:</b> ${theme} from loose stems to finished bouquet.<br><br><b>Hook:</b> Watch me turn ${esc(theme)} into a dreamy floral moment 🌸<br><br><b>Shot list:</b> flower delivery → stem prep → colour palette → arranging → wrapping → final reveal.<br><br><b>Caption:</b> A little behind the scenes of today’s ${esc(theme)} design. Every stem is chosen with care.`;
}
function render() {
  normalize();
  applyTheme();
  const savedLogo = db.settings.logoData || DEFAULT_LOGO;
  const uiLogo = savedLogo === DEFAULT_LOGO ? DEFAULT_UI_LOGO : savedLogo;
  [topLogo, footerLogo].forEach((image) => {
    image.onerror = () => {
      image.onerror = null;
      image.src = DEFAULT_UI_LOGO;
    };
    image.src = uiLogo;
  });
  topName.textContent = db.settings.businessName;
  if ($("topLabel")) {
    const identity = db.settings.businessUser || "Independent florist";
    topLabel.textContent = `${identity} · plan beautifully, price confidently, deliver calmly`;
  }
  businessName.value = db.settings.businessName;
  businessUser.value = db.settings.businessUser;
  currencySetting.value = db.settings.currency;
  localeSetting.value = db.settings.locale;
  themeSetting.value = db.settings.theme;
  measurementSetting.value = db.settings.measurement;
  invoicePolicy.value = db.settings.invoicePolicy;
  customerOptions();
  calcItems.querySelectorAll("select").forEach((s) => {
    let v = s.value;
    s.innerHTML = stockOptions(v);
  });
  let sales = db.orders.reduce((a, o) => a + (+o.price || 0), 0),
    costs = db.orders.reduce((a, o) => a + (+o.cost || 0), 0),
    exp = db.expenses.reduce((a, e) => a + (+e.amount || 0), 0),
    doneProfit = db.orders
      .filter((o) => orderStatus(o) === "Done")
      .reduce((a, o) => a + (+o.price || 0) - (+o.cost || 0), 0),
    projected = db.orders.reduce(
      (a, o) => a + (+o.price || 0) - (+o.cost || 0),
      0,
    );
  sSales.textContent = money(sales);
  sProfit.textContent = money(doneProfit - exp);
  sProjected.textContent = money(projected - exp);
  let low = db.inventory.filter((i) => (+i.qty || 0) <= (+i.min || 0));
  lowStock.innerHTML = low.length
    ? low
        .map(
          (i) =>
            `<p><span class="pill low">${esc(i.name)}: ${i.qty} ${esc(i.unit)}</span></p>`,
        )
        .join("")
    : '<p class="mini">No low stock alerts.</p>';
  let weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  let weekEndText = weekEnd.toISOString().slice(0, 10),
    upcoming = db.orders
      .filter(
        (o) =>
          (o.date || "") >= today() &&
          (o.date || "") <= weekEndText &&
          orderStatus(o) !== "Done",
      )
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  dashboardUpcoming.innerHTML = upcoming.length
    ? upcoming
        .slice(0, 5)
        .map(
          (o) =>
            `<button class="dashboard-row" onclick="showPage('orders')"><span><b>${esc(o.name)}</b><small>${esc(o.customerName || "No client")}</small></span><time>${formatDate(o.date)}</time></button>`,
        )
        .join("")
    : '<div class="empty-state">No orders due in the next seven days. A calm week for creating. 🌿</div>';
  let outstanding = db.invoices
      .filter((i) => i.status !== "Paid")
      .reduce(
        (a, i) => a + Math.max(0, (+i.amount || 0) - (+i.depositAmount || 0)),
        0,
      ),
    openInvoices = db.invoices.filter((i) => i.status !== "Paid").length;
  dashboardOutstanding.textContent = money(outstanding);
  dashboardPaymentNote.textContent = openInvoices
    ? `${openInvoices} invoice${openInvoices === 1 ? "" : "s"} still open.`
    : "No outstanding invoices.";
  storageSummary.textContent = db.meta.updatedAt
    ? `Last saved ${new Date(db.meta.updatedAt).toLocaleString(db.settings.locale || undefined)} · ${db.orders.length} orders · ${db.customers.length} clients`
    : "Autosave is ready on this device.";
  let stockTxt = (o) =>
      (o.stockUsed || [])
        .map((s) => `${s.qty} ${s.unit} ${s.name}`)
        .join("<br>") || "—",
    depositTxt = (o) =>
      o.depositPaid
        ? `<span class="pill done">Paid ${money(o.depositAmount)}</span>`
        : `<span class="pill notdone">Not paid${+o.depositAmount || 0 ? " · " + money(o.depositAmount) : ""}</span>`,
    balance = (o) => Math.max(0, (+o.price || 0) - (+o.depositAmount || 0));
  ordersBody.innerHTML = db.orders
    .map(
      (o) =>
        `<tr><td>${o.date}</td><td>${esc(o.name)}<br><small>${esc(o.notes)}</small></td><td>${esc(o.customerName)}</td><td><span class="pill ${orderStatus(o) === "Done" ? "done" : "notdone"}">${orderStatus(o)}</span></td><td>${depositTxt(o)}</td><td>${money(balance(o))}</td><td>${money((+o.price || 0) - (+o.cost || 0))}</td><td>${stockTxt(o)}</td><td><button onclick="invoiceOrder.value='${o.id}';invoiceFromOrder()">Invoice</button> <button onclick="openGoogleCalendar(${o.id})">Google</button> <button onclick="downloadOrderICS(${o.id})">.ics</button> <button class="danger" onclick="del('orders',${o.id})">Delete</button></td></tr>`,
    )
    .join("");
  ordersCards.innerHTML = db.orders
    .map(
      (o) =>
        `<div class="mobile-card"><div class="mobile-card-head"><b>${esc(o.name)}</b>${depositTxt(o)}</div><p>${o.date} · ${esc(o.customerName)} · <span class="pill ${orderStatus(o) === "Done" ? "done" : "notdone"}">${orderStatus(o)}</span></p><div class="mini-metrics"><span>Sale <b>${money(o.price)}</b></span><span>Balance <b>${money(balance(o))}</b></span><span>Profit <b>${money((+o.price || 0) - (+o.cost || 0))}</b></span></div><p class="mini">Stock: ${stockTxt(o)}</p><button onclick="invoiceOrder.value='${o.id}';invoiceFromOrder()">Create invoice</button> <button onclick="openGoogleCalendar(${o.id})">Google</button> <button onclick="downloadOrderICS(${o.id})">Apple / .ics</button> <button class="danger" onclick="del('orders',${o.id})">Delete</button></div>`,
    )
    .join("");
  inventoryBody.innerHTML = db.inventory
    .map(
      (i) =>
        `<tr><td>${esc(i.name)}</td><td>${esc(i.cat)}</td><td><span class="pill ${+i.qty <= +i.min ? "low" : ""}">${i.qty} ${esc(i.unit)}</span></td><td>${money(i.cost)}</td><td>${money((+i.qty || 0) * (+i.cost || 0))}</td><td><button onclick="adjInv(${i.id},-1)">-</button> <button onclick="adjInv(${i.id},1)">+</button> <button class="danger" onclick="del('inventory',${i.id})">Delete</button></td></tr>`,
    )
    .join("");
  inventoryCards.innerHTML = db.inventory
    .map(
      (i) =>
        `<div class="mobile-card"><b>${esc(i.name)}</b><p>${esc(i.cat)} · <span class="pill ${+i.qty <= +i.min ? "low" : ""}">${i.qty} ${esc(i.unit)}</span></p><p>Cost ${money(i.cost)} · Value <b>${money((+i.qty || 0) * (+i.cost || 0))}</b></p><button onclick="adjInv(${i.id},-1)">-</button> <button onclick="adjInv(${i.id},1)">+</button> <button class="danger" onclick="del('inventory',${i.id})">Delete</button></div>`,
    )
    .join("");
  expensesBody.innerHTML = db.expenses
    .map(
      (e) =>
        `<tr><td>${e.date}</td><td>${esc(e.name)}</td><td>${esc(e.cat)}</td><td>${money(e.amount)}</td><td><button class="danger" onclick="del('expenses',${e.id})">Delete</button></td></tr>`,
    )
    .join("");
  expensesCards.innerHTML = db.expenses
    .map(
      (e) =>
        `<div class="mobile-card"><b>${esc(e.name)}</b><p>${e.date} · ${esc(e.cat)}</p><p>${money(e.amount)}</p><button class="danger" onclick="del('expenses',${e.id})">Delete</button></div>`,
    )
    .join("");
  let sorted = [...db.orders].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  renderCalendar();
  calendarBody.innerHTML = sorted
    .map(
      (o) =>
        `<tr><td><b>${formatDate(o.date)}</b><br><small>${esc(orderScheduleLabel(o))}</small></td><td>${esc(o.name)}${o.notes ? `<br><small>${esc(o.notes)}</small>` : ""}</td><td>${esc(o.customerName || "—")}</td><td><span class="pill ${orderStatus(o) === "Done" ? "done" : "notdone"}">${orderStatus(o)}</span></td><td>${o.location ? esc(o.location) : "—"}</td><td><div class="calendar-table-actions"><button onclick="openGoogleCalendar(${o.id})">Google</button><button onclick="downloadOrderICS(${o.id})">Apple / .ics</button></div></td><td>${money((+o.price || 0) - (+o.cost || 0))}</td></tr>`,
    )
    .join("");
  calendarCards.innerHTML = sorted
    .map(
      (o) =>
        `<div class="mobile-card calendar-list-card"><div class="mobile-card-head"><b>${formatDate(o.date)}</b><span class="pill ${orderStatus(o) === "Done" ? "done" : "notdone"}">${orderStatus(o)}</span></div><p><b>${esc(o.name)}</b> · ${esc(o.customerName || "No customer")}</p><p>${esc(orderScheduleLabel(o))}${o.location ? ` · 📍 ${esc(o.location)}` : ""}</p><p>Profit ${money((+o.price || 0) - (+o.cost || 0))}</p><div class="actions"><button onclick="openGoogleCalendar(${o.id})">Add to Google</button><button onclick="downloadOrderICS(${o.id})">Apple / .ics</button></div></div>`,
    )
    .join("");
  customersBody.innerHTML = db.customers
    .map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}<br><small>${esc(c.email)}</small></td><td>${esc(c.pref)}</td><td>${esc(c.notes)}</td><td><button class="danger" onclick="del('customers',${c.id})">Delete</button></td></tr>`,
    )
    .join("");
  customersCards.innerHTML = db.customers
    .map(
      (c) =>
        `<div class="mobile-card"><b>${esc(c.name)}</b><p>${esc(c.phone)} ${esc(c.email)}</p><p>${esc(c.pref)}</p><p>${esc(c.notes)}</p><button class="danger" onclick="del('customers',${c.id})">Delete</button></div>`,
    )
    .join("");
  invoiceOrder.innerHTML =
    '<option value="">Choose order</option>' +
    db.orders
      .map(
        (o) =>
          `<option value="${o.id}">${esc(o.name)} · ${money(o.price)}</option>`,
      )
      .join("");
  invoicesBody.innerHTML = db.invoices
    .map((i) => {
      let d = Math.min(+i.depositAmount || 0, +i.amount || 0),
        b = Math.max(0, (+i.amount || 0) - d);
      return `<tr><td>${i.date}</td><td>${esc(i.customer)}</td><td>${esc(i.item)}</td><td>${money(i.amount)}</td><td>${money(d)} ${i.depositPaid ? "✓" : ""}</td><td><b>${money(b)}</b></td><td>${esc(i.status)}</td><td><button onclick="previewInvoice(${i.id})">Preview</button> <button onclick="downloadInvoice(${i.id})">Download</button> <button onclick="printInvoice(${i.id})">PDF</button> <button class="danger" onclick="del('invoices',${i.id})">Delete</button></td></tr>`;
    })
    .join("");
  invoicesCards.innerHTML = db.invoices
    .map((i) => {
      let d = Math.min(+i.depositAmount || 0, +i.amount || 0),
        b = Math.max(0, (+i.amount || 0) - d);
      return `<div class="mobile-card"><div class="mobile-card-head"><b>${esc(i.customer)}</b><span class="pill ${i.status === "Paid" ? "done" : "notdone"}">${esc(i.status)}</span></div><p>${i.date} · ${esc(i.item)}</p><div class="mini-metrics"><span>Total <b>${money(i.amount)}</b></span><span>Deposit <b>${money(d)}</b></span><span>Balance <b>${money(b)}</b></span></div><button onclick="previewInvoice(${i.id})">Preview</button> <button onclick="downloadInvoice(${i.id})">Download</button> <button onclick="printInvoice(${i.id})">PDF</button> <button class="danger" onclick="del('invoices',${i.id})">Delete</button></div>`;
    })
    .join("");
  aAverage.textContent = money(db.orders.length ? sales / db.orders.length : 0);
  aExpenses.textContent = money(exp);
  aUnpaid.textContent = money(
    db.invoices
      .filter((i) => i.status !== "Paid")
      .reduce((a, i) => a + (+i.amount || 0), 0),
  );
  let month = {};
  db.orders.forEach((o) => {
    let m = (o.date || today()).slice(0, 7);
    month[m] = (month[m] || 0) + (+o.price || 0) - (+o.cost || 0);
  });
  let keys = Object.keys(month).sort().slice(-6);
  drawLine(
    "profitChart",
    keys.map((k) => k.slice(5)),
    keys.map((k) => month[k]),
    "Profit by month",
  );
  drawBar(
    "salesExpenseChart",
    ["Sales", "Order costs", "Expenses"],
    [sales, costs, exp],
    "Sales vs expenses",
  );
  let cat = {};
  db.inventory.forEach(
    (i) => (cat[i.cat] = (cat[i.cat] || 0) + (+i.qty || 0) * (+i.cost || 0)),
  );
  drawBar(
    "inventoryChart",
    Object.keys(cat),
    Object.values(cat),
    "Inventory value",
  );
  let done = db.orders.filter((o) => orderStatus(o) === "Done").length,
    not = db.orders.length - done;
  drawBar("statusChart", ["Done", "Not done"], [done, not], "Order count");
  let best = Object.entries(month).sort((a, b) => b[1] - a[1])[0];
  aBest.textContent = best
    ? `Best tracked month: ${best[0]} with ${money(best[1])} profit before expenses.`
    : "Add orders to see best month.";
  aNotes.textContent = `Connected data: ${db.orders.length} orders, ${db.inventory.length} stock items, ${db.customers.length} customers, ${db.invoices.length} invoices and ${db.expenses.length} expenses.`;
}
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  let b = document.querySelector('[onclick="promptInstall()"]');
  if (b) b.textContent = "Install app";
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setSaveStatus("App installed", "saved");
});
async function promptInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }
  let ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  alert(
    ios
      ? "To install: tap Share, then Add to Home Screen."
      : "Open your browser menu and choose Install app or Add to Home Screen.",
  );
}
if ("serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((e) => console.warn("Service worker registration failed", e)),
  );
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (db.settings.theme === "system") applyTheme();
});
setupNav();
calcDate.value = orderDate.value = eDate.value = invDate.value = today();
addCalcLine();
render();
restoreFromIndexedDB();
setSaveStatus("Autosave ready", "saved");

window.addEventListener("hashchange", () => {
  const target = location.hash.slice(1);
  if (pages.some((page) => page[0] === target)) showPage(target);
});
if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) {
  document.documentElement.classList.add("is-installed");
}

// v2.4 interface polish: visual-only enhancements; invoice document markup is unchanged.
// v1.1.0 premium controls polish: improve mobile date behaviour without changing saved data.
(function () {
  function polishDates() {
    document.querySelectorAll('input[type="date"]').forEach(function (el) {
      el.classList.add("fs-date");
      el.setAttribute(
        "aria-label",
        el.getAttribute("aria-label") || "Choose date",
      );
      el.addEventListener("focus", function () {
        el.parentElement && el.parentElement.classList.add("is-editing-date");
      });
      el.addEventListener("blur", function () {
        el.parentElement &&
          el.parentElement.classList.remove("is-editing-date");
      });
    });
  }
  function polishCards() {
    document.querySelectorAll(".card").forEach(function (card, i) {
      card.style.animationDelay = Math.min(i * 18, 180) + "ms";
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () {
      polishDates();
      polishCards();
    });
  else {
    polishDates();
    polishCards();
  }
})();
