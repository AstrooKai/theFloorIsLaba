const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const iso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const today = () => addDays(0);
const fmt = (s) => { if(!s) return ""; const [y, m, d] = s.split("-"); return new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); };
const ord = (id) => "ORD-" + String(id).padStart(4, "0");
const pay = (id) => "PAY-" + String(id).padStart(4, "0");
const badge = (t, c) => `<span class="badge ${c}">${esc(t)}</span>`;
const btn = (act, id, label, cls = "") => `<button class="btn sm ${cls}" data-act="${act}" data-id="${id}" type="button">${label}</button>`;
const std = (r, k, extra = "") => `<div class="acts">${extra}${btn("edit", r[k], "Edit")}${btn("del", r[k], "Delete", "btn-danger")}</div>`;
const debounce = (f, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

function toast(m, err) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " e" : "");
  t.innerHTML = err ? `⚠️ ${m}` : `✅ ${m}`;
  $("#toasts")?.append(t);
  setTimeout(() => t.remove(), 3500);
}

function ask(title, msg, ok = "Delete") {
  return new Promise((res) => {
    const d = $("#confirm"); if(!d) return res(true);
    $("#cT").textContent = title; $("#cM").textContent = msg; $("#cOk").textContent = ok;
    d.returnValue = ""; d.onclick = (e) => { const b = e.target.closest("button"); if (b) d.close(b.value); };
    d.onclose = () => res(d.returnValue === "1"); d.showModal();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const signOutBtn = $("#signOutBtn");
  const signOutModal = $("#signOutModal");
  if (signOutBtn && signOutModal) {
    signOutBtn.addEventListener("click", () => signOutModal.showModal());
  }
  const confirmSignOut = $("#confirmSignOut");
  if (confirmSignOut) {
    confirmSignOut.addEventListener("click", () => window.location.href = "staff-login.html");
  }
  const cancelSignOut = $("#cancelSignOut");
  if (cancelSignOut && signOutModal) {
    cancelSignOut.addEventListener("click", () => signOutModal.close());
  }
});

const ID = { services: "service_id", payments: "payment_id", deliveries: "delivery_id", customers: "customer_id", orders: "order_id" };

const db = {
  async list(resource) {
    const endpoint = resource === "riders" ? "/api/staff/riders" : `/api/${resource}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch ${resource}`);
    }
    return await res.json();
  },

  async save(resource, id, data) {
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/${resource}/${id}` : `/api/${resource}`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to save ${resource}`);
    }
    return await res.json();
  },

  async del(resource, id) {
    const res = await fetch(`/api/${resource}/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete from ${resource}`);
    }
    return await res.json();
  }
};


document.addEventListener("DOMContentLoaded", () => {
  const cur = document.body.dataset.page;
  const M = $("#view") ? $("#view").dataset : {};
  const S = { rows: [], orders: [], riders: [] };
  let EDIT = null, feeTouched = false;

  const orderOf = (id) => S.orders.find((o) => o.order_id == id) || {};
  const nameOf = (r) => orderOf(r.order_id).customer_name || "Unknown customer";
  const flt = () => Object.fromEntries([...document.querySelectorAll("[data-flt]")].map((i) => [i.dataset.flt, i.value.trim().toLowerCase()]));
  const slots = () => [...$("#f_time_slot")?.options || []].map((o) => o.value).filter(Boolean);

  function fillSelects() {
    document.querySelectorAll("select[data-fill]").forEach((sel) => {
      const k = sel.dataset.fill;
      const opts = k === "riders" ? S.riders.map((r) => [r.full_name, r.full_name]) : S.orders.map((o) => [o.order_id, `${ord(o.order_id)} - ${o.customer_name}${k === "orders-total" ? ` (${peso(o.total)})` : ""}`]);
      sel.innerHTML = `<option value="">Choose ${k.includes('riders') ? 'rider' : 'order'}</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
    });
  }

  async function init(first) {
    if(!ENT[cur]) return;
    try {
      S.rows = await db.list(ENT[cur].name);
      if (first) { [S.orders, S.riders] = await Promise.all([db.list("orders"), db.list("riders")]); fillSelects(); }
      draw();
    } catch (err) {
      toast("Error loading data: " + err.message, 1);
    }
  }

  function draw() {
    const e = ENT[cur], list = e.filter(S.rows, flt());
    if($("#count")) $("#count").textContent = `Showing ${list.length} of ${S.rows.length} ${M.noun || ''}`;
    if (e.stats) { const st = e.stats(list); document.querySelectorAll("[data-stat]").forEach((el) => (el.textContent = st[el.dataset.stat] || 0)); }
    if($("#out")) $("#out").innerHTML = e.draw(list);
    if($("#list")) $("#list").hidden = !list.length;
  }

  function setErrors(errs) {
    document.querySelectorAll("#form .field").forEach((f) => {
      const m = errs[f.dataset.f]; f.classList.toggle("invalid", !!m);
      if($(".err", f)) $(".err", f).textContent = m || "";
    });
    return !Object.keys(errs).length;
  }

  function openForm(row) {
    const e = ENT[cur], f = $("#form"); EDIT = row || null; feeTouched = !!row; f.reset(); setErrors({});
    if($("#dlgT")) $("#dlgT").textContent = row ? "Edit " + (M.one || '') : ($("#addBtn") ? $("#addBtn").textContent : "Add");
    if($("#save")) $("#save").textContent = row ? "Save changes" : "Save " + (M.one || '');
    f.querySelectorAll("[data-lock]").forEach((i) => (i.disabled = !!row));
    if (row) Object.entries(row).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v ?? ""; });
    else if (e.defaults) Object.entries(e.defaults()).forEach(([k, v]) => { if(f.elements[k]) f.elements[k].value = v; });
    e.init && e.init(f);
    if($("#dlg")) $("#dlg").showModal();
  }

  async function patch(r, ch, msg) { await db.save(ENT[cur].name, r[ENT[cur].id], { ...r, ...ch }); toast(msg); await init(); }
  const balance = (oid) => Math.round((orderOf(oid).total - S.rows.filter((p) => p.order_id == oid && p.status !== "Refunded" && p.payment_id != EDIT?.payment_id).reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100;
  const hrs = (h) => h < 24 ? `${h} hr${h === 1 ? "" : "s"}` : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"}`;

  const ENT = {
    customers: {
      name: "customers", id: "customer_id",
      filter: (rows, f) => rows.filter((r) => !f.q || (r.full_name + " " + r.contact + " " + r.address).toLowerCase().includes(f.q)),
      draw: (list) => list.map((c) => `<tr><td><strong>${esc(c.full_name)}</strong></td><td>${esc(c.contact)}</td><td>${esc(c.address)}</td><td>${badge(c.status || "Active", "ok")}</td><td><div class="acts"><button class="btn sm" data-act="edit" data-id="${c.customer_id}" type="button">Edit</button><button class="btn sm btn-danger" data-act="del" data-id="${c.customer_id}" type="button">Delete</button></div></td></tr>`).join(""),
      validate(d) { const e = {}; if (!d.full_name) e.full_name = "Required"; return e; },
      payload: (d) => ({ full_name: d.full_name, contact: d.contact, address: d.address, status: d.status || "Active" }),
      delMsg: (r) => `Delete customer ${r.full_name}?`
    },
    orders: {
      name: "orders", id: "order_id",
      filter: (rows, f) => rows.filter((r) => !f.q || (r.customer_name + " " + ord(r.order_id)).toLowerCase().includes(f.q)),
      draw: (list) => list.map((o) => `<tr><td><strong>${ord(o.order_id)}</strong></td><td>${esc(o.customer_name)}</td><td>${o.order_date || 'Oct 07, 2026'}</td><td>${badge(o.stage || "In the Magma", (o.stage || "In the Magma") === "Safe Zone" ? "ok" : "bad")}</td><td class="num">${peso(o.total)}</td><td><div class="acts"><button class="btn sm" data-act="edit" data-id="${o.order_id}" type="button">Edit</button><button class="btn sm btn-danger" data-act="del" data-id="${o.order_id}" type="button">Delete</button></div></td></tr>`).join(""),
      validate(d) { const e = {}; if (!d.customer_name) e.customer_name = "Required"; return e; },
      payload: (d) => ({ customer_name: d.customer_name, contact: d.contact, address: d.address, total: +d.total || 0, order_date: d.order_date || today(), stage: d.stage || "In the Magma" }),
      delMsg: (r) => `Delete order ${ord(r.order_id)}?`
    },
    services: {
      name: "services", id: "service_id",
      filter: (rows, f) => rows.filter((r) => (!f.q || (r.service_name + " " + r.description).toLowerCase().includes(f.q)) && (!f.cat || r.category.toLowerCase() === f.cat) && (!f.st || r.status.toLowerCase() === f.st)).sort((a, b) => a.service_name.localeCompare(b.service_name)),
      draw: (list) => list.map((r) => `<tr><td><strong>${esc(r.service_name)}</strong>${r.description ? `<span class="sub">${esc(r.description)}</span>` : ""}</td><td>${esc(r.category)}</td><td class="num">${peso(r.price)}<span class="sub">per ${esc(r.unit)}</span></td><td class="num">${hrs(r.turnaround_hours)}</td><td>${badge(r.status, r.status === "Active" ? "ok" : "mute")}</td><td>${std(r, "service_id")}</td></tr>`).join(""),
      validate(d) { const e = {}; if (!d.service_name) e.service_name = "Required"; return e; },
      payload: (d) => ({ service_name: d.service_name, category: d.category, unit: d.unit, price: +d.price, turnaround_hours: +d.turnaround_hours, status: d.status, description: d.description }),
      delMsg: (r) => `Delete ${r.service_name}?`
    },
    payments: {
      name: "payments", id: "payment_id", defaults: () => ({ paid_at: today() }),
      init: (f) => { f.elements.paid_at.max = today(); if(f.elements.method) ENT.payments.change({ target: f.elements.method }); if(f.elements.order_id) ENT.payments.change({ target: f.elements.order_id }, false); },
      change(e, prefill = true) {
        const f = $("#form");
        if (e.target.name === "method") {
          const need = e.target.value && e.target.value !== "Cash";
          if($("#refStar")) $("#refStar").hidden = !need;
          if($("#h_reference_no")) $("#h_reference_no").textContent = need ? "Copy it from the receipt." : "Not needed for cash.";
        }
        if (e.target.name === "order_id") {
          const id = EDIT ? EDIT.order_id : e.target.value, h = $("#h_order_id");
          if (!id) return void (h && (h.textContent = ""));
          const b = balance(id);
          if(h) h.textContent = b > 0 ? `Balance due: ${peso(b)}` : "Already paid.";
          if (prefill && b > 0 && !f.elements.amount.value) f.elements.amount.value = b.toFixed(2);
        }
      },
      filter: (rows, f) => rows.filter((p) => (!f.q || `${nameOf(p)} ${ord(p.order_id)} ${p.order_id} ${p.reference_no}`.toLowerCase().includes(f.q)) && (!f.m || p.method.toLowerCase() === f.m) && (!f.st || p.status.toLowerCase() === f.st) && (!f.from || p.paid_at >= f.from) && (!f.to || p.paid_at <= f.to)).sort((a, b) => b.paid_at.localeCompare(a.paid_at) || b.payment_id - a.payment_id),
      stats: (list) => Object.fromEntries(["Paid", "Pending", "Refunded"].map((s) => [s, peso(list.filter((p) => p.status === s).reduce((n, p) => n + Number(p.amount), 0))])),
      draw: (list) => list.map((p) => `<tr><td><strong>${pay(p.payment_id)}</strong>${p.reference_no ? `<span class="sub">Ref ${esc(p.reference_no)}</span>` : ""}</td><td><strong>${ord(p.order_id)}</strong><span class="sub">${esc(nameOf(p))}</span></td><td>${esc(p.method)}</td><td>${fmt(p.paid_at)}</td><td class="num"><strong>${peso(p.amount)}</strong></td><td>${badge(p.status, { Paid: "ok", Pending: "warn", Refunded: "mute" }[p.status])}</td><td>${std(p, "payment_id", p.status === "Pending" ? btn("paid", p.payment_id, "Mark paid") : "")}</td></tr>`).join(""),
      validate(d) { const e = {}; if (!d.order_id) e.order_id = "Required"; if (!d.amount) e.amount = "Required"; return e; },
      payload: (d) => ({ order_id: +d.order_id, amount: +d.amount, method: d.method, reference_no: d.method === "Cash" ? "" : d.reference_no.trim(), status: d.status, paid_at: d.paid_at }),
      delMsg: (r) => `Delete payment for ${peso(r.amount)}?`,
      act(a, r) { if (a === "paid") return patch(r, { status: "Paid" }, `Marked as paid.`); }
    },
    deliveries: {
      name: "deliveries", id: "delivery_id", defaults: () => ({ scheduled_date: today() }),
      init: (f) => { if(f.elements.scheduled_date) f.elements.scheduled_date.min = EDIT ? "" : today(); if(f.elements.type) ENT.deliveries.change({ target: f.elements.type[0] || f.elements.type }); },
      change(e) {
        const f = $("#form");
        if (e.target.name === "type") { const t = f.elements.type.value; if($("#addrLbl")) $("#addrLbl").innerHTML = `${t} address <span class="req">*</span>`; if (!feeTouched && f.elements.fee) f.elements.fee.value = t === "Pickup" ? "0.00" : "50.00"; }
        if (e.target.name === "fee") feeTouched = true;
        if (e.target.name === "order_id" && e.target.value) { const o = orderOf(e.target.value); if (f.elements.contact && !f.elements.contact.value) f.elements.contact.value = o.contact || ""; if (f.elements.address && !f.elements.address.value) f.elements.address.value = o.address || ""; }
      },
      filter: (rows, f) => rows.filter((r) => (!f.q || `${nameOf(r)} ${ord(r.order_id)} ${r.address} ${r.rider}`.toLowerCase().includes(f.q)) && (!f.type || r.type.toLowerCase() === f.type) && (!f.rider || r.rider.toLowerCase() === f.rider) && (!f.st || r.status.toLowerCase() === f.st) && (!f.date || r.scheduled_date === f.date)).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || slots().indexOf(a.time_slot) - slots().indexOf(b.time_slot)),
      stats() { const all = ENT.deliveries.filter(S.rows, { ...flt(), st: "" }); return Object.fromEntries(["Scheduled", "On the way", "Completed", "Cancelled"].map((s) => [s, all.filter((r) => r.status === s).length])); },
      draw(list) {
        const g = {}; list.forEach((r) => (g[r.scheduled_date] ||= []).push(r));
        const label = (d) => d === today() ? "Today" : d === addDays(1) ? "Tomorrow" : d === addDays(-1) ? "Yesterday" : fmt(d);
        return Object.keys(g).sort().map((d) => `<section class="day"><h2>${label(d)}<small>${fmt(d)}</small></h2>${g[d].map((r) => {
          const act = r.status === "Scheduled" || r.status === "On the way";
          return `<article class="ticket ${r.status.split(" ")[0]}"><div class="stub"><b>${esc(r.time_slot)}</b><span>${r.type}</span></div><div class="tm"><div class="tt"><strong>${esc(nameOf(r))}</strong>${badge(r.status, { Scheduled: "warn", "On the way": "info", Completed: "ok", Cancelled: "mute" }[r.status])}</div><p class="muted">${esc(r.address)}</p><div class="meta"><span><i>Order</i><b>${ord(r.order_id)}</b></span><span><i>Contact</i><b>${esc(r.contact)}</b></span><span><i>Rider</i><b>${r.rider ? esc(r.rider) : "Not assigned"}</b></span></div><div class="acts" style="justify-content:flex-start">${r.status === "Scheduled" ? btn("start", r.delivery_id, "Start run", "btn-primary") : r.status === "On the way" ? btn("done", r.delivery_id, "Mark completed", "btn-primary") : ""}${btn("edit", r.delivery_id, "Edit")}${act ? btn("cancel", r.delivery_id, "Cancel run") : ""}${btn("del", r.delivery_id, "Delete", "btn-danger")}</div></div></article>`;
        }).join("")}</section>`).join("");
      },
      validate(d) { const e = {}; if (!d.order_id) e.order_id = "Required"; return e; },
      payload: (d) => ({ order_id: +d.order_id, type: d.type, address: d.address.trim(), contact: d.contact, scheduled_date: d.scheduled_date, time_slot: d.time_slot, rider: d.rider, fee: d.fee === "" ? 0 : +d.fee, status: d.status, notes: d.notes }),
      delMsg: () => "Delete run?",
      async act(a, r) {
        if (a === "start") return r.rider ? patch(r, { status: "On the way" }, "Run started.") : toast("Assign a rider first.", 1);
        if (a === "done") return patch(r, { status: "Completed" }, "Run completed.");
        if (a === "cancel" && (await ask("Cancel run?", `Cancel this run?`))) return patch(r, { status: "Cancelled" }, "Run cancelled.");
      }
    }
  };

  if($("#view")) {
    $("#view").addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-act]"); if (!b) return;
      const e = ENT[cur], a = b.dataset.act;
      if(a === "clear") { document.querySelectorAll("[data-flt]").forEach((i) => (i.value = "")); return draw(); }
      const r = S.rows.find((x) => x[e.id] == b.dataset.id);
      if (a === "add") return openForm();
      if (a === "edit") return openForm(r);
      if (a === "del" && await ask("Delete?", e.delMsg(r))) { await db.del(e.name, r[e.id]); await init(); }
      if (e.act) await e.act(a, r);
    });
    $("#view").addEventListener("input", debounce((ev) => { if (ev.target.dataset.flt) draw(); }));
    $("#view").addEventListener("change", (ev) => { if (ev.target.dataset.flt) draw(); });
  }

  if($("#cancel")) $("#cancel").addEventListener("click", () => $("#dlg").close());
  if($("#form")) {
    $("#form").addEventListener("change", (ev) => ENT[cur]?.change && ENT[cur].change(ev));
    $("#form").addEventListener("submit", async (ev) => {
      ev.preventDefault(); const e = ENT[cur], d = Object.fromEntries(new FormData(ev.target));
      ev.target.querySelectorAll("[data-lock]").forEach((i) => { if (EDIT) d[i.name] = EDIT[i.name]; });
      if (!setErrors(e.validate(d))) return;
      await db.save(e.name, EDIT && EDIT[e.id], e.payload(d));
      $("#dlg").close(); toast("Saved."); await init();
    });
  }

  // Dashboard initialization
  async function initDashboard() {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const data = await res.json();

      const statElements = document.querySelectorAll(".stats .stat strong");
      if (statElements.length >= 3) {
        statElements[0].textContent = data.counts.customers;
        statElements[1].textContent = data.counts.orders;
        statElements[2].textContent = data.counts.completed;
      }

      const tbody = document.querySelector(".tw tbody");
      if (tbody && Array.isArray(data.latest_orders)) {
        if (data.latest_orders.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">No orders recorded yet.</td></tr>';
        } else {
          tbody.innerHTML = data.latest_orders.map(o => `
            <tr>
              <td><strong>${ord(o.order_id)}</strong></td>
              <td>${esc(o.customer_name)}</td>
              <td>${o.formatted_date || o.order_date}</td>
              <td>${badge(o.stage || (o.order_status === "Completed" ? "Safe Zone" : "In the Magma"), (o.stage === "Safe Zone" || o.order_status === "Completed") ? "ok" : "bad")}</td>
              <td class="num">${peso(o.total)}</td>
            </tr>
          `).join("");
        }
      }
    } catch (err) {
      toast("Error loading dashboard: " + err.message, 1);
    }
  }

  // Staff login handler
  const loginForm = document.querySelector(".login-form-container form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const emailInput = loginForm.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : "";
      try {
        const res = await fetch("/api/staff/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        sessionStorage.setItem("current_staff", JSON.stringify(data.staff));
        window.location.href = "dashboard.html";
      } catch (err) {
        alert("Login error: " + err.message);
      }
    });
  }

  // Display logged in staff in sidebar
  const currentStaff = JSON.parse(sessionStorage.getItem("current_staff") || "null");
  if (currentStaff) {
    const nameEl = document.querySelector(".user-profile div div:first-child");
    const roleEl = document.querySelector(".user-profile div div:last-child");
    const avatarEl = document.querySelector(".user-profile .avatar");
    if (nameEl) nameEl.textContent = currentStaff.full_name || currentStaff.first_name;
    if (roleEl) roleEl.textContent = `${currentStaff.role} · Basecamp`;
    if (avatarEl) avatarEl.textContent = (currentStaff.first_name || "A")[0].toUpperCase();
  }

  if (ENT[cur]) init(true);
  if (cur === "dashboard") initDashboard();
});