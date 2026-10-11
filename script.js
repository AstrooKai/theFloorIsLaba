const $ = (s, r = document) => r.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const peso = (n) =>
  "₱" +
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const iso = (d) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, 0),
    String(d.getDate()).padStart(2, 0),
  ].join("-");
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const today = () => addDays(0);
const fmt = (s) => {
  const [y, m, d] = s.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
const ord = (id) => "ORD-" + String(id).padStart(4, "0");
const pay = (id) => "PAY-" + String(id).padStart(4, "0");
const badge = (t, c) => `<span class="badge ${c}">${esc(t)}</span>`;
const btn = (act, id, label, cls = "") =>
  `<button class="btn sm ${cls}" data-act="${act}" data-id="${id}" type="button">${label}</button>`;
const std = (r, k, extra = "") =>
  `<div class="acts">${extra}${btn("edit", r[k], "Edit")}${btn("del", r[k], "Delete", "btn-danger")}</div>`;
const debounce = (f, ms = 150) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => f(...a), ms);
  };
};
function toast(m, err) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " e" : "");
  t.textContent = m;
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 3500);
}
function ask(title, msg, ok = "Delete") {
  // uses the <dialog id="confirm"> in the HTML
  return new Promise((res) => {
    const d = $("#confirm");
    $("#cT").textContent = title;
    $("#cM").textContent = msg;
    $("#cOk").textContent = ok;
    d.returnValue = "";
    d.onclick = (e) => {
      const b = e.target.closest("button");
      if (b) d.close(b.value);
    };
    d.onclose = () => res(d.returnValue === "1");
    d.showModal();
  });
}
function csv(name, rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(
      [
        rows
          .map((r) =>
            r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
          )
          .join("\r\n"),
      ],
      { type: "text/csv" },
    ),
  );
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============ Data layer ============
 MOCK = true  -> demo data in localStorage (no backend; reset with localStorage.clear()).
 MOCK = false -> JSON endpoints: GET/POST api/<name>.php, PUT/DELETE api/<name>.php?id=
                 (services, payments, deliveries); GET only for orders and riders.
                 Errors: HTTP 4xx/5xx with {"message": "..."}                          */
const MOCK = true,
  KEY = "laba_";
const ID = {
  services: "service_id",
  payments: "payment_id",
  deliveries: "delivery_id",
};
const SEED = {
  orders: [
    {
      order_id: 1001,
      customer_name: "Maria Santos",
      contact: "09171234567",
      address: "Blk 5 Lot 12, Katapatan Mutual Homes, Banay-banay, Cabuyao",
      total: 450,
    },
    {
      order_id: 1002,
      customer_name: "Jose Rizal Jr.",
      contact: "09281112233",
      address: "24 Mabini St., Brgy. Sala, Cabuyao",
      total: 1200,
    },
    {
      order_id: 1003,
      customer_name: "Angelica Dela Cruz",
      contact: "09196543210",
      address: "Unit 3B Casa Verde Apartments, Brgy. Mamatid, Cabuyao",
      total: 780,
    },
    {
      order_id: 1004,
      customer_name: "Ramon Bautista",
      contact: "09054445566",
      address: "17 Sampaguita St., Brgy. Pulo, Cabuyao",
      total: 320,
    },
    {
      order_id: 1005,
      customer_name: "Liza Mendoza",
      contact: "09328889900",
      address: "Phase 2 Blk 9 Lot 4, Greenfield Subd., Brgy. Banlic, Cabuyao",
      total: 960,
    },
    {
      order_id: 1006,
      customer_name: "Carlo Navarro",
      contact: "09175551212",
      address: "88 Rizal Ave., Brgy. Niugan, Cabuyao",
      total: 275,
    },
  ],
  riders: [
    { staff_id: 1, full_name: "Jun Dela Cruz" },
    { staff_id: 2, full_name: "Ana Reyes" },
    { staff_id: 3, full_name: "Paolo Mendoza" },
  ],
  services: [
    {
      service_id: 1,
      service_name: "Regular wash & fold",
      category: "Wash & fold",
      unit: "kg",
      price: 60,
      turnaround_hours: 24,
      status: "Active",
      description: "Machine wash, dry, and fold. Detergent included.",
    },
    {
      service_id: 2,
      service_name: "Express wash & fold",
      category: "Wash & fold",
      unit: "kg",
      price: 95,
      turnaround_hours: 6,
      status: "Active",
      description: "Same day for orders received before noon.",
    },
    {
      service_id: 3,
      service_name: "Wash, dry & iron",
      category: "Ironing",
      unit: "kg",
      price: 85,
      turnaround_hours: 36,
      status: "Active",
      description: "",
    },
    {
      service_id: 4,
      service_name: "Dry cleaning (suit)",
      category: "Dry cleaning",
      unit: "piece",
      price: 350,
      turnaround_hours: 72,
      status: "Active",
      description: "Two-piece suit, cleaned and pressed.",
    },
    {
      service_id: 5,
      service_name: "Comforter / blanket",
      category: "Bedding & bulky",
      unit: "piece",
      price: 220,
      turnaround_hours: 48,
      status: "Active",
      description: "Queen size or smaller.",
    },
    {
      service_id: 6,
      service_name: "Shoe cleaning",
      category: "Specialty",
      unit: "piece",
      price: 180,
      turnaround_hours: 72,
      status: "Inactive",
      description: "Paused while the shoe station is repaired.",
    },
  ],
  payments: [
    {
      payment_id: 1,
      order_id: 1001,
      amount: 450,
      method: "Cash",
      reference_no: "",
      status: "Paid",
      paid_at: addDays(-6),
    },
    {
      payment_id: 2,
      order_id: 1002,
      amount: 600,
      method: "GCash",
      reference_no: "GC8842190011",
      status: "Paid",
      paid_at: addDays(-5),
    },
    {
      payment_id: 3,
      order_id: 1003,
      amount: 780,
      method: "Maya",
      reference_no: "MY55120934",
      status: "Paid",
      paid_at: addDays(-3),
    },
    {
      payment_id: 4,
      order_id: 1005,
      amount: 500,
      method: "GCash",
      reference_no: "GC8851200987",
      status: "Pending",
      paid_at: addDays(-1),
    },
    {
      payment_id: 5,
      order_id: 1006,
      amount: 275,
      method: "Card",
      reference_no: "CARD-77120",
      status: "Refunded",
      paid_at: addDays(-1),
    },
    {
      payment_id: 6,
      order_id: 1002,
      amount: 300,
      method: "Cash",
      reference_no: "",
      status: "Paid",
      paid_at: today(),
    },
  ],
  deliveries: [
    {
      delivery_id: 1,
      order_id: 1001,
      type: "Pickup",
      address: "Blk 5 Lot 12, Katapatan Mutual Homes, Banay-banay, Cabuyao",
      contact: "09171234567",
      scheduled_date: addDays(-1),
      time_slot: "10:00 AM–12:00 PM",
      rider: "Jun Dela Cruz",
      fee: 0,
      status: "Completed",
      notes: "",
    },
    {
      delivery_id: 2,
      order_id: 1002,
      type: "Delivery",
      address: "24 Mabini St., Brgy. Sala, Cabuyao",
      contact: "09281112233",
      scheduled_date: today(),
      time_slot: "8:00–10:00 AM",
      rider: "Ana Reyes",
      fee: 50,
      status: "On the way",
      notes: "Call at the gate.",
    },
    {
      delivery_id: 3,
      order_id: 1003,
      type: "Delivery",
      address: "Unit 3B Casa Verde Apartments, Brgy. Mamatid, Cabuyao",
      contact: "09196543210",
      scheduled_date: today(),
      time_slot: "1:00–3:00 PM",
      rider: "Jun Dela Cruz",
      fee: 50,
      status: "Scheduled",
      notes: "Leave with the guard if no answer.",
    },
    {
      delivery_id: 4,
      order_id: 1005,
      type: "Pickup",
      address: "Phase 2 Blk 9 Lot 4, Greenfield Subd., Brgy. Banlic, Cabuyao",
      contact: "09328889900",
      scheduled_date: today(),
      time_slot: "3:00–5:00 PM",
      rider: "",
      fee: 0,
      status: "Scheduled",
      notes: "",
    },
    {
      delivery_id: 5,
      order_id: 1004,
      type: "Delivery",
      address: "17 Sampaguita St., Brgy. Pulo, Cabuyao",
      contact: "09054445566",
      scheduled_date: addDays(1),
      time_slot: "10:00 AM–12:00 PM",
      rider: "Ana Reyes",
      fee: 50,
      status: "Scheduled",
      notes: "",
    },
    {
      delivery_id: 6,
      order_id: 1006,
      type: "Pickup",
      address: "88 Rizal Ave., Brgy. Niugan, Cabuyao",
      contact: "09175551212",
      scheduled_date: addDays(-2),
      time_slot: "1:00–3:00 PM",
      rider: "Jun Dela Cruz",
      fee: 0,
      status: "Cancelled",
      notes: "Customer rebooked.",
    },
  ],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load = (n) => {
  const v = localStorage.getItem(KEY + n);
  if (v) return JSON.parse(v);
  localStorage.setItem(KEY + n, JSON.stringify(SEED[n]));
  return JSON.parse(JSON.stringify(SEED[n]));
};
async function http(path, opt) {
  const r = await fetch("api/" + path, {
    headers: { "Content-Type": "application/json" },
    ...opt,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "Request failed (" + r.status + ")");
  return d;
}
const db = {
  async list(n) {
    if (!MOCK) return http(n + ".php");
    await sleep(100);
    return load(n);
  },
  async save(n, id, d) {
    if (!MOCK)
      return id
        ? http(`${n}.php?id=${id}`, { method: "PUT", body: JSON.stringify(d) })
        : http(n + ".php", { method: "POST", body: JSON.stringify(d) });
    await sleep(100);
    const rows = load(n),
      k = ID[n];
    if (id) {
      const i = rows.findIndex((r) => r[k] == id);
      rows[i] = { ...rows[i], ...d, [k]: rows[i][k] };
    } else
      rows.push({ ...d, [k]: rows.reduce((m, r) => Math.max(m, r[k]), 0) + 1 });
    localStorage.setItem(KEY + n, JSON.stringify(rows));
  },
  async del(n, id) {
    if (!MOCK) return http(`${n}.php?id=${id}`, { method: "DELETE" });
    await sleep(100);
    localStorage.setItem(
      KEY + n,
      JSON.stringify(load(n).filter((r) => r[ID[n]] != id)),
    );
  },
};

/* ============ Page state ============ */
const cur = document.body.dataset.page; // "services" | "payments" | "deliveries"
const M = $("#view").dataset; // data-one, data-noun set in the HTML
const S = { rows: [], orders: [], riders: [] };
let EDIT = null,
  feeTouched = false;
const orderOf = (id) => S.orders.find((o) => o.order_id == id) || {};
const nameOf = (r) => orderOf(r.order_id).customer_name || "Unknown customer";
const flt = () =>
  Object.fromEntries(
    [...document.querySelectorAll("[data-flt]")].map((i) => [
      i.dataset.flt,
      i.value.trim().toLowerCase(),
    ]),
  );
const slots = () =>
  [...$("#f_time_slot").options].map((o) => o.value).filter(Boolean);

/* ============ Generic CRUD ============ */
function fillSelects() {
  // <select data-fill="orders | orders-total | riders">
  document.querySelectorAll("select[data-fill]").forEach((sel) => {
    const k = sel.dataset.fill;
    const opts =
      k === "riders"
        ? S.riders.map((r) => [r.full_name, r.full_name])
        : S.orders.map((o) => [
            o.order_id,
            `${ord(o.order_id)} – ${o.customer_name}${k === "orders-total" ? ` (${peso(o.total)})` : ""}`,
          ]);
    sel.insertAdjacentHTML(
      "beforeend",
      opts
        .map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`)
        .join(""),
    );
  });
}
async function init(first) {
  try {
    S.rows = await db.list(ENT[cur].name);
    if (first) {
      [S.orders, S.riders] = await Promise.all([
        db.list("orders"),
        db.list("riders"),
      ]);
      fillSelects();
    }
    $("#banner").hidden = true;
    draw();
  } catch (err) {
    $("#bannerMsg").textContent = "Couldn't load data. " + err.message;
    $("#banner").hidden = false;
  }
}
function draw() {
  const e = ENT[cur],
    list = e.filter(S.rows, flt());
  $("#count").textContent =
    `Showing ${list.length} of ${S.rows.length} ${M.noun}`;
  if (e.stats) {
    const st = e.stats(list);
    document
      .querySelectorAll("[data-stat]")
      .forEach((el) => (el.textContent = st[el.dataset.stat]));
  }
  $("#out").innerHTML = e.draw(list);
  $("#list").hidden = !list.length;
  $("#emptyNone").hidden = S.rows.length > 0;
  $("#emptyFilt").hidden = !(S.rows.length && !list.length);
}
function setErrors(errs) {
  document.querySelectorAll("#form .field").forEach((f) => {
    const m = errs[f.dataset.f];
    f.classList.toggle("invalid", !!m);
    $(".err", f).textContent = m || "";
    f.querySelectorAll("input,select,textarea").forEach((i) =>
      i.setAttribute("aria-invalid", !!m),
    );
  });
  const first = $(
    "#form .field.invalid input, #form .field.invalid select, #form .field.invalid textarea",
  );
  if (first) first.focus();
  return !Object.keys(errs).length;
}
function openForm(row) {
  const e = ENT[cur],
    f = $("#form");
  EDIT = row || null;
  feeTouched = !!row;
  f.reset();
  setErrors({});
  $("#dlgT").textContent = row ? "Edit " + M.one : $("#addBtn").textContent;
  $("#save").textContent = row ? "Save changes" : "Save " + M.one;
  f.querySelectorAll("[data-lock]").forEach((i) => (i.disabled = !!row)); // order can't change when editing
  if (row)
    Object.entries(row).forEach(([k, v]) => {
      if (f.elements[k]) f.elements[k].value = v ?? "";
    });
  else if (e.defaults)
    Object.entries(e.defaults()).forEach(([k, v]) => (f.elements[k].value = v));
  e.init && e.init(f);
  $("#dlg").showModal();
  (
    f.querySelector(row ? "input:not(:disabled),textarea" : "select,input") || f
  ).focus();
}
async function patch(r, ch, msg) {
  await db.save(ENT[cur].name, r[ENT[cur].id], { ...r, ...ch });
  toast(msg);
  await init();
}

/* ============ Page logic ============ */
// money already committed to an order (Paid + Pending), ignoring the payment being edited
const balance = (oid) =>
  Math.round(
    (orderOf(oid).total -
      S.rows
        .filter(
          (p) =>
            p.order_id == oid &&
            p.status !== "Refunded" &&
            p.payment_id != EDIT?.payment_id,
        )
        .reduce((s, p) => s + Number(p.amount), 0)) *
      100,
  ) / 100;
const hrs = (h) =>
  h < 24
    ? `${h} hr${h === 1 ? "" : "s"}`
    : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"}`;

const ENT = {
  /* ---------- SERVICES ---------- */
  services: {
    name: "services",
    id: "service_id",
    filter: (rows, f) =>
      rows
        .filter(
          (r) =>
            (!f.q ||
              (r.service_name + " " + r.description)
                .toLowerCase()
                .includes(f.q)) &&
            (!f.cat || r.category.toLowerCase() === f.cat) &&
            (!f.st || r.status.toLowerCase() === f.st),
        )
        .sort((a, b) =>
          f.sort === "price: low to high"
            ? a.price - b.price
            : f.sort === "price: high to low"
              ? b.price - a.price
              : f.sort === "fastest turnaround"
                ? a.turnaround_hours - b.turnaround_hours
                : a.service_name.localeCompare(b.service_name),
        ),
    draw: (list) =>
      list
        .map(
          (r) => `<tr>
      <td><strong>${esc(r.service_name)}</strong>${r.description ? `<span class="sub">${esc(r.description)}</span>` : ""}</td><td>${esc(r.category)}</td>
      <td class="num">${peso(r.price)}<span class="sub">per ${esc(r.unit)}</span></td><td class="num">${hrs(r.turnaround_hours)}</td>
      <td>${badge(r.status, r.status === "Active" ? "ok" : "mute")}</td><td>${std(r, "service_id")}</td></tr>`,
        )
        .join(""),
    validate(d) {
      const e = {},
        n = d.service_name.trim(),
        p = Number(d.price),
        t = Number(d.turnaround_hours);
      if (!n) e.service_name = "Enter a service name.";
      else if (n.length < 3) e.service_name = "Use 3 to 60 characters.";
      else if (
        S.rows.some(
          (r) =>
            r.service_id != EDIT?.service_id &&
            r.service_name.toLowerCase() === n.toLowerCase(),
        )
      )
        e.service_name = "A service with this name already exists.";
      if (!d.category) e.category = "Choose a category.";
      if (d.price === "" || isNaN(p)) e.price = "Enter a price.";
      else if (p <= 0) e.price = "Price must be more than ₱0.";
      else if (p > 10000) e.price = "Price can't be more than ₱10,000.";
      if (!Number.isInteger(t) || t < 1 || t > 240)
        e.turnaround_hours = "Enter whole hours from 1 to 240.";
      if (d.description.length > 200)
        e.description = "Keep the description under 200 characters.";
      return e;
    },
    payload: (d) => ({
      service_name: d.service_name.trim(),
      category: d.category,
      unit: d.unit,
      price: +d.price,
      turnaround_hours: +d.turnaround_hours,
      status: d.status,
      description: d.description.trim(),
    }),
    delMsg: (r) =>
      `"${r.service_name}" will be removed from the price list. Past orders keep their records.`,
  },

  /* ---------- PAYMENTS ---------- */
  payments: {
    name: "payments",
    id: "payment_id",
    defaults: () => ({ paid_at: today() }),
    init: (f) => {
      f.elements.paid_at.max = today();
      ENT.payments.change({ target: f.elements.method });
      ENT.payments.change({ target: f.elements.order_id }, false);
    },
    change(e, prefill = true) {
      const f = $("#form");
      if (e.target.name === "method") {
        const need = e.target.value && e.target.value !== "Cash";
        $("#refStar").hidden = !need;
        $("#h_reference_no").textContent = need
          ? "Copy it from the e-wallet or card receipt."
          : "Not needed for cash.";
      }
      if (e.target.name === "order_id") {
        const id = EDIT ? EDIT.order_id : e.target.value,
          h = $("#h_order_id");
        if (!id) return void (h.textContent = "");
        const b = balance(id);
        h.textContent =
          b > 0
            ? `Balance due: ${peso(b)}`
            : "This order is already fully paid.";
        if (prefill && b > 0 && !f.elements.amount.value)
          f.elements.amount.value = b.toFixed(2);
      }
    },
    filter: (rows, f) =>
      rows
        .filter(
          (p) =>
            (!f.q ||
              `${nameOf(p)} ${ord(p.order_id)} ${p.order_id} ${p.reference_no}`
                .toLowerCase()
                .includes(f.q)) &&
            (!f.m || p.method.toLowerCase() === f.m) &&
            (!f.st || p.status.toLowerCase() === f.st) &&
            (!f.from || p.paid_at >= f.from) &&
            (!f.to || p.paid_at <= f.to),
        )
        .sort(
          (a, b) =>
            b.paid_at.localeCompare(a.paid_at) || b.payment_id - a.payment_id,
        ),
    stats: (list) =>
      Object.fromEntries(
        ["Paid", "Pending", "Refunded"].map((s) => [
          s,
          peso(
            list
              .filter((p) => p.status === s)
              .reduce((n, p) => n + Number(p.amount), 0),
          ),
        ]),
      ),
    draw: (list) =>
      list
        .map(
          (p) => `<tr>
      <td><strong>${pay(p.payment_id)}</strong>${p.reference_no ? `<span class="sub">Ref ${esc(p.reference_no)}</span>` : ""}</td>
      <td><strong>${ord(p.order_id)}</strong><span class="sub">${esc(nameOf(p))}</span></td><td>${esc(p.method)}</td><td>${fmt(p.paid_at)}</td>
      <td class="num"><strong>${peso(p.amount)}</strong></td><td>${badge(p.status, { Paid: "ok", Pending: "warn", Refunded: "mute" }[p.status])}</td>
      <td>${std(p, "payment_id", p.status === "Pending" ? btn("paid", p.payment_id, "Mark paid") : "")}</td></tr>`,
        )
        .join(""),
    validate(d) {
      const e = {},
        oid = EDIT ? EDIT.order_id : d.order_id,
        a = Number(d.amount),
        ref = d.reference_no.trim();
      if (!oid) e.order_id = "Choose the order this payment is for.";
      if (d.amount === "" || isNaN(a)) e.amount = "Enter the amount paid.";
      else if (a <= 0) e.amount = "Amount must be more than ₱0.";
      else if (oid && d.status !== "Refunded" && a > balance(oid))
        e.amount =
          balance(oid) > 0
            ? `Amount can't be more than the balance of ${peso(balance(oid))}.`
            : "This order is already fully paid.";
      if (!d.method) e.method = "Choose how the customer paid.";
      else if (d.method !== "Cash") {
        if (!ref)
          e.reference_no = "Enter the reference number from the receipt.";
        else if (!/^[A-Za-z0-9-]{6,30}$/.test(ref))
          e.reference_no = "Use 6 to 30 letters, numbers, or dashes.";
      }
      if (!d.paid_at) e.paid_at = "Choose the payment date.";
      else if (d.paid_at > today())
        e.paid_at = "Payment date can't be in the future.";
      return e;
    },
    payload: (d) => ({
      order_id: +d.order_id,
      amount: +d.amount,
      method: d.method,
      reference_no: d.method === "Cash" ? "" : d.reference_no.trim(),
      status: d.status,
      paid_at: d.paid_at,
    }),
    delMsg: (r) =>
      `${pay(r.payment_id)} for ${peso(r.amount)} will be removed and the order's balance will go back up.`,
    act(a, r) {
      if (a === "paid")
        return patch(
          r,
          { status: "Paid" },
          `${pay(r.payment_id)} marked as paid.`,
        );
      if (a === "csv") {
        const l = ENT.payments.filter(S.rows, flt());
        if (!l.length) return toast("Nothing to export with these filters.", 1);
        csv("payments.csv", [
          [
            "Payment",
            "Order",
            "Customer",
            "Method",
            "Reference",
            "Date",
            "Amount",
            "Status",
          ],
          ...l.map((p) => [
            pay(p.payment_id),
            ord(p.order_id),
            nameOf(p),
            p.method,
            p.reference_no,
            p.paid_at,
            Number(p.amount).toFixed(2),
            p.status,
          ]),
        ]);
      }
    },
  },

  /* ---------- PICKUP & DELIVERY ---------- */
  deliveries: {
    name: "deliveries",
    id: "delivery_id",
    defaults: () => ({ scheduled_date: today() }),
    init: (f) => {
      f.elements.scheduled_date.min = EDIT ? "" : today();
      ENT.deliveries.change({ target: f.elements.type[0] });
    },
    change(e) {
      const f = $("#form");
      if (e.target.name === "type") {
        const t = f.elements.type.value;
        $("#addrLbl").innerHTML = `${t} address <span class="req">*</span>`;
        if (!feeTouched)
          f.elements.fee.value = t === "Pickup" ? "0.00" : "50.00";
      }
      if (e.target.name === "fee") feeTouched = true;
      if (e.target.name === "order_id" && e.target.value) {
        // prefill from the customer's record
        const o = orderOf(e.target.value);
        if (!f.elements.contact.value)
          f.elements.contact.value = o.contact || "";
        if (!f.elements.address.value)
          f.elements.address.value = o.address || "";
      }
    },
    filter: (rows, f) =>
      rows
        .filter(
          (r) =>
            (!f.q ||
              `${nameOf(r)} ${ord(r.order_id)} ${r.address} ${r.rider}`
                .toLowerCase()
                .includes(f.q)) &&
            (!f.type || r.type.toLowerCase() === f.type) &&
            (!f.rider || r.rider.toLowerCase() === f.rider) &&
            (!f.st || r.status.toLowerCase() === f.st) &&
            (!f.date || r.scheduled_date === f.date),
        )
        .sort(
          (a, b) =>
            a.scheduled_date.localeCompare(b.scheduled_date) ||
            slots().indexOf(a.time_slot) - slots().indexOf(b.time_slot),
        ),
    stats() {
      // counts ignore the status filter itself
      const all = ENT.deliveries.filter(S.rows, { ...flt(), st: "" });
      return Object.fromEntries(
        ["Scheduled", "On the way", "Completed", "Cancelled"].map((s) => [
          s,
          all.filter((r) => r.status === s).length,
        ]),
      );
    },
    draw(list) {
      const g = {};
      list.forEach((r) => (g[r.scheduled_date] ||= []).push(r));
      const label = (d) =>
        d === today()
          ? "Today"
          : d === addDays(1)
            ? "Tomorrow"
            : d === addDays(-1)
              ? "Yesterday"
              : fmt(d);
      return Object.keys(g)
        .sort()
        .map(
          (d) =>
            `<section class="day"><h2>${label(d)}<small>${fmt(d)}: ${g[d].length} run${g[d].length === 1 ? "" : "s"}</small></h2>${g[
              d
            ]
              .map((r) => {
                const act =
                  r.status === "Scheduled" || r.status === "On the way";
                return `<article class="ticket ${r.status.split(" ")[0]}"><div class="stub"><b>${esc(r.time_slot)}</b><span>${r.type}</span></div><div class="tm">
          <div class="tt"><strong>${esc(nameOf(r))}</strong><span class="tags">${act && r.scheduled_date < today() ? badge("Overdue", "bad") : ""}${badge(r.status, { Scheduled: "warn", "On the way": "info", Completed: "ok", Cancelled: "mute" }[r.status])}</span></div>
          <p class="muted">${esc(r.address)}</p>
          <div class="meta"><span><i>Order</i><b>${ord(r.order_id)}</b></span><span><i>Contact</i><b>${esc(r.contact)}</b></span><span><i>Rider</i><b>${r.rider ? esc(r.rider) : "Not assigned"}</b></span><span><i>Fee</i><b>${+r.fee ? peso(r.fee) : "Free"}</b></span></div>
          ${r.notes ? `<p class="muted">Note: ${esc(r.notes)}</p>` : ""}
          <div class="acts" style="justify-content:flex-start">${r.status === "Scheduled" ? btn("start", r.delivery_id, "Start run", "btn-primary") : r.status === "On the way" ? btn("done", r.delivery_id, "Mark completed", "btn-primary") : ""}
          ${btn("edit", r.delivery_id, "Edit")}${act ? btn("cancel", r.delivery_id, "Cancel run") : ""}${btn("del", r.delivery_id, "Delete", "btn-danger")}</div></div></article>`;
              })
              .join("")}</section>`,
        )
        .join("");
    },
    validate(d) {
      const e = {},
        addr = d.address.trim(),
        ph = d.contact.replace(/[\s-]/g, ""),
        fee = Number(d.fee);
      if (!d.order_id) e.order_id = "Choose the order for this run.";
      if (!addr) e.address = "Enter the address.";
      else if (addr.length < 10)
        e.address = "Add more detail, such as street, barangay, and landmark.";
      if (!ph) e.contact = "Enter a contact number.";
      else if (!/^(09\d{9}|\+639\d{9})$/.test(ph))
        e.contact = "Use a Philippine mobile number like 09171234567.";
      if (!d.scheduled_date) e.scheduled_date = "Choose a date.";
      else if (!EDIT && d.scheduled_date < today())
        e.scheduled_date = "Pick today or a later date.";
      if (!d.time_slot) e.time_slot = "Choose a time window.";
      if (d.fee !== "" && (isNaN(fee) || fee < 0 || fee > 500))
        e.fee = "Fee must be between ₱0 and ₱500.";
      if (d.notes.length > 200) e.notes = "Keep notes under 200 characters.";
      if (
        d.rider &&
        d.scheduled_date &&
        d.time_slot &&
        S.rows.some(
          (r) =>
            r.delivery_id != EDIT?.delivery_id &&
            r.rider === d.rider &&
            r.scheduled_date === d.scheduled_date &&
            r.time_slot === d.time_slot &&
            ["Scheduled", "On the way"].includes(r.status),
        )
      )
        e.rider = `${d.rider} already has a run in that window.`;
      return e;
    },
    payload: (d) => ({
      order_id: +d.order_id,
      type: d.type,
      address: d.address.trim(),
      contact: d.contact.replace(/[\s-]/g, ""),
      scheduled_date: d.scheduled_date,
      time_slot: d.time_slot,
      rider: d.rider,
      fee: d.fee === "" ? 0 : +d.fee,
      status: d.status,
      notes: d.notes.trim(),
    }),
    delMsg: () => "It will be removed from the schedule completely.",
    async act(a, r) {
      if (a === "start")
        return r.rider
          ? patch(r, { status: "On the way" }, "Run started.")
          : toast("Assign a rider before starting this run.", 1);
      if (a === "done")
        return patch(r, { status: "Completed" }, "Run completed.");
      if (
        a === "cancel" &&
        (await ask(
          "Cancel this run?",
          `${nameOf(r)}'s ${r.type.toLowerCase()} will be marked as cancelled. You can reschedule it by editing the run.`,
          "Cancel run",
        ))
      )
        return patch(r, { status: "Cancelled" }, "Run cancelled.");
    },
  },
};

/* ============ Events ============ */
$("#view").addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-act]");
  if (!b) return;
  const e = ENT[cur],
    a = b.dataset.act,
    r = S.rows.find((x) => x[e.id] == b.dataset.id);
  try {
    if (a === "retry") return init(true);
    if (a === "add") return openForm();
    if (a === "clear") {
      document.querySelectorAll("[data-flt]").forEach((i) => (i.value = ""));
      return draw();
    }
    if (a === "edit") return openForm(r);
    if (a === "del") {
      if (await ask("Delete this " + M.one + "?", e.delMsg(r))) {
        await db.del(e.name, r[e.id]);
        toast(M.one[0].toUpperCase() + M.one.slice(1) + " deleted.");
        await init();
      }
      return;
    }
    await e.act(a, r);
  } catch (err) {
    toast(err.message, 1);
  }
});
$("#view").addEventListener(
  "input",
  debounce((ev) => {
    if (ev.target.dataset.flt) draw();
  }),
);
$("#view").addEventListener("change", (ev) => {
  if (ev.target.dataset.flt) draw();
});
$("#cancel").onclick = () => $("#dlg").close();
$("#form").addEventListener(
  "change",
  (ev) => ENT[cur].change && ENT[cur].change(ev),
);
$("#form").addEventListener("input", (ev) => {
  const f = ev.target.closest(".field");
  if (f && f.classList.contains("invalid")) {
    f.classList.remove("invalid");
    $(".err", f).textContent = "";
  }
  if (ev.target.name === "fee" && ENT[cur].change) ENT[cur].change(ev);
});
$("#form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const e = ENT[cur],
    d = Object.fromEntries(new FormData(ev.target));
  ev.target.querySelectorAll("[data-lock]").forEach((i) => {
    if (EDIT) d[i.name] = EDIT[i.name];
  }); // disabled fields aren't submitted
  if (!setErrors(e.validate(d))) return;
  const wasEdit = !!EDIT,
    save = $("#save");
  save.disabled = true;
  try {
    await db.save(e.name, EDIT && EDIT[e.id], e.payload(d));
    $("#dlg").close();
    toast(
      wasEdit
        ? "Changes saved."
        : M.one[0].toUpperCase() + M.one.slice(1) + " saved.",
    );
    await init();
  } catch (err) {
    toast(err.message, 1);
  } finally {
    save.disabled = false;
  }
});

init(true);
