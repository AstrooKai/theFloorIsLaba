const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ROLE_PERMISSIONS = {
  manager: ["dashboard.html", "customers.html", "orders.html", "services.html", "payments.html", "pickup-delivery.html", "history.html", "staff.html"],
  cashier: ["dashboard.html", "customers.html", "orders.html", "payments.html", "pickup-delivery.html", "history.html"],
  washer: ["dashboard.html", "orders.html"],
  folder: ["dashboard.html", "orders.html"],
  rider: ["dashboard.html", "pickup-delivery.html", "orders.html"]
};

const ROLE_DEFAULT_PAGES = {
  manager: "dashboard.html",
  cashier: "dashboard.html",
  washer: "orders.html",
  folder: "orders.html",
  rider: "pickup-delivery.html"
};

function enforceAuthAndRouteGuards() {
  const path = window.location.pathname;
  let page = path.split("/").pop();
  if (!page || page === "") page = "index.html";

  const WORKSPACE_PAGES = ["dashboard.html", "orders.html", "customers.html", "payments.html", "services.html", "pickup-delivery.html", "history.html", "staff.html"];
  const isWorkspace = WORKSPACE_PAGES.includes(page);
  const isLoginPage = (page === "login" || page === "staff-login.html" || path.endsWith("/login"));
  const isLandingPage = (page === "index.html" || path === "/" || path === "");

  const currentStaff = JSON.parse(sessionStorage.getItem("current_staff") || "null");

  if (!currentStaff && isWorkspace) {
    sessionStorage.setItem("auth_redirect_msg", "Please sign in to access the staff workspace.");
    window.location.replace("/login");
    return false;
  }

  if (currentStaff && (isLoginPage || isLandingPage)) {
    const role = (currentStaff.role || "Manager").toLowerCase();
    const target = ROLE_DEFAULT_PAGES[role] || "dashboard.html";
    window.location.replace(target);
    return false;
  }

  if (currentStaff && isWorkspace) {
    const role = (currentStaff.role || "Manager").toLowerCase();
    const permitted = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.manager;

    if (!permitted.includes(page)) {
      const target = ROLE_DEFAULT_PAGES[role] || "dashboard.html";
      sessionStorage.setItem("auth_redirect_msg", `Access restricted: Your role (${currentStaff.role}) does not have permission to view ${page}. Redirected to your authorized workspace.`);
      window.location.replace(target);
      return false;
    }
  }

  const redirectMsg = sessionStorage.getItem("auth_redirect_msg");
  if (redirectMsg) {
    sessionStorage.removeItem("auth_redirect_msg");
    setTimeout(() => toast(redirectMsg, 1), 300);
  }

  return true;
}

enforceAuthAndRouteGuards();
const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const iso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const today = () => addDays(0);
const fmt = (s) => { if(!s) return ""; const [y, m, d] = s.split("-"); return new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); };
const formatDate = (val) => { const d = val ? new Date(val) : new Date(); return isNaN(d.getTime()) ? String(val || "") : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
const ord = (id) => "ORD-" + String(id).padStart(4, "0");
const pay = (id) => "PAY-" + String(id).padStart(4, "0");
const badge = (t, c) => `<span class="badge ${c}">${esc(t)}</span>`;
const orderStatusBadge = (st, id) => {
  const s = String(st || "Received").trim();
  const cls = (s === "Completed") ? "ok"
    : (s === "Washing" || s === "Ready for Pickup" || s === "Out for Delivery") ? "warn"
    : "mute";
  if (id) {
    return `<span class="badge status-clickable ${cls}" data-act="quick-status" data-id="${id}" data-current="${esc(s)}" role="button" tabindex="0" title="Click to advance status">${esc(s)}</span>`;
  }
  return badge(s, cls);
};
const btn = (act, id, label, cls = "") => `<button class="btn sm ${cls}" data-act="${act}" data-id="${id}" type="button">${label}</button>`;
const std = (r, k, extra = "") => `<div class="acts">${extra}${btn("edit", r[k], "Edit")}${btn("del", r[k], "Delete", "btn-danger")}</div>`;
const debounce = (f, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

function toast(m, err) {
  let container = $("#toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "toasts";
    container.className = "toasts";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = "toast" + (err ? " e" : "");
  t.setAttribute("role", "alert");
  t.setAttribute("aria-live", "assertive");

  const iconSvg = err
    ? `<span class="toast-icon err"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`
    : `<span class="toast-icon ok"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>`;

  t.innerHTML = `
    <div class="toast-body-content">
      ${iconSvg}
      <span>${esc(m)}</span>
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss notification">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  const dismiss = () => {
    t.style.animation = "toastSlideOut 0.25s forwards";
    setTimeout(() => t.remove(), 250);
  };

  const closeBtn = t.querySelector(".toast-close");
  if (closeBtn) closeBtn.addEventListener("click", dismiss);

  container.appendChild(t);
  setTimeout(dismiss, 5000);
}

function openModal(el) {
  if (!el) return;
  if (window.bootstrap && bootstrap.Modal) {
    const m = bootstrap.Modal.getOrCreateInstance(el);
    m.show();
  } else if (typeof el.showModal === "function") {
    el.showModal();
  } else {
    el.classList.add("show");
    el.style.display = "block";
  }
}

function closeModal(el) {
  if (!el) return;
  if (window.bootstrap && bootstrap.Modal) {
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
  } else if (typeof el.close === "function") {
    el.close();
  } else {
    el.classList.remove("show");
    el.style.display = "none";
  }
}

function ask(title, msg, ok = "Delete") {
  return new Promise((res) => {
    const d = $("#confirm");
    if (!d) return res(true);
    $("#cT").textContent = title;
    $("#cM").textContent = msg;
    const okBtn = $("#cOk");
    if (okBtn) okBtn.textContent = ok;

    if (window.bootstrap && bootstrap.Modal) {
      const modal = bootstrap.Modal.getOrCreateInstance(d);
      let settled = false;

      const onConfirm = () => {
        if (!settled) {
          settled = true;
          cleanup();
          modal.hide();
          res(true);
        }
      };

      const onDismiss = () => {
        if (!settled) {
          settled = true;
          cleanup();
          res(false);
        }
      };

      const cleanup = () => {
        if (okBtn) okBtn.removeEventListener("click", onConfirm);
        d.removeEventListener("hidden.bs.modal", onDismiss);
      };

      if (okBtn) okBtn.addEventListener("click", onConfirm);
      d.addEventListener("hidden.bs.modal", onDismiss, { once: true });
      modal.show();
    } else {
      d.returnValue = "";
      d.onclick = (e) => {
        const b = e.target.closest("button");
        if (b) d.close(b.value);
      };
      d.onclose = () => res(d.returnValue === "1");
      d.showModal();
    }
  });
}

// Theme Management
function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-bs-theme", theme);
  updateThemeToggleUI(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-bs-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-bs-theme", next);
  localStorage.setItem("theme", next);
  updateThemeToggleUI(next);
}

function updateThemeToggleUI(theme) {
  const btn = $("#themeToggleBtn");
  if (!btn) return;
  btn.innerHTML = theme === "dark"
    ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><span>Light Mode</span>`
    : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><span>Dark Mode</span>`;
}

initTheme();

document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = $("#themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
    updateThemeToggleUI(document.documentElement.getAttribute("data-bs-theme") || "light");
  }

  const signOutBtn = $("#signOutBtn");
  const signOutModal = $("#signOutModal");
  if (signOutBtn && signOutModal) {
    signOutBtn.addEventListener("click", () => openModal(signOutModal));
  }
  const confirmSignOut = $("#confirmSignOut");
  if (confirmSignOut) {
    confirmSignOut.addEventListener("click", () => {
      sessionStorage.removeItem("current_staff");
      window.location.href = "/login";
    });
  }
  const cancelSignOut = $("#cancelSignOut");
  if (cancelSignOut && signOutModal) {
    cancelSignOut.addEventListener("click", () => closeModal(signOutModal));
  }
});

const ID = { services: "service_id", payments: "payment_id", deliveries: "delivery_id", customers: "customer_id", orders: "order_id" };

const getAuthHeaders = () => {
  const staff = JSON.parse(sessionStorage.getItem("current_staff") || "{}");
  const headers = {};
  if (staff.role) headers["x-staff-role"] = staff.role;
  else headers["x-staff-role"] = "Manager";
  if (staff.staff_id) headers["x-staff-id"] = staff.staff_id;
  return headers;
};

const db = {
  async list(resource) {
    const endpoint = resource === "riders" ? "/api/staff/riders" : `/api/${resource}`;
    const res = await fetch(endpoint, { headers: getAuthHeaders() });
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
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
      method: "DELETE",
      headers: getAuthHeaders()
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
  const S = { rows: [], orders: [], riders: [], services: [] };
  let EDIT = null, feeTouched = false;

  const orderOf = (id) => S.orders.find((o) => o.order_id == id) || {};
  const nameOf = (r) => orderOf(r.order_id).customer_name || "Unknown customer";
  const flt = () => Object.fromEntries([...document.querySelectorAll("[data-flt]")].map((i) => [i.dataset.flt, i.value.trim().toLowerCase()]));
  const slots = () => [...$("#f_time_slot")?.options || []].map((o) => o.value).filter(Boolean);

  function fillSelects() {
    document.querySelectorAll("select[data-fill]").forEach((sel) => {
      const k = sel.dataset.fill;
      if (k === "services") {
        const active = (S.services || []).filter(s => (s.status || "Active").toLowerCase() === "active");
        sel.innerHTML = `<option value="">Choose service</option>` + active.map(s => `<option value="${s.service_id}" data-price="${s.price || s.price_per_kg}" data-unit="${esc(s.unit || 'kg')}">${esc(s.service_name)} (${peso(s.price || s.price_per_kg)}/${esc(s.unit || 'kg')})</option>`).join("");
      } else {
        const opts = k === "riders" ? S.riders.map((r) => [r.full_name, r.full_name]) : S.orders.map((o) => [o.order_id, `${ord(o.order_id)} - ${o.customer_name}${k === "orders-total" ? ` (${peso(o.total)})` : ""}`]);
        sel.innerHTML = `<option value="">Choose ${k.includes('riders') ? 'rider' : 'order'}</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
      }
    });
  }

  async function init(first) {
    if(!ENT[cur]) return;
    try {
      S.rows = await db.list(ENT[cur].name);
      if (first) {
        [S.orders, S.riders, S.services] = await Promise.all([
          db.list("orders"),
          db.list("riders"),
          db.list("services").catch(() => [])
        ]);
        fillSelects();
      }
      draw();
    } catch (err) {
      toast("Error loading data: " + err.message, 1);
    }
  }

  function sortTableRows(table, colIdx, dir = "asc") {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (rows.length <= 1) return;

    const parseVal = (str) => {
      const s = String(str || "").trim();
      if (s.startsWith("₱") || /^\₱?\s*[\d,]+(\.\d+)?$/.test(s)) {
        const n = Number(s.replace(/[^0-9.-]+/g, ""));
        if (!isNaN(n)) return { type: "num", val: n };
      }
      const idMatch = s.match(/^(?:ORD|PAY)-(\d+)$/i);
      if (idMatch) return { type: "num", val: Number(idMatch[1]) };

      const hrsMatch = s.match(/^(\d+)\s*hrs?$/i);
      if (hrsMatch) return { type: "num", val: Number(hrsMatch[1]) };

      if (/^-?\d+(\.\d+)?$/.test(s)) return { type: "num", val: Number(s) };

      const d = Date.parse(s);
      if (!isNaN(d) && !/^\d+$/.test(s) && (s.includes("-") || s.includes(",") || s.includes(" "))) {
        return { type: "date", val: d };
      }

      return { type: "str", val: s.toLowerCase() };
    };

    rows.sort((a, b) => {
      const cellA = a.children[colIdx];
      const cellB = b.children[colIdx];
      const textA = cellA ? cellA.innerText.trim() : "";
      const textB = cellB ? cellB.innerText.trim() : "";

      const parsedA = parseVal(textA);
      const parsedB = parseVal(textB);

      let cmp = 0;
      if (parsedA.type === "num" && parsedB.type === "num") {
        cmp = parsedA.val - parsedB.val;
      } else if (parsedA.type === "date" && parsedB.type === "date") {
        cmp = parsedA.val - parsedB.val;
      } else {
        cmp = String(parsedA.val).localeCompare(String(parsedB.val), undefined, { numeric: true, sensitivity: "base" });
      }

      return dir === "asc" ? cmp : -cmp;
    });

    rows.forEach(r => tbody.appendChild(r));
  }

  function setupTableSorting(table) {
    if (!table || table._sortInit) return;
    table._sortInit = true;

    const ths = table.querySelectorAll("thead th");
    ths.forEach((th, idx) => {
      const text = th.textContent.trim().toLowerCase();
      if (text === "actions") return;

      th.classList.add("sortable-th");
      th.setAttribute("role", "button");
      th.setAttribute("tabindex", "0");
      th.setAttribute("title", `Sort by ${th.textContent.trim()}`);

      let indicator = th.querySelector(".sort-indicator");
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "sort-indicator";
        indicator.innerHTML = '<span class="sort-neutral">↕</span>';
        th.appendChild(indicator);
      }

      const triggerSort = () => {
        const currentDir = th.dataset.sortDir;
        const newDir = currentDir === "asc" ? "desc" : "asc";

        ths.forEach(otherTh => {
          delete otherTh.dataset.sortDir;
          const ind = otherTh.querySelector(".sort-indicator");
          if (ind) ind.innerHTML = '<span class="sort-neutral">↕</span>';
        });

        th.dataset.sortDir = newDir;
        const ind = th.querySelector(".sort-indicator");
        if (ind) ind.innerHTML = newDir === "asc" ? '<span class="sort-active">▲</span>' : '<span class="sort-active">▼</span>';

        sortTableRows(table, idx, newDir);
      };

      th.addEventListener("click", triggerSort);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerSort();
        }
      });
    });
  }

  function initTablesSorting() {
    document.querySelectorAll("table").forEach(table => {
      setupTableSorting(table);
      const activeTh = table.querySelector("thead th[data-sort-dir]");
      if (activeTh) {
        const ths = Array.from(table.querySelectorAll("thead th"));
        const idx = ths.indexOf(activeTh);
        if (idx !== -1) sortTableRows(table, idx, activeTh.dataset.sortDir);
      }
    });
  }

  function draw() {
    const e = ENT[cur], list = e.filter(S.rows, flt());
    if($("#count")) $("#count").textContent = `Showing ${list.length} of ${S.rows.length} ${M.noun || ''}`;
    if (e.stats) { const st = e.stats(list); document.querySelectorAll("[data-stat]").forEach((el) => (el.textContent = st[el.dataset.stat] || 0)); }
    if($("#out")) $("#out").innerHTML = e.draw(list);
    if($("#list")) $("#list").hidden = !list.length;
    initTablesSorting();
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
    if($("#dlg")) openModal($("#dlg"));
  }

  async function patch(r, ch, msg) {
    const resourceName = ENT[cur].name.split("?")[0];
    await db.save(resourceName, r[ENT[cur].id], { ...r, ...ch });
    toast(msg);
    await init();
  }
  const balance = (oid) => Math.round((orderOf(oid).total - S.rows.filter((p) => p.order_id == oid && p.status !== "Refunded" && p.payment_id != EDIT?.payment_id).reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100;
  const hrs = (h) => h < 24 ? `${h} hr${h === 1 ? "" : "s"}` : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"}`;

  const ENT = {
    customers: {
      name: "customers", id: "customer_id",
      init: (f) => {
        if (EDIT) {
          if (EDIT.first_name) f.elements.first_name.value = EDIT.first_name;
          if (EDIT.last_name) f.elements.last_name.value = EDIT.last_name;
          if (EDIT.phone || EDIT.contact) f.elements.contact.value = EDIT.phone || EDIT.contact;
          if (EDIT.street) f.elements.street.value = EDIT.street;
          else if (EDIT.address) f.elements.street.value = EDIT.address;
          if (EDIT.barangay) f.elements.barangay.value = EDIT.barangay;
          if (EDIT.status) f.elements.status.value = EDIT.status;
        } else {
          f.elements.status.value = "Active";
        }
      },
      filter: (rows, f) => rows.filter((r) => (!f.q || (r.full_name + " " + (r.contact||"") + " " + (r.address||"")).toLowerCase().includes(f.q)) && (!f.st || (r.status || "Active").toLowerCase() === f.st)),
      draw: (list) => list.map((c) => `<tr><td><strong>${esc(c.full_name)}</strong></td><td>${esc(c.contact || c.phone)}</td><td>${esc(c.address || `${c.street || ''}, ${c.barangay || ''}`)}</td><td><span class="badge status-clickable ${c.status === "Inactive" ? "mute" : "ok"}" data-act="quick-status" data-id="${c.customer_id}" data-current="${esc(c.status || "Active")}" role="button" tabindex="0" title="Click to toggle status">${esc(c.status || "Active")}</span></td><td><div class="acts"><button class="btn sm" data-act="edit" data-id="${c.customer_id}" type="button">Edit</button><button class="btn sm btn-outline-secondary" data-act="archive" data-id="${c.customer_id}" type="button">Archive</button></div></td></tr>`).join(""),
      validate(d) {
        const e = {};
        if (!d.first_name) e.first_name = "First name is required";
        if (!d.last_name) e.last_name = "Last name is required";
        if (!d.contact) e.contact = "Contact number is required";
        if (!d.street) e.street = "Street address is required";
        if (!d.barangay) e.barangay = "Please select a barangay";
        return e;
      },
      payload: (d) => ({
        first_name: d.first_name,
        last_name: d.last_name,
        full_name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        phone: d.contact,
        contact: d.contact,
        street: d.street,
        barangay: d.barangay,
        address: `${d.street || ''}, ${d.barangay || ''}`.trim(),
        status: d.status || "Active"
      }),
      delMsg: (r) => `Archive customer ${r.full_name}?`,
      async act(a, r) {
        if (a === "archive") {
          if (await ask("Archive Customer?", `Archive customer "${r.full_name}"? Their profile will be deactivated.`, "Archive")) {
            const res = await fetch(`/api/customers/${r.customer_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive customer");
            toast(`Customer "${r.full_name}" archived successfully.`);
            await init();
          }
        }
      }
    },
    orders: {
      name: "orders", id: "order_id",
      defaults: () => ({ order_date: today(), weight_kg: "1.0", release_type: "Pickup", order_status: "Received" }),
      init: (f) => {
        fillSelects();
        if (EDIT) {
          if (f.elements.first_name && EDIT.first_name) f.elements.first_name.value = EDIT.first_name;
          if (f.elements.last_name && EDIT.last_name) f.elements.last_name.value = EDIT.last_name;
          if (f.elements.contact && (EDIT.contact || EDIT.phone)) f.elements.contact.value = EDIT.contact || EDIT.phone;
          if (f.elements.street) f.elements.street.value = EDIT.street || EDIT.address || "";
          if (f.elements.barangay && EDIT.barangay) f.elements.barangay.value = EDIT.barangay;
          if (f.elements.service_id && EDIT.service_id) f.elements.service_id.value = EDIT.service_id;
          if (f.elements.weight_kg) f.elements.weight_kg.value = EDIT.weight_kg || "1.0";
          if (f.elements.release_type && EDIT.release_type) f.elements.release_type.value = EDIT.release_type;
        } else {
          if (f.elements.service_id && !f.elements.service_id.value) {
            const firstOpt = f.elements.service_id.options[1];
            if (firstOpt) f.elements.service_id.value = firstOpt.value;
          }
        }
        ENT.orders.calcTotal();
      },
      change(e) {
        if (e.target.name === "service_id" || e.target.name === "weight_kg") {
          ENT.orders.calcTotal();
        }
      },
      calcTotal() {
        const f = $("#form");
        if (!f || !f.elements.service_id || !f.elements.weight_kg || !f.elements.total) return;
        const sel = f.elements.service_id;
        const opt = sel.selectedOptions ? sel.selectedOptions[0] : null;
        const price = opt && opt.dataset.price ? Number(opt.dataset.price) : 0;
        const unit = opt && opt.dataset.unit ? opt.dataset.unit : "kg";
        const unitLbl = $("#serviceUnitLabel");
        if (unitLbl) unitLbl.innerHTML = `Quantity / Weight (${esc(unit)}) <span class="req">*</span>`;
        const weight = Number(f.elements.weight_kg.value) || 0;
        const total = Math.round(price * weight * 100) / 100;
        if (price > 0 && weight > 0) {
          f.elements.total.value = total.toFixed(2);
        } else if (!EDIT) {
          f.elements.total.value = "0.00";
        }
      },
      filter: (rows, f) => rows.filter((r) => (!f.q || (r.customer_name + " " + ord(r.order_id)).toLowerCase().includes(f.q)) && (!f.st || (r.order_status || "Received").toLowerCase() === f.st)),
      draw: (list) => list.map((o) => `<tr><td><strong>${ord(o.order_id)}</strong></td><td>${esc(o.customer_name)}</td><td>${formatDate(o.order_date)}</td><td><span class="badge mute">${esc(o.release_type || "Pickup")}</span></td><td>${orderStatusBadge(o.order_status, o.order_id)}</td><td><span class="badge ${o.payment_status === "Paid" ? "ok" : o.payment_status === "Partial" ? "warn" : "mute"}">${esc(o.payment_status || "Unpaid")}</span></td><td class="num">${peso(o.total)}</td><td><div class="acts"><button class="btn sm" data-act="edit" data-id="${o.order_id}" type="button">Edit</button><button class="btn sm btn-outline-secondary" data-act="archive" data-id="${o.order_id}" type="button">Archive</button></div></td></tr>`).join(""),
      validate(d) {
        const e = {};
        if (!d.first_name) e.first_name = "First name is required";
        if (!d.last_name) e.last_name = "Last name is required";
        if (!d.contact) e.contact = "Contact number is required";
        if (!d.street) e.street = "Street address is required";
        if (!d.barangay) e.barangay = "Please select a barangay";
        if (!d.service_id) e.service_id = "Please select a service";
        if (!d.weight_kg || Number(d.weight_kg) <= 0) e.weight_kg = "Valid weight/quantity required";
        return e;
      },
      payload: (d) => {
        const svcId = Number(d.service_id) || 1;
        const weight = Number(d.weight_kg) || 1.0;
        const totalVal = Number(d.total) || 0;
        return {
          first_name: d.first_name,
          last_name: d.last_name,
          customer_name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
          contact: d.contact,
          street: d.street,
          barangay: d.barangay,
          address: `${d.street || ''}, ${d.barangay || ''}`.trim(),
          release_type: d.release_type || "Pickup",
          total: totalVal,
          order_date: d.order_date || today(),
          order_status: d.order_status || "Received",
          items: [{ service_id: svcId, weight_kg: weight, subtotal: totalVal }]
        };
      },
      delMsg: (r) => `Archive order ${ord(r.order_id)}?`,
      async act(a, r) {
        if (a === "archive") {
          if (await ask("Archive Order?", `Archive Order #${ord(r.order_id)}? It can be viewed or restored in Order History.`, "Archive")) {
            const res = await fetch(`/api/orders/${r.order_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive order");
            toast(`Order #${ord(r.order_id)} archived successfully.`);
            await init();
          }
        }
      }
    },
    history: {
      name: "orders?include_archived=true", id: "order_id",
      filter: (rows, f) => rows.filter((r) => {
        const qMatch = !f.q || (r.customer_name + " " + ord(r.order_id)).toLowerCase().includes(f.q);
        const stMatch = !f.st || (r.order_status || "Received").toLowerCase() === f.st;
        const isArchived = Boolean(r.is_archived);
        const archMatch = !f.arch || (f.arch === "archived" ? isArchived : !isArchived);
        return qMatch && stMatch && archMatch;
      }),
      draw: (list) => list.map((o) => `<tr><td><strong>${ord(o.order_id)}</strong></td><td>${esc(o.customer_name)}</td><td>${formatDate(o.order_date)}</td><td><span class="badge mute">${esc(o.release_type || "Pickup")}</span></td><td>${orderStatusBadge(o.order_status, o.order_id)}</td><td><span class="badge ${o.payment_status === "Paid" ? "ok" : o.payment_status === "Partial" ? "warn" : "mute"}">${esc(o.payment_status || "Unpaid")}</span></td><td><span class="badge ${o.is_archived ? "mute" : "ok"}">${o.is_archived ? "Archived" : "Active"}</span></td><td class="num">${peso(o.total)}</td><td><div class="acts">${o.is_archived ? `<button class="btn sm btn-primary" data-act="unarchive" data-id="${o.order_id}" type="button">Unarchive</button>` : `<button class="btn sm btn-outline-secondary" data-act="archive" data-id="${o.order_id}" type="button">Archive</button>`}</div></td></tr>`).join(""),
      async act(a, r) {
        if (a === "archive") {
          if (await ask("Archive Order?", `Archive Order #${ord(r.order_id)}?`, "Archive")) {
            const res = await fetch(`/api/orders/${r.order_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive order");
            toast(`Order #${ord(r.order_id)} archived successfully.`);
            await init();
          }
        } else if (a === "unarchive") {
          if (await ask("Restore Order?", `Restore Order #${ord(r.order_id)} back to active orders?`, "Restore")) {
            const res = await fetch(`/api/orders/${r.order_id}/unarchive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to restore order");
            toast(`Order #${ord(r.order_id)} restored to active orders.`);
            await init();
          }
        }
      }
    },
    services: {
      name: "services", id: "service_id",
      filter: (rows, f) => rows.filter((r) => (!f.q || (r.service_name + " " + (r.description || '')).toLowerCase().includes(f.q)) && (!f.cat || (r.category || '').toLowerCase() === f.cat) && (!f.st || (r.status || '').toLowerCase() === f.st)).sort((a, b) => a.service_name.localeCompare(b.service_name)),
      draw: (list) => list.map((r) => {
        const toggleBtn = (r.status || "Active") === "Active"
          ? `<button class="btn sm btn-outline-danger" data-act="toggle-status" data-id="${r.service_id}" type="button">Disable</button>`
          : `<button class="btn sm btn-outline-success" data-act="toggle-status" data-id="${r.service_id}" type="button">Enable</button>`;
        return `<tr><td><strong>${esc(r.service_name)}</strong>${r.description ? `<span class="sub">${esc(r.description)}</span>` : ""}</td><td>${esc(r.category || 'Wash & fold')}</td><td class="num">${peso(r.price || r.price_per_kg)}<span class="sub">per ${esc(r.unit || 'kg')}</span></td><td class="num">${hrs(r.turnaround_hours || 24)}</td><td><span class="badge status-clickable ${(r.status || "Active") === "Active" ? "ok" : "mute"}" data-act="quick-status" data-id="${r.service_id}" data-current="${esc(r.status || "Active")}" role="button" tabindex="0" title="Click to toggle status">${esc(r.status || "Active")}</span></td><td><div class="acts"><button class="btn sm" data-act="edit" data-id="${r.service_id}" type="button">Edit</button>${toggleBtn}</div></td></tr>`;
      }).join(""),
      validate(d) {
        const e = {};
        if (!d.service_name || !d.service_name.trim()) e.service_name = "Service name is required";
        if (!d.price || Number(d.price) <= 0) e.price = "Valid price is required";
        return e;
      },
      payload: (d) => ({
        service_name: (d.service_name || "").trim(),
        category: d.category || "Wash & fold",
        unit: d.unit || "kg",
        price: +d.price,
        price_per_kg: +d.price,
        turnaround_hours: d.turnaround_hours === "" ? 24 : +d.turnaround_hours,
        status: d.status || "Active",
        description: (d.description || "").trim()
      }),
      delMsg: (r) => `Deactivate ${r.service_name}?`,
      async act(a, r) {
        if (a === "toggle-status") {
          const next = (r.status || "Active") === "Active" ? "Inactive" : "Active";
          const actWord = next === "Inactive" ? "Disable" : "Enable";
          if (await ask(`${actWord} Service?`, `${actWord} laundry service "${r.service_name}"? ${next === 'Inactive' ? 'It will be hidden from new order creation.' : 'It will be available for new orders.'}`, actWord)) {
            const res = await fetch(`/api/services/${r.service_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to toggle service status");
            toast(`Service "${r.service_name}" status updated to ${next}.`);
            await init();
          }
        }
      }
    },
    payments: {
      name: "payments", id: "payment_id", defaults: () => ({ paid_at: today(), method: "Cash", status: "Paid" }),
      init: (f) => {
        f.elements.paid_at.max = today();
        if (f.elements.method) {
          if (!EDIT && !f.elements.method.value) f.elements.method.value = "Cash";
          ENT.payments.change({ target: f.elements.method });
        }
        if (f.elements.order_id) ENT.payments.change({ target: f.elements.order_id }, false);
      },
      change(e, prefill = true) {
        const f = $("#form");
        if (e.target.name === "method") {
          const methodVal = e.target.value;
          const isNonCash = methodVal === "E-Wallet" || methodVal === "Card";
          const refField = $("#f_ref_field") || (f.elements.reference_no ? f.elements.reference_no.closest(".field") : null);
          if (refField) {
            refField.style.display = isNonCash ? "block" : "none";
          }
          if ($("#refStar")) $("#refStar").hidden = !isNonCash;
          if ($("#h_reference_no")) $("#h_reference_no").textContent = isNonCash ? "Required for digital/card payments." : "Not needed for cash.";
          if (!isNonCash && f.elements.reference_no) f.elements.reference_no.value = "";
        }
        if (e.target.name === "order_id") {
          const id = EDIT ? EDIT.order_id : e.target.value, h = $("#h_order_id");
          if (!id) return void (h && (h.textContent = ""));
          const b = balance(id);
          if(h) h.textContent = b > 0 ? `Balance due: ${peso(b)}` : "Already paid.";
          if (prefill && b > 0 && !f.elements.amount.value) f.elements.amount.value = b.toFixed(2);
        }
      },
      filter: (rows, f) => rows.filter((p) => (!f.q || `${nameOf(p)} ${ord(p.order_id)} ${p.order_id} ${p.reference_no || ''}`.toLowerCase().includes(f.q)) && (!f.m || p.method.toLowerCase() === f.m) && (!f.st || p.status.toLowerCase() === f.st) && (!f.from || p.paid_at >= f.from) && (!f.to || p.paid_at <= f.to)).sort((a, b) => b.paid_at.localeCompare(a.paid_at) || b.payment_id - a.payment_id),
      stats: (list) => Object.fromEntries(["Paid", "Pending", "Refunded"].map((s) => [s, peso(list.filter((p) => p.status === s).reduce((n, p) => n + Number(p.amount), 0))])),
      draw: (list) => list.map((p) => `<tr><td><strong>${pay(p.payment_id)}</strong>${p.reference_no ? `<span class="sub">Ref ${esc(p.reference_no)}</span>` : ""}</td><td><strong>${ord(p.order_id)}</strong><span class="sub">${esc(nameOf(p))}</span></td><td>${esc(p.method)}</td><td>${formatDate(p.paid_at || p.payment_date)}</td><td class="num"><strong>${peso(p.amount)}</strong></td><td>${badge(p.status, { Paid: "ok", Pending: "warn", Refunded: "mute" }[p.status])}</td><td><div class="acts">${p.status === "Pending" ? btn("paid", p.payment_id, "Mark paid", "btn-success") : ""}<button class="btn sm" data-act="edit" data-id="${p.payment_id}" type="button">Edit</button><button class="btn sm btn-outline-secondary" data-act="archive" data-id="${p.payment_id}" type="button">Archive</button></div></td></tr>`).join(""),
      validate(d) {
        const e = {};
        if (!d.order_id) e.order_id = "Required";
        if (!d.amount || Number(d.amount) <= 0) e.amount = "Valid amount required";
        if (!d.method) e.method = "Payment method required";
        if ((d.method === "E-Wallet" || d.method === "Card") && (!d.reference_no || !d.reference_no.trim())) {
          e.reference_no = "Reference number is required for digital/card payments";
        }
        return e;
      },
      payload: (d) => ({
        order_id: +d.order_id,
        amount: +d.amount,
        amount_paid: +d.amount,
        method: d.method,
        payment_method: d.method,
        reference_no: (d.method === "Cash") ? "" : (d.reference_no || "").trim(),
        status: d.status || "Paid",
        paid_at: d.paid_at || today(),
        payment_date: d.paid_at || today()
      }),
      delMsg: (r) => `Archive payment for ${peso(r.amount)}?`,
      async act(a, r) {
        if (a === "paid") return patch(r, { status: "Paid" }, `Marked as paid.`);
        if (a === "archive") {
          if (await ask("Archive Payment?", `Archive payment #${pay(r.payment_id)} of ${peso(r.amount)}? It will be hidden while preserving financial audit trails.`, "Archive")) {
            const res = await fetch(`/api/payments/${r.payment_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive payment");
            toast(`Payment #${pay(r.payment_id)} archived successfully.`);
            await init();
          }
        }
      }
    },
    deliveries: {
      name: "deliveries", id: "delivery_id", defaults: () => ({ scheduled_date: today(), time_slot: "10 AM - 12 PM", type: "Pickup", fee: "0.00" }),
      init: (f) => {
        if(f.elements.scheduled_date) f.elements.scheduled_date.min = EDIT ? "" : today();
        fillSelects();
        if (EDIT) {
          if (EDIT.street) f.elements.street.value = EDIT.street;
          if (EDIT.barangay) f.elements.barangay.value = EDIT.barangay;
          if (EDIT.contact) f.elements.contact.value = EDIT.contact;
          if (EDIT.time_slot) f.elements.time_slot.value = EDIT.time_slot;
          if (EDIT.fee !== undefined) f.elements.fee.value = EDIT.fee;
          if (EDIT.rider) f.elements.rider.value = EDIT.rider;
        }
        ENT.deliveries.updateRiderVisibility(f);
      },
      updateRiderVisibility(f) {
        const type = f.elements.type ? f.elements.type.value : "Pickup";
        const riderField = $("#riderField");
        const riderSel = f.elements.rider;
        if (type === "Delivery") {
          if (riderField) riderField.style.display = "";
          if (riderSel) riderSel.setAttribute("required", "required");
        } else {
          if (riderField) riderField.style.display = "none";
          if (riderSel) {
            riderSel.removeAttribute("required");
            riderSel.value = "";
          }
        }
      },
      change(e) {
        const f = $("#form");
        if (e.target.name === "type") {
          const t = f.elements.type.value;
          if ($("#streetLbl")) $("#streetLbl").innerHTML = `${t} Street Address <span class="req">*</span>`;
          if (!feeTouched && f.elements.fee) f.elements.fee.value = t === "Pickup" ? "0.00" : "50.00";
          ENT.deliveries.updateRiderVisibility(f);
        }
        if (e.target.name === "fee") feeTouched = true;
        if (e.target.name === "order_id" && e.target.value) {
          const o = orderOf(e.target.value);
          if (f.elements.contact && (!f.elements.contact.value || !EDIT)) f.elements.contact.value = o.contact || o.customer_phone || "";
          if (f.elements.street && (!f.elements.street.value || !EDIT)) f.elements.street.value = o.street || o.address || "";
          if (f.elements.barangay && (!f.elements.barangay.value || !EDIT) && o.barangay) f.elements.barangay.value = o.barangay;
        }
      },
      filter: (rows, f) => rows.filter((r) => (!f.q || `${nameOf(r)} ${ord(r.order_id)} ${r.address} ${r.rider}`.toLowerCase().includes(f.q)) && (!f.type || r.type.toLowerCase() === f.type) && (!f.rider || (r.rider && r.rider.toLowerCase() === f.rider)) && (!f.st || r.status.toLowerCase() === f.st) && (!f.date || r.scheduled_date === f.date)).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || slots().indexOf(a.time_slot) - slots().indexOf(b.time_slot)),
      stats() { const all = ENT.deliveries.filter(S.rows, { ...flt(), st: "" }); return Object.fromEntries(["Scheduled", "On the way", "Completed", "Cancelled"].map((s) => [s, all.filter((r) => r.status === s).length])); },
      draw(list) {
        const g = {}; list.forEach((r) => (g[r.scheduled_date] ||= []).push(r));
        const label = (d) => d === today() ? "Today" : d === addDays(1) ? "Tomorrow" : d === addDays(-1) ? "Yesterday" : fmt(d);
        return Object.keys(g).sort().map((d) => `<section class="day"><h2>${label(d)}<small>${fmt(d)}</small></h2>${g[d].map((r) => {
          const act = r.status === "Scheduled" || r.status === "On the way";
          const startBtn = r.status === "Scheduled" ? btn("start", r.delivery_id, "Start run", "btn-warning") : "";
          const doneBtn = r.status === "On the way" ? btn("done", r.delivery_id, "Mark completed", "btn-success") : "";
          const editBtn = (r.status !== "Completed" && r.status !== "Cancelled") ? btn("edit", r.delivery_id, "Edit") : "";
          const cancelBtn = act ? btn("cancel", r.delivery_id, "Cancel run", "btn-danger") : "";
          const archiveBtn = r.status === "Completed" ? btn("archive", r.delivery_id, "Archive", "btn-outline-secondary") : "";
          const displayAddress = r.street && r.barangay ? `${r.street}, ${r.barangay}` : (r.address || "Cabuyao, Laguna");
          return `<article class="ticket ${r.status.split(" ")[0]}"><div class="stub"><b>${esc(r.time_slot)}</b><span>${esc(r.type)}</span></div><div class="tm"><div class="tt"><strong>${esc(r.customer_name || nameOf(r))}</strong>${badge(r.status, { Scheduled: "warn", "On the way": "info", Completed: "ok", Cancelled: "mute" }[r.status])}</div><p class="muted">${esc(displayAddress)}</p><div class="meta"><span><i>Order</i><b>${ord(r.order_id)}</b></span><span><i>Contact</i><b>${esc(r.contact)}</b></span><span><i>Rider</i><b>${r.rider ? esc(r.rider) : "Not assigned"}</b></span></div><div class="acts" style="justify-content:flex-start">${startBtn}${doneBtn}${editBtn}${cancelBtn}${archiveBtn}</div></div></article>`;
        }).join("")}</section>`).join("");
      },
      validate(d) {
        const e = {};
        if (!d.order_id) e.order_id = "Order is required";
        if (!d.street || !d.street.trim()) e.street = "Street address is required";
        if (!d.barangay) e.barangay = "Barangay is required";
        if (!d.contact || !d.contact.trim()) e.contact = "Contact number is required";
        if (d.type === "Delivery" && !d.rider) e.rider = "Rider is required for delivery";
        return e;
      },
      payload: (d) => {
        const street = (d.street || "").trim();
        const barangay = (d.barangay || "").trim();
        const address = street && barangay ? `${street}, ${barangay}` : (street || barangay || (d.address || "").trim());
        return {
          order_id: +d.order_id,
          type: d.type,
          street,
          barangay,
          address,
          contact: (d.contact || "").trim(),
          scheduled_date: d.scheduled_date,
          time_slot: d.time_slot,
          rider: d.type === "Pickup" ? "" : d.rider,
          fee: d.fee === "" ? 0 : +d.fee,
          status: "Scheduled",
          notes: (d.notes || "").trim()
        };
      },
      delMsg: () => "Archive run?",
      async act(a, r) {
        if (a === "start") return r.rider ? patch(r, { status: "On the way" }, "Run started.") : toast("Please assign a rider before starting the run.", 1);
        if (a === "done") return patch(r, { status: "Completed" }, "Run completed.");
        if (a === "cancel" && (await ask("Cancel run?", `Cancel this run?`, "Cancel run"))) return patch(r, { status: "Cancelled" }, "Run cancelled.");
        if (a === "archive") {
          if (await ask("Archive Transport Run?", `Archive completed run for Order #${ord(r.order_id)}? It will be safely stored and removed from the active schedule.`, "Archive")) {
            const res = await fetch(`/api/deliveries/${r.delivery_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive delivery");
            toast(`Transport run archived successfully.`);
            await init();
          }
        }
      }
    }
  };

  if($("#view")) {
    $("#view").addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-act]"); if (!b) return;
      const e = ENT[cur], a = b.dataset.act;
      if(a === "clear") { document.querySelectorAll("[data-flt]").forEach((i) => (i.value = "")); return draw(); }
      const r = S.rows.find((x) => x[e.id] == b.dataset.id);
      if (a === "quick-status" && r) {
        if (cur === "services") {
          const next = (r.status || "Active") === "Active" ? "Inactive" : "Active";
          const actWord = next === "Inactive" ? "Disable" : "Enable";
          if (await ask(`${actWord} Service?`, `${actWord} laundry service "${r.service_name}"?`, actWord)) {
            const res = await fetch(`/api/services/${r.service_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to toggle service status");
            toast(`Service "${r.service_name}" status updated to ${next}.`);
            await init();
          }
          return;
        }
        if (cur === "customers") {
          const next = (r.status || "Active") === "Active" ? "Inactive" : "Active";
          if (await ask("Change Customer Status", `Update status for "${r.full_name}" to "${next}"?`, "Update Status")) {
            await patch(r, { status: next }, `Customer status updated to ${next}.`);
          }
          return;
        }
        if (cur === "orders" || cur === "history") {
          const steps = ["Received", "Washing", "Ready for Pickup", "Out for Delivery", "Completed"];
          const curr = r.order_status || "Received";
          const idx = steps.indexOf(curr);
          const next = steps[(idx + 1) % steps.length];
          if (await ask("Update Order Status", `Advance Order #${ord(r.order_id)} from "${curr}" to "${next}"?`, "Update Status")) {
            await patch(r, { order_status: next }, `Order #${ord(r.order_id)} status updated to ${next}.`);
          }
          return;
        }
      }
      if (a === "add") return openForm();
      if (a === "edit") return openForm(r);
      if (a === "del" && await ask("Delete?", e.delMsg(r))) {
        await db.del(e.name, r[e.id]);
        const entityLabel = M.one ? (M.one.charAt(0).toUpperCase() + M.one.slice(1)) : "Record";
        toast(`${entityLabel} deleted successfully.`);
        await init();
      }
      if (e.act) await e.act(a, r);
    });
    $("#view").addEventListener("input", debounce((ev) => { if (ev.target.dataset.flt) draw(); }));
    $("#view").addEventListener("change", (ev) => { if (ev.target.dataset.flt) draw(); });
  }

  if($("#cancel")) $("#cancel").addEventListener("click", () => closeModal($("#dlg")));
  if($("#form")) {
    $("#form").addEventListener("change", (ev) => ENT[cur]?.change && ENT[cur].change(ev));
    $("#form").addEventListener("input", (ev) => {
      if (cur === "orders" && (ev.target.name === "weight_kg" || ev.target.name === "service_id")) {
        ENT.orders.calcTotal();
      }
    });
    $("#form").addEventListener("submit", async (ev) => {
      ev.preventDefault(); const e = ENT[cur], d = Object.fromEntries(new FormData(ev.target));
      ev.target.querySelectorAll("[data-lock]").forEach((i) => { if (EDIT) d[i.name] = EDIT[i.name]; });
      if (!setErrors(e.validate(d))) return;
      await db.save(e.name, EDIT && EDIT[e.id], e.payload(d));
      closeModal($("#dlg"));
      const entityLabel = M.one ? (M.one.charAt(0).toUpperCase() + M.one.slice(1)) : "Record";
      const msg = EDIT ? `${entityLabel} updated successfully.` : `New ${M.one || 'record'} created successfully.`;
      toast(msg);
      await init();
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
              <td>${formatDate(o.order_date || o.formatted_date)}</td>
              <td>${orderStatusBadge(o.order_status, o.order_id)}</td>
              <td class="num">${peso(o.total)}</td>
            </tr>
          `).join("");

          if (!tbody._quickStatusInit) {
            tbody._quickStatusInit = true;
            tbody.addEventListener("click", async (ev) => {
              const b = ev.target.closest('[data-act="quick-status"]');
              if (!b) return;
              const orderId = b.dataset.id;
              const curr = b.dataset.current || "Received";
              const steps = ["Received", "Washing", "Ready for Pickup", "Out for Delivery", "Completed"];
              const idx = steps.indexOf(curr);
              const next = steps[(idx + 1) % steps.length];
              if (await ask("Update Order Status", `Advance Order #${ord(orderId)} from "${curr}" to "${next}"?`, "Update Status")) {
                try {
                  const res = await fetch(`/api/orders/${orderId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order_status: next })
                  });
                  if (!res.ok) throw new Error("Failed to update status");
                  toast(`Order #${ord(orderId)} status updated to ${next}.`);
                  await initDashboard();
                } catch (err) {
                  toast(err.message, 1);
                }
              }
            });
          }
        }
        initTablesSorting();
      }
    } catch (err) {
      toast("Error loading dashboard: " + err.message, 1);
    }
  }

  // Staff login handler
  const loginForm = document.querySelector(".login-form-container form");
  if (loginForm) {
    const showToggle = loginForm.querySelector(".form-group span");
    const passInput = loginForm.querySelector('input[type="password"]');
    const emailInput = loginForm.querySelector('input[type="email"]');
    const errorEl = document.getElementById("loginError");

    const clearError = () => {
      if (errorEl) {
        errorEl.textContent = "";
        errorEl.style.display = "none";
      }
    };

    if (emailInput) {
      emailInput.addEventListener("input", clearError);
      emailInput.addEventListener("focus", clearError);
    }
    if (passInput) {
      passInput.addEventListener("input", clearError);
      passInput.addEventListener("focus", clearError);
    }

    if (showToggle && passInput) {
      showToggle.addEventListener("click", () => {
        const isPass = passInput.type === "password";
        passInput.type = isPass ? "text" : "password";
        showToggle.textContent = isPass ? "Hide" : "Show";
      });
    }

    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      clearError();
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passInput ? passInput.value : "";
      try {
        const res = await fetch("/api/staff/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        sessionStorage.setItem("current_staff", JSON.stringify(data.staff));
        const role = (data.staff.role || "Manager").toLowerCase();
        const target = ROLE_DEFAULT_PAGES[role] || "dashboard.html";
        window.location.href = target;
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = "block";
        } else {
          toast(err.message, 1);
        }
      }
    });
  }

  function applyRoleNavVisibility() {
    const staff = JSON.parse(sessionStorage.getItem("current_staff") || "null");
    if (!staff) return;
    const role = (staff.role || "Manager").toLowerCase();
    const permitted = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.manager;

    document.querySelectorAll(".side-nav a").forEach(link => {
      const href = link.getAttribute("href");
      if (!href) return;
      const targetPage = href.split("/").pop();
      if (permitted.includes(targetPage)) {
        link.style.display = "";
      } else {
        link.style.display = "none";
      }
    });

    document.querySelectorAll(".nav-group").forEach(group => {
      const visibleLinks = Array.from(group.querySelectorAll(".side-nav a")).filter(a => a.style.display !== "none");
      group.style.display = visibleLinks.length > 0 ? "" : "none";
    });

    const nameEl = document.querySelector(".user-profile div div:first-child");
    const roleEl = document.querySelector(".user-profile div div:last-child");
    const avatarEl = document.querySelector(".user-profile .avatar");
    if (nameEl) nameEl.textContent = staff.full_name || staff.first_name || "Staff Member";
    if (roleEl) roleEl.textContent = staff.role || "Active Staff";
    if (avatarEl) avatarEl.textContent = (staff.first_name || "A")[0].toUpperCase();
  }

  applyRoleNavVisibility();

  if (ENT[cur]) init(true);
  if (cur === "dashboard") initDashboard();
  initTablesSorting();
});