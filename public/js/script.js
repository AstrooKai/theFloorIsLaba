// DOM helpers and utility functions
const $ = (selector, root = document) => root.querySelector(selector);

// HTML entity escaping function to prevent Cross-Site Scripting (XSS)
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
const esc = escapeHtml; // Shorthand alias for template strings

// Role-Based Access Control (RBAC) route permissions
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

// Retrieve currently authenticated staff user from localStorage
function getAuthStaff() {
  try {
    return JSON.parse(localStorage.getItem("current_staff") || "null");
  } catch (error) {
    console.error("Error reading current_staff from localStorage:", error);
    return null;
  }
}

// Persist authenticated staff user to localStorage
function setAuthStaff(staff, token) {
  try {
    localStorage.setItem("current_staff", JSON.stringify(staff));
    localStorage.setItem("auth_token", token);
  } catch (error) {
    console.error("Error saving current_staff to localStorage:", error);
  }
}

// Clear authenticated staff user from localStorage (Logout)
function clearAuthStaff() {
  try {
    localStorage.removeItem("current_staff");
    localStorage.removeItem("auth_token");
  } catch (error) {
    console.error("Error clearing current_staff from localStorage:", error);
  }
}

// Multi-tab synchronization: redirect to login if session was logged out in another tab
window.addEventListener("storage", (event) => {
  if (event.key === "current_staff" && !event.newValue) {
    window.location.href = "/";
  }
});

// Enforce authentication guards and role-based page authorization
function enforceAuthAndRouteGuards() {
  const currentPath = window.location.pathname;
  let pageName = currentPath.split("/").pop();
  if (!pageName || pageName === "") pageName = "index.html";

  const WORKSPACE_PAGES = [
    "dashboard.html",
    "orders.html",
    "customers.html",
    "payments.html",
    "services.html",
    "pickup-delivery.html",
    "history.html",
    "staff.html"
  ];
  const isWorkspace = WORKSPACE_PAGES.includes(pageName);
  const isLoginPage = (pageName === "index.html" || pageName === "login" || pageName === "staff-login.html" || currentPath === "/" || currentPath === "" || currentPath.endsWith("/login"));

  const currentStaff = getAuthStaff();

  // Redirect unauthenticated guests attempting to access internal workspace
  if (!currentStaff && isWorkspace) {
    localStorage.setItem("auth_redirect_msg", "Please sign in to access the staff workspace.");
    window.location.replace("/");
    return false;
  }

  // Redirect already authenticated users away from the login page
  if (currentStaff && isLoginPage) {
    const role = (currentStaff.role || "").toLowerCase();
    const targetPage = ROLE_DEFAULT_PAGES[role] || "index.html";
    window.location.replace(targetPage);
    return false;
  }

  // Verify that the current user's role is allowed on this page
  if (currentStaff && isWorkspace) {
    const role = (currentStaff.role || "").toLowerCase();
    const permittedPages = ROLE_PERMISSIONS[role] || [];

    if (!permittedPages.includes(pageName)) {
      const targetPage = ROLE_DEFAULT_PAGES[role] || "index.html";
      localStorage.setItem("auth_redirect_msg", `Access restricted: Your role (${currentStaff.role}) does not have permission to view ${pageName}. Redirected to your authorized workspace.`);
      window.location.replace(targetPage);
      return false;
    }
  }

  // Display pending redirect toast messages if present
  const redirectMsg = localStorage.getItem("auth_redirect_msg");
  if (redirectMsg) {
    localStorage.removeItem("auth_redirect_msg");
    setTimeout(() => toast(redirectMsg, 1), 300);
  }

  return true;
}

// Execute route guards immediately before rendering
enforceAuthAndRouteGuards();

// User role check helpers
const getStaffRole = () => ((getAuthStaff() || {}).role || "").toLowerCase();
const isManager = () => getStaffRole() === "manager";
const isCashierOrManager = () => ["cashier", "manager"].includes(getStaffRole());
const isProductionStaff = () => ["washer", "folder"].includes(getStaffRole());
const isRider = () => getStaffRole() === "rider";

// Formatting and badge helpers

// Format numbers as Philippine Peso currency (e.g. ₱1,250.00)
function formatPeso(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
const peso = formatPeso;

// Convert Date object to YYYY-MM-DD ISO string format
function formatIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
const iso = formatIsoDate;

// Add days to current date and return formatted ISO string
function addDays(daysCount) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysCount);
  return formatIsoDate(targetDate);
}
const today = () => addDays(0);

// Format date for readable UI display (e.g. "Mon, Oct 5, 2026")
function formatReadableDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
const fmt = formatReadableDate;

// Format dates using standard British/Filipino long date format
const formatDate = (val) => {
  const d = val ? new Date(val) : new Date();
  return isNaN(d.getTime()) ? String(val || "") : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

// Format standard Order ID display (e.g. ORD-0005)
function formatOrderId(id) {
  return "ORD-" + String(id).padStart(4, "0");
}
const ord = formatOrderId;

// Format standard Payment ID display (e.g. PAY-0005)
function formatPaymentId(id) {
  return "PAY-" + String(id).padStart(4, "0");
}
const pay = formatPaymentId;

// Render a status badge with CSS styling
function createBadge(label, className) {
  return `<span class="badge ${className}">${escapeHtml(label)}</span>`;
}
const badge = createBadge;

// Render order status badge with clickable quick-advance trigger for authorized staff
function orderStatusBadge(statusText, orderId, releaseType) {
  const status = String(statusText || "Received").trim();
  const statusClass = (status === "Completed") ? "ok"
    : (status === "Washing") ? "info"
    : (status === "Folding") ? "folding"
    : (status === "Ready for Pickup" || status === "Out for Delivery") ? "warn"
    : "mute";

  const canAdvance = isCashierOrManager() || (isProductionStaff() && (status === "Received" || status === "Washing" || status === "Folding"));
  if (orderId && canAdvance) {
    const relAttr = releaseType ? ` data-release="${escapeHtml(releaseType)}"` : "";
    return `<span class="badge status-clickable ${statusClass}" data-act="quick-status" data-id="${orderId}" data-current="${escapeHtml(status)}"${relAttr} role="button" tabindex="0" title="Click to advance status">${escapeHtml(status)}</span>`;
  }
  return createBadge(status, statusClass);
}

// Render order release type badge (Pickup vs Delivery)
function orderTypeBadge(typeText) {
  const type = String(typeText || "Pickup").trim();
  const isDelivery = type.toLowerCase() === "delivery";
  const badgeClass = isDelivery ? "type-delivery" : "type-pickup";
  return `<span class="badge ${badgeClass}">${escapeHtml(type)}</span>`;
}

// Generate an action button element
function createActionButton(action, id, label, className = "") {
  return `<button class="btn sm ${className}" data-act="${action}" data-id="${id}" type="button">${label}</button>`;
}
const btn = createActionButton;

// Render an actions dropdown menu
function renderActionsDropdown(menuItems = [], emptyPlaceholder = "View only") {
  const validItems = menuItems.filter(Boolean);
  if (validItems.length === 0) {
    return `<div class="acts"><span class="text-muted small">${emptyPlaceholder}</span></div>`;
  }
  return `
    <div class="acts">
      <div class="dropdown">
        <button class="btn sm btn-outline-secondary dropdown-toggle action-dropdown-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-popper-config='{"strategy":"fixed"}'>
          Actions
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
          ${validItems.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}
const actionsDropdown = renderActionsDropdown;

// Render standard Edit and Delete action dropdown for a table row
function renderStandardRowActions(record, idField, extraActions = "") {
  return renderActionsDropdown([
    extraActions,
    `<button class="dropdown-item" data-act="edit" data-id="${record[idField]}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`,
    `<button class="dropdown-item text-danger" data-act="del" data-id="${record[idField]}" type="button"><i class="bi bi-trash me-2"></i>Delete</button>`
  ]);
}
const std = renderStandardRowActions;

// Debounce helper to limit frequency of rapid calls (e.g. search input typing)
function debounce(fn, delayMs = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}


function toast(m, err) {
  let container = $("#toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "toasts";
    container.className = "toasts";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = "toast show" + (err ? " e" : "");
  t.setAttribute("role", "alert");
  t.setAttribute("aria-live", "assertive");

  const iconSvg = err
    ? `<span class="toast-icon toast-icon-err"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`
    : `<span class="toast-icon toast-icon-ok"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>`;

  t.innerHTML = `
    <div class="toast-body-content">
      ${iconSvg}
      <span>${esc(m)}</span>
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss notification">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    t.style.animation = "toastSlideOut 0.25s forwards";
    setTimeout(() => {
      if (t.parentNode) t.remove();
    }, 250);
  };

  const closeBtn = t.querySelector(".toast-close");
  if (closeBtn) closeBtn.addEventListener("click", dismiss);

  container.appendChild(t);
  setTimeout(dismiss, 5000);
}
window.toast = toast;

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
    const msgEl = $("#cM");
    if (msgEl) msgEl.innerHTML = msg;
    const okBtn = $("#cOk");
    const cancelBtn = d.querySelector("#cCancel") || d.querySelector('[data-bs-dismiss="modal"]') || d.querySelector('button[value="0"]');
    const lowerOk = String(ok || "").toLowerCase();
    const lowerTitle = String(title || "").toLowerCase();

    const isDangerous = lowerOk.includes("delete") || lowerOk.includes("archive") || lowerOk.includes("discontinue") || lowerOk.includes("deactivate") || lowerOk.includes("cancel") || lowerTitle.includes("delete") || lowerTitle.includes("archive") || lowerTitle.includes("discontinue") || lowerTitle.includes("deactivate") || lowerTitle.includes("cancel");

    if (okBtn) {
      okBtn.textContent = ok;
      if (isDangerous) {
        okBtn.className = "btn btn-danger btn-confirm-danger";
      } else if (lowerOk.includes("paid") || lowerOk.includes("reactivate") || lowerOk.includes("activate") || lowerOk.includes("restore")) {
        okBtn.className = "btn btn-success btn-confirm-success";
      } else if (lowerOk.includes("pending") || lowerOk.includes("unpaid")) {
        okBtn.className = "btn btn-warning btn-confirm-warning";
      } else {
        okBtn.className = "btn btn-primary btn-confirm-primary";
      }
    }

    if (cancelBtn) {
      if (isDangerous) {
        cancelBtn.textContent = "Keep It";
        cancelBtn.className = "btn btn-success btn-confirm-keep";
      } else {
        cancelBtn.textContent = "Cancel";
        cancelBtn.className = "btn btn-outline-secondary";
      }
    }

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

// Theme management
function initTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved || "light";
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
  if (btn) {
    btn.innerHTML = theme === "dark"
      ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><span>Light Mode</span>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><span>Dark Mode</span>`;
  }
  const mobileBtn = $("#mobileThemeBtn");
  if (mobileBtn) {
    mobileBtn.innerHTML = theme === "dark"
      ? `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    mobileBtn.setAttribute("title", theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode");
    mobileBtn.setAttribute("aria-label", theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode");
  }
}

initTheme();

// Sidebar collapse
function initSidebar() {
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  if (isCollapsed && document.body) {
    document.body.classList.add("sidebar-collapsed");
  }
}
initSidebar();

// Mobile navigation
function initResponsiveNavigation() {
  const appLayout = document.querySelector(".app-layout");
  const sidebar = document.querySelector(".sidebar");
  if (!appLayout || !sidebar) return;

  // Mobile topbar
  if (!document.querySelector(".mobile-topbar")) {
    const staff = getAuthStaff();
    const role = (staff && staff.role ? staff.role : "Manager").toLowerCase();
    const defaultPage = (ROLE_DEFAULT_PAGES && ROLE_DEFAULT_PAGES[role]) ? ROLE_DEFAULT_PAGES[role] : "dashboard.html";
    const initial = staff ? (staff.first_name || "A")[0].toUpperCase() : "A";
    const staffTitle = staff ? `${staff.full_name || staff.first_name || "Staff Member"} (${staff.role || "Staff"})` : "Staff";

    const topbar = document.createElement("header");
    topbar.className = "mobile-topbar";
    topbar.setAttribute("role", "banner");
    topbar.innerHTML = `
      <div class="mobile-topbar-left">
        <button type="button" id="mobileMenuBtn" class="btn-mobile-menu" aria-label="Open navigation menu" title="Open navigation menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <a href="${esc(defaultPage)}" class="mobile-brand" title="The Floor is Laba">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--magma-500)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span>The Floor is Laba</span>
        </a>
      </div>
      <div class="mobile-topbar-right">
        <button type="button" id="mobileThemeBtn" class="btn-mobile-theme" aria-label="Toggle theme" title="Toggle color theme">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <div id="mobileAvatar" class="mobile-avatar" title="${esc(staffTitle)}">${esc(initial)}</div>
      </div>
    `;
    appLayout.prepend(topbar);
  }

  // Mobile backdrop
  if (!document.querySelector(".sidebar-backdrop")) {
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);
  }

  // Close button
  const sidebarLogo = sidebar.querySelector(".sidebar-logo");
  if (sidebarLogo && !sidebarLogo.querySelector("#sidebarCloseBtn")) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.id = "sidebarCloseBtn";
    closeBtn.className = "btn-sidebar-close";
    closeBtn.setAttribute("aria-label", "Close navigation menu");
    closeBtn.setAttribute("title", "Close navigation");
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    sidebarLogo.appendChild(closeBtn);
  }

  // Toggle handlers
  const openSidebar = () => {
    document.body.classList.add("sidebar-open");
    const mBtn = $("#mobileMenuBtn");
    if (mBtn) mBtn.setAttribute("aria-expanded", "true");
  };

  const closeSidebar = () => {
    document.body.classList.remove("sidebar-open");
    const mBtn = $("#mobileMenuBtn");
    if (mBtn) mBtn.setAttribute("aria-expanded", "false");
  };

  const toggleSidebar = () => {
    if (document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  const menuBtn = $("#mobileMenuBtn");
  if (menuBtn) {
    menuBtn.onclick = toggleSidebar;
  }

  const closeBtn = $("#sidebarCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = closeSidebar;
  }

  const backdrop = document.querySelector(".sidebar-backdrop");
  if (backdrop) {
    backdrop.onclick = closeSidebar;
  }

  // Close on navigation
  sidebar.querySelectorAll(".side-nav a").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 992) {
        closeSidebar();
      }
    });
  });

  // Mobile theme toggle
  const mobileThemeBtn = $("#mobileThemeBtn");
  if (mobileThemeBtn) {
    mobileThemeBtn.onclick = toggleTheme;
  }

  // Close on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    }
  });

  // Close on resize
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 992 && document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    }
  });

  // Sync theme icon
  const theme = document.documentElement.getAttribute("data-bs-theme") || "light";
  updateThemeToggleUI(theme);
}

document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = $("#themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
    updateThemeToggleUI(document.documentElement.getAttribute("data-bs-theme") || "light");
  }

  // Sidebar scroll wrapper
  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !sidebar.querySelector(".sidebar-nav-scroll")) {
    const navGroups = Array.from(sidebar.querySelectorAll(":scope > .nav-group"));
    if (navGroups.length > 0) {
      const scrollWrapper = document.createElement("div");
      scrollWrapper.className = "sidebar-nav-scroll";
      sidebar.insertBefore(scrollWrapper, navGroups[0]);
      navGroups.forEach(g => scrollWrapper.appendChild(g));
    }
  }

  // Content footer fallback
  const mainContent = document.querySelector(".main-content");
  if (mainContent && !mainContent.querySelector(".content-footer")) {
    const footer = document.createElement("footer");
    footer.className = "content-footer";
    footer.innerHTML = `<span class="footer-brand">The Floor Is <b>Laba.</b></span> <span class="footer-dot">•</span> <span>&copy; 2026 Laundromat Management System</span>`;
    const toasts = mainContent.querySelector("#toasts");
    if (toasts) {
      mainContent.insertBefore(footer, toasts);
    } else {
      mainContent.appendChild(footer);
    }
  }

  const sidebarToggle = $("#sidebarToggleBtn");
  if (sidebarToggle) {
    const syncToggleBtn = () => {
      const isCollapsed = document.body.classList.contains("sidebar-collapsed");
      sidebarToggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      sidebarToggle.setAttribute("title", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    };
    syncToggleBtn();
    sidebarToggle.addEventListener("click", () => {
      const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
      localStorage.setItem("sidebar_collapsed", isCollapsed ? "true" : "false");
      syncToggleBtn();
    });
  }

  const signOutBtn = $("#signOutBtn");
  const signOutModal = $("#signOutModal");
  if (signOutBtn && signOutModal) {
    signOutBtn.addEventListener("click", () => openModal(signOutModal));
  }
  const confirmSignOut = $("#confirmSignOut");
  if (confirmSignOut) {
    confirmSignOut.addEventListener("click", () => {
      clearAuthStaff();
      window.location.href = "/";
    });
  }
  const cancelSignOut = $("#cancelSignOut");
  if (cancelSignOut && signOutModal) {
    cancelSignOut.addEventListener("click", () => closeModal(signOutModal));
  }

  initResponsiveNavigation();
});

const ID = { services: "service_id", payments: "payment_id", deliveries: "delivery_id", customers: "customer_id", orders: "order_id", staff: "staff_id" };

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      const errorObj = new Error(err.error || `Failed to save ${resource}`);
      if (err.field) errorObj.field = err.field;
      throw errorObj;
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
  // Current active page identifier from <body data-page="...">
  const currentPage = document.body.dataset.page;
  const cur = currentPage; // Shorthand alias for backward compatibility

  // View configuration metadata from the #view container element
  const viewMetadata = $("#view") ? $("#view").dataset : {};
  const M = viewMetadata; // Shorthand alias

  // Central state store for fetched entities and related lookup collections
  const appState = {
    rows: [],
    orders: [],
    riders: [],
    services: [],
    customers: []
  };
  const S = appState; // Shorthand alias for state access

  // Holds the record currently being viewed or edited in the modal
  let editingRecord = null;
  let EDIT = null;
  let feeTouched = false;

  // Retrieve an order object from cached state by order_id
  function getOrderById(orderId) {
    return (appState.orders || []).find((order) => order.order_id == orderId) || {};
  }
  const orderOf = getOrderById;

  // Retrieve customer name for a delivery record
  function getCustomerNameForDelivery(deliveryRecord) {
    return getOrderById(deliveryRecord.order_id).customer_name || "Unknown customer";
  }
  const nameOf = getCustomerNameForDelivery;

  // Collect filter input values from [data-flt] inputs into an object
  function getActiveFilters() {
    const filters = {};
    const filterInputs = document.querySelectorAll("[data-flt]");
    filterInputs.forEach((input) => {
      filters[input.dataset.flt] = input.value.trim().toLowerCase();
    });
    return filters;
  }
  const flt = getActiveFilters;

  // Get list of available time slot options from the time slot select element
  function getAvailableTimeSlots() {
    const timeSlotSelect = $("#f_time_slot");
    if (!timeSlotSelect) return [];
    return Array.from(timeSlotSelect.options).map((opt) => opt.value).filter(Boolean);
  }
  const slots = getAvailableTimeSlots;

  function validateContact(val, label = "Contact number", required = true) {
    if (!val || !val.trim()) {
      return required ? `${label} is required` : null;
    }
    const str = val.trim();
    if (/[a-zA-Z]/.test(str)) {
      return `${label} cannot contain letters`;
    }
    if (!/^\+?[0-9\s-]+$/.test(str)) {
      return `${label} cannot contain symbols`;
    }
    const digits = str.replace(/\D/g, "");
    if (digits.length !== 11) {
      return "Please enter a valid 11-digit mobile number (e.g. 0917XXXXXXX)";
    }
    if (!digits.startsWith("09")) {
      return `${label} should start with 09 (e.g. 0917XXXXXXX)`;
    }
    return null;
  }

  function fillSelects() {
    document.querySelectorAll("select[data-fill]").forEach((sel) => {
      const k = sel.dataset.fill;
      if (k === "customers") {
        const activeCusts = (S.customers || []).filter((c) => !c.is_archived);
        const curVal = sel.value;
        sel.innerHTML = `<option value="">+ New Customer (Enter details below)</option>` + activeCusts.map((c) => {
          const name = c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
          const phoneStr = c.phone || c.contact ? ` · ${c.phone || c.contact}` : '';
          return `<option value="${c.customer_id}">${esc(name)}${esc(phoneStr)}</option>`;
        }).join("");
        if (curVal) sel.value = curVal;
      } else if (k === "services") {
        const active = (S.services || []).filter(s => (s.status || "Active").toLowerCase() === "active");
        sel.innerHTML = `<option value="">Choose service</option>` + active.map(s => `<option value="${s.service_id}" data-price="${s.price || s.price_per_kg}" data-unit="${esc(s.unit || 'kg')}">${esc(s.service_name)} (${peso(s.price || s.price_per_kg)}/${esc(s.unit || 'kg')})</option>`).join("");
      } else if (k === "riders") {
        const busyRiderNames = new Set(
          (S.rows || [])
            .filter(d => d.status === "On the way" && (d.rider_id || d.rider))
            .map(d => String(d.rider || '').toLowerCase().trim())
        );
        const busyRiderIds = new Set(
          (S.rows || [])
            .filter(d => d.status === "On the way" && d.rider_id)
            .map(d => Number(d.rider_id))
        );
        sel.innerHTML = `<option value="">Choose rider</option>` + S.riders.map((r) => {
          const isBusy = busyRiderIds.has(Number(r.staff_id)) || busyRiderNames.has((r.full_name || '').toLowerCase().trim());
          const label = isBusy ? `${r.full_name} (Occupied on delivery)` : `${r.full_name} (Available)`;
          return `<option value="${esc(r.full_name)}">${esc(label)}</option>`;
        }).join("");
      } else if (k === "orders") {
        // Collect order IDs that already have a completed pickup or delivery run
        const completedOrderIds = new Set();
        (S.rows || []).forEach((d) => {
          if (String(d.status || "").toLowerCase() === "completed" && d.order_id) {
            completedOrderIds.add(Number(d.order_id));
          }
        });
        // Filter active orders that have not yet been picked up or delivered
        const availableOrders = (S.orders || []).filter((o) => {
          const isCompleted = String(o.order_status || "").trim().toLowerCase() === "completed"
            || Number(o.status_id) === 5
            || (o.release_date != null && String(o.release_date).trim() !== "")
            || Number(o.completed_runs_count) > 0
            || completedOrderIds.has(Number(o.order_id));
          if (EDIT && EDIT.order_id == o.order_id) return true;
          return !isCompleted;
        });
        const defaultPrompt = (!EDIT && availableOrders.length === 0) ? "No active orders available" : "Choose order";
        const opts = availableOrders.map((o) => [o.order_id, `${ord(o.order_id)} - ${o.customer_name}`]);
        sel.innerHTML = `<option value="">${defaultPrompt}</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
      } else if (k === "orders-total") {
        const curVal = sel.value || (EDIT ? String(EDIT.order_id) : "");
        const availableOrders = (S.orders || []).filter((o) => {
          if (EDIT && EDIT.order_id == o.order_id) return true;
          const remaining = calculateRemainingBalance(o.order_id);
          const isFullyPaid = String(o.payment_status || "").trim().toLowerCase() === "paid" || remaining <= 0;
          return !isFullyPaid;
        });
        const defaultPrompt = (!EDIT && availableOrders.length === 0) ? "No unpaid orders available" : "Choose an order";
        const opts = availableOrders.map((o) => {
          const b = calculateRemainingBalance(o.order_id);
          const balText = b > 0 ? ` (Balance: ${peso(b)})` : ` (${peso(o.total)})`;
          return [o.order_id, `${ord(o.order_id)} - ${o.customer_name}${balText}`];
        });
        sel.innerHTML = `<option value="">${defaultPrompt}</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
        if (curVal) sel.value = curVal;
      } else {
        const opts = (S.orders || []).map((o) => [o.order_id, `${ord(o.order_id)} - ${o.customer_name}`]);
        sel.innerHTML = `<option value="">Choose order</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
      }
    });
  }

  async function init(first) {
    if(!ENT[cur]) return;
    try {
      S.rows = await db.list(ENT[cur].name);
      if (first) {
        [S.orders, S.riders, S.services, S.customers] = await Promise.all([
          db.list("orders"),
          db.list("riders"),
          db.list("services").catch(() => []),
          db.list("customers").catch(() => [])
        ]);
        fillSelects();
      } else if (cur === "orders") {
        S.customers = await db.list("customers").catch(() => S.customers || []);
        fillSelects();
      } else if (cur === "deliveries") {
        S.orders = await db.list("orders").catch(() => S.orders || []);
        fillSelects();
      } else if (cur === "payments") {
        S.orders = await db.list("orders").catch(() => S.orders || []);
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
    const rows = Array.from(tbody.querySelectorAll("tr:not(.empty-row)"));
    if (rows.length <= 1) return;

    const parseVal = (str) => {
      const s = String(str || "").trim();
      if (s.startsWith("₱") || /^\₱?\s*[\d,]+(\.\d+)?$/.test(s)) {
        const n = Number(s.replace(/[^0-9.-]+/g, ""));
        if (!isNaN(n)) return { type: "num", val: n };
      }
      const idMatch = s.match(/\b(?:ORD|PAY)-(\d+)\b/i);
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
        indicator.innerHTML = '<i class="bi bi-arrow-down-up sort-neutral"></i>';
        th.appendChild(indicator);
      }

      const triggerSort = () => {
        const currentDir = th.dataset.sortDir;
        const newDir = currentDir === "asc" ? "desc" : "asc";

        ths.forEach(otherTh => {
          delete otherTh.dataset.sortDir;
          const ind = otherTh.querySelector(".sort-indicator");
          if (ind) ind.innerHTML = '<i class="bi bi-arrow-down-up sort-neutral"></i>';
        });

        th.dataset.sortDir = newDir;
        const ind = th.querySelector(".sort-indicator");
        if (ind) ind.innerHTML = newDir === "asc" ? '<i class="bi bi-arrow-up sort-active"></i>' : '<i class="bi bi-arrow-down sort-active"></i>';

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
      const allThs = Array.from(table.querySelectorAll("thead th"));
      let activeTh = table.querySelector("thead th[data-sort-dir]");

      if (!activeTh && allThs.length > 0) {
        const firstSortableTh = allThs.find(th => th.classList.contains("sortable-th")) || allThs[0];
        if (firstSortableTh) {
          firstSortableTh.dataset.sortDir = "asc";
          const ind = firstSortableTh.querySelector(".sort-indicator");
          if (ind) ind.innerHTML = '<i class="bi bi-arrow-up sort-active"></i>';
          activeTh = firstSortableTh;
        }
      }

      if (activeTh) {
        const idx = allThs.indexOf(activeTh);
        if (idx !== -1) sortTableRows(table, idx, activeTh.dataset.sortDir || "asc");
      }
    });
  }

  function applyActionPermissions() {
    const role = getStaffRole();
    const isMgr = role === "manager";
    const isCashierMgr = ["cashier", "manager"].includes(role);

    const addBtn = $("#addBtn");
    if (addBtn) {
      if (cur === "services" && !isMgr) addBtn.style.display = "none";
      if (cur === "payments" && !isCashierMgr) addBtn.style.display = "none";
      if (cur === "orders" && !isCashierMgr) addBtn.style.display = "none";
      if (cur === "deliveries" && !isCashierMgr) addBtn.style.display = "none";
      if (cur === "customers" && !isCashierMgr) addBtn.style.display = "none";
      if (cur === "staff" && !isMgr) addBtn.style.display = "none";
    }
  }

  function draw() {
    const e = ENT[cur], list = e.filter(S.rows, flt());
    if($("#count")) {
      if (cur === "services") {
        const actCount = list.filter(r => (r.status || "Active").toLowerCase() === "active").length;
        const discCount = list.length - actCount;
        $("#count").textContent = `Showing ${actCount} active service${actCount === 1 ? '' : 's'}${discCount > 0 ? ` and ${discCount} discontinued` : ''}`;
      } else {
        $("#count").textContent = `Showing ${list.length} of ${S.rows.length} ${M.noun || ''}`;
      }
    }
    if (e.stats) { const st = e.stats(list); document.querySelectorAll("[data-stat]").forEach((el) => (el.textContent = st[el.dataset.stat] || 0)); }
    if($("#out")) {
      if (list.length) {
        $("#out").innerHTML = e.draw(list);
      } else {
        const noun = M.noun || "records";
        const filterVals = flt();
        const hasFilter = Object.values(filterVals).some((v) => !!v);
        const subMsg = hasFilter
          ? `No ${noun} matched your search or filter criteria.`
          : `No ${noun} available yet.`;
        const clearBtn = hasFilter
          ? `<button class="btn sm mt-3 btn-outline-secondary" data-act="clear" type="button"><i class="bi bi-arrow-counterclockwise me-1"></i> Clear filters</button>`
          : "";

        const isTable = !!$("#out").closest("table");
        if (isTable) {
          $("#out").innerHTML = `
            <tr class="empty-row">
              <td colspan="100%" class="text-center py-5 empty-cell">
                <div class="empty-placeholder">
                  <div class="empty-icon"><i class="bi bi-search"></i></div>
                  <h5>No matching ${noun} found</h5>
                  <p>${subMsg}</p>
                  ${clearBtn}
                </div>
              </td>
            </tr>
          `;
        } else {
          $("#out").innerHTML = `
            <div class="empty-placeholder card text-center py-5 p-4 my-2 empty-row">
              <div class="empty-icon"><i class="bi bi-search"></i></div>
              <h5>No matching ${noun} found</h5>
              <p>${subMsg}</p>
              ${clearBtn}
            </div>
          `;
        }
      }
    }
    if($("#list")) $("#list").hidden = false;
    applyActionPermissions();
    initTablesSorting();
  }

  function setErrors(errs) {
    document.querySelectorAll("#form .field").forEach((f) => {
      const m = errs[f.dataset.f];
      f.classList.toggle("invalid", !!m);
      let errEl = f.querySelector(".err");
      if (m) {
        if (!errEl) {
          errEl = document.createElement("div");
          errEl.className = "err";
          f.appendChild(errEl);
        }
        errEl.textContent = m;
      } else if (errEl) {
        errEl.textContent = "";
      }
    });
    return !Object.keys(errs).length;
  }

  function setRadioValue(form, name, value) {
    const radios = form.querySelectorAll(`input[type="radio"][name="${name}"]`);
    if (!radios.length) return;
    const target = String(value || "Active").trim().toLowerCase();
    let matched = false;
    radios.forEach((r) => {
      const isMatch = r.value.trim().toLowerCase() === target;
      r.checked = isMatch;
      if (isMatch) matched = true;
    });
    if (!matched) {
      const activeRadio = Array.from(radios).find((r) => r.value.trim().toLowerCase() === "active") || radios[0];
      if (activeRadio) activeRadio.checked = true;
    }
  }

  function openForm(row) {
    const e = ENT[cur], f = $("#form"); EDIT = row || null; feeTouched = !!row; f.reset(); setErrors({});
    if($("#dlgT")) $("#dlgT").textContent = row ? "Edit " + (M.one || '') : ($("#addBtn") ? $("#addBtn").textContent : "Add");
    if($("#save")) $("#save").textContent = row ? "Save changes" : "Save " + (M.one || '');
    f.querySelectorAll("[data-lock]").forEach((i) => (i.disabled = !!row));
    if (row) {
      Object.entries(row).forEach(([k, v]) => {
        if (f.elements[k]) {
          if (f.elements[k] instanceof RadioNodeList || (f.elements[k].length && f.elements[k][0]?.type === "radio")) {
            setRadioValue(f, k, v || "Active");
          } else {
            f.elements[k].value = v ?? "";
          }
        }
      });
    } else if (e.defaults) {
      Object.entries(e.defaults()).forEach(([k, v]) => {
        if (f.elements[k]) {
          if (f.elements[k] instanceof RadioNodeList || (f.elements[k].length && f.elements[k][0]?.type === "radio")) {
            setRadioValue(f, k, v || "Active");
          } else {
            f.elements[k].value = v;
          }
        }
      });
    }

    // Default radio selection
    const radioNames = new Set(Array.from(f.querySelectorAll('input[type="radio"]')).map((r) => r.name).filter(Boolean));
    radioNames.forEach((name) => {
      const checked = f.querySelector(`input[type="radio"][name="${name}"]:checked`);
      if (!checked) {
        setRadioValue(f, name, (row && row[name]) || "Active");
      }
    });

    fillSelects();
    if (cur === "deliveries" || cur === "payments") {
      db.list("orders").then((orders) => {
        S.orders = orders || [];
        fillSelects();
        if (EDIT && f.elements.order_id) f.elements.order_id.value = EDIT.order_id || "";
      }).catch(() => {});
    }
    if (cur === "orders") {
      db.list("customers").then((customers) => {
        S.customers = customers || [];
        fillSelects();
        if (EDIT && f.elements.customer_id) f.elements.customer_id.value = EDIT.customer_id || "";
      }).catch(() => {});
    }
    e.init && e.init(f);
    if($("#dlg")) openModal($("#dlg"));
  }

  // Helper to partially update an entity record and refresh the table
  async function patch(record, changes, successMessage) {
    const activeModule = ENT[cur];
    const resourceName = activeModule.name.split("?")[0];
    const primaryKey = activeModule.id;
    await db.save(resourceName, record[primaryKey], { ...record, ...changes });
    toast(successMessage);
    await init();
  }

  // Calculate remaining balance due on an order (Order Total minus Non-Refunded Payments)
  function calculateRemainingBalance(orderId) {
    const order = getOrderById(orderId);
    const orderTotal = Number(order.total || 0);

    if (cur === "payments" && Array.isArray(appState.rows)) {
      // Sum all payments for this order, excluding refunds and the currently open payment record
      const applicablePayments = appState.rows.filter((payment) => {
        const matchesOrder = payment.order_id == orderId;
        const isNotRefunded = payment.status !== "Refunded";
        const isNotEditingCurrent = payment.payment_id != EDIT?.payment_id;
        return matchesOrder && isNotRefunded && isNotEditingCurrent;
      });

      const totalPaid = applicablePayments.reduce((total, payment) => total + Number(payment.amount || payment.amount_paid || 0), 0);
      return Math.round((orderTotal - totalPaid) * 100) / 100;
    }

    const totalPaid = Number(order.total_paid || 0);
    return Math.round((orderTotal - totalPaid) * 100) / 100;
  }
  const balance = calculateRemainingBalance; // Shorthand alias

  // Format estimated turnaround hours into human-readable hours or days
  function formatTurnaroundHours(hours) {
    if (hours < 24) {
      return `${hours} hr${hours === 1 ? "" : "s"}`;
    }
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const hrs = formatTurnaroundHours; // Shorthand alias

  // Configuration and handlers for each entity module (Customers, Orders, Payments, etc.)
  const entityModules = {
    customers: {
      name: "customers", id: "customer_id", defaults: () => ({ status: "Active" }),
      init: (f) => {
        const statusField = f.querySelector('[data-f="status"]');
        if (statusField) {
          statusField.style.display = EDIT ? "block" : "none";
        }
        if (EDIT) {
          if (EDIT.first_name) f.elements.first_name.value = EDIT.first_name;
          if (EDIT.last_name) f.elements.last_name.value = EDIT.last_name;
          if (EDIT.phone || EDIT.contact) f.elements.contact.value = EDIT.phone || EDIT.contact;
          const streetVal = EDIT.street_address || EDIT.street || EDIT.address || "";
          if (f.elements.street_address) f.elements.street_address.value = streetVal;
          if (f.elements.street) f.elements.street.value = streetVal;
          if (EDIT.barangay) f.elements.barangay.value = EDIT.barangay;
          setRadioValue(f, "status", EDIT.status || "Active");
        } else {
          setRadioValue(f, "status", "Active");
        }
      },
      filter: (rows, f) => rows.filter((r) => (!f.q || (r.full_name + " " + (r.contact||"") + " " + (r.street_address||r.street||r.address||"") + " " + (r.barangay||"")).toLowerCase().includes(f.q)) && (!f.st || (r.status || "Active").toLowerCase() === f.st)),
      draw: (list) => {
        const isMgr = isManager();
        const isCashierMgr = isCashierOrManager();
        return list.map((c) => {
          const items = [];
          if (isCashierMgr) {
            items.push(`<button class="dropdown-item" data-act="edit" data-id="${c.customer_id}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`);
          }
          if (isMgr) {
            items.push(`<button class="dropdown-item text-danger" data-act="archive" data-id="${c.customer_id}" type="button"><i class="bi bi-archive me-2"></i>Archive</button>`);
          }
          const acts = actionsDropdown(items, "View only");
          const statusBadge = isCashierMgr
            ? `<span class="badge status-clickable ${c.status === "Inactive" ? "mute" : "ok"}" data-act="quick-status" data-id="${c.customer_id}" data-current="${esc(c.status || "Active")}" role="button" tabindex="0" title="Click to toggle status">${esc(c.status || "Active")}</span>`
            : `<span class="badge ${c.status === "Inactive" ? "mute" : "ok"}">${esc(c.status || "Active")}</span>`;
          const streetVal = c.street_address || c.street || c.address || "";
          const displayAddr = streetVal && c.barangay ? `${streetVal}, ${c.barangay}` : (streetVal || c.barangay || '-');
          return `<tr><td><strong>${esc(c.full_name)}</strong></td><td>${esc(c.contact || c.phone)}</td><td>${esc(displayAddr)}</td><td>${statusBadge}</td><td>${acts}</td></tr>`;
        }).join("");
      },
      validate(d) {
        const e = {};
        if (!d.first_name || !d.first_name.trim()) e.first_name = "First name is required";
        if (!d.last_name || !d.last_name.trim()) e.last_name = "Last name is required";
        const contactErr = validateContact(d.contact, "Contact number", true);
        if (contactErr) e.contact = contactErr;
        const st = (d.street_address || d.street || "").trim();
        if (!st) {
          if ("street_address" in d) e.street_address = "Street address is required";
          else e.street = "Street address is required";
        }
        if (!d.barangay || !d.barangay.trim()) e.barangay = "Please select a barangay";
        return e;
      },
      payload: (d) => {
        const streetVal = (d.street_address || d.street || "").trim();
        return {
          first_name: d.first_name,
          last_name: d.last_name,
          full_name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
          phone: d.contact,
          contact: d.contact,
          street_address: streetVal,
          street: streetVal,
          barangay: d.barangay,
          address: streetVal,
          status: d.status || "Active"
        };
      },
      delMsg: (r) => `Archive customer <strong>"${esc(r.full_name)}"</strong>?`,
      async act(a, r) {
        if (a === "archive") {
          if (Array.isArray(S.orders)) {
            const active = S.orders.filter(o => 
              Number(o.customer_id) === Number(r.customer_id) && 
              (o.order_status || "").toLowerCase() !== "completed" && 
              !o.is_archived
            );
            if (active.length > 0) {
              const orderList = active.map(o => `#${ord(o.order_id)} (${o.order_status})`).join(", ");
              return toast(`Cannot archive customer with active ongoing orders (${orderList}). Orders must be Completed first.`, 1);
            }
          }
          if (await ask("Archive Customer?", `Archive customer <strong>"${esc(r.full_name)}"</strong>? Their profile will be deactivated.`, "Archive")) {
            try {
              const res = await fetch(`/api/customers/${r.customer_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                return toast(data.error || "Failed to archive customer", 1);
              }
              toast(`Customer "${r.full_name}" archived successfully.`);
              await init();
            } catch (err) {
              toast(err.message, 1);
            }
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
          if (f.elements.customer_id) f.elements.customer_id.value = EDIT.customer_id || "";
          if (f.elements.first_name && EDIT.first_name) f.elements.first_name.value = EDIT.first_name;
          if (f.elements.last_name && EDIT.last_name) f.elements.last_name.value = EDIT.last_name;
          if (f.elements.contact && (EDIT.contact || EDIT.phone || EDIT.customer_phone)) f.elements.contact.value = EDIT.contact || EDIT.phone || EDIT.customer_phone;
          if (f.elements.street) f.elements.street.value = EDIT.street_address || EDIT.street || EDIT.address || "";
          if (f.elements.barangay && EDIT.barangay) f.elements.barangay.value = EDIT.barangay;
          if (f.elements.service_id && EDIT.service_id) f.elements.service_id.value = EDIT.service_id;
          if (f.elements.weight_kg) f.elements.weight_kg.value = EDIT.weight_kg || "1.0";
          if (f.elements.release_type && EDIT.release_type) f.elements.release_type.value = EDIT.release_type;
          const hint = $("#h_customer_id");
          if (hint) hint.textContent = "Customer linked to this order.";
        } else {
          if (f.elements.customer_id) f.elements.customer_id.value = "";
          const hint = $("#h_customer_id");
          if (hint) hint.textContent = "Choose an existing customer to auto-fill details, or enter details below for a new customer.";
          if (f.elements.service_id && !f.elements.service_id.value) {
            const firstOpt = f.elements.service_id.options[1];
            if (firstOpt) f.elements.service_id.value = firstOpt.value;
          }
        }
        ENT.orders.calcTotal();
      },
      change(e) {
        const f = $("#form");
        if (e.target.name === "customer_id") {
          const custId = e.target.value;
          const hint = $("#h_customer_id");
          if (custId) {
            const cust = (S.customers || []).find((c) => String(c.customer_id) === String(custId));
            if (cust) {
              if (f.elements.first_name) f.elements.first_name.value = cust.first_name || "";
              if (f.elements.last_name) f.elements.last_name.value = cust.last_name || "";
              if (f.elements.contact) f.elements.contact.value = cust.phone || cust.contact || "";
              if (f.elements.street) f.elements.street.value = cust.street_address || cust.street || cust.address || "";
              if (f.elements.barangay) f.elements.barangay.value = cust.barangay || "";
              if (hint) hint.textContent = `Auto-filled details for ${cust.full_name || cust.first_name}.`;
            }
          } else if (!EDIT) {
            if (f.elements.first_name) f.elements.first_name.value = "";
            if (f.elements.last_name) f.elements.last_name.value = "";
            if (f.elements.contact) f.elements.contact.value = "";
            if (f.elements.street) f.elements.street.value = "";
            if (f.elements.barangay) f.elements.barangay.value = "";
            if (hint) hint.textContent = "Enter details below to register a new customer.";
          }
        }
        if ((e.target.name === "first_name" || e.target.name === "last_name") && f && f.elements.customer_id && f.elements.customer_id.value) {
          const selCust = (S.customers || []).find((c) => String(c.customer_id) === String(f.elements.customer_id.value));
          if (selCust && (selCust.first_name !== f.elements.first_name.value || selCust.last_name !== f.elements.last_name.value)) {
            f.elements.customer_id.value = "";
            const hint = $("#h_customer_id");
            if (hint) hint.textContent = "Registering as a new customer.";
          }
        }
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
      filter: (rows, f) => rows.filter((r) =>
        (!f.q || (r.customer_name + " " + ord(r.order_id)).toLowerCase().includes(f.q)) &&
        (!f.type || (r.release_type || "Pickup").toLowerCase() === f.type) &&
        (!f.st || (r.order_status || "Received").toLowerCase() === f.st)
      ),
      draw: (list) => {
        const isMgr = isManager();
        const isCashierMgr = isCashierOrManager();
        return list.map((o) => {
          const items = [
            `<button class="dropdown-item" data-act="invoice" data-id="${o.order_id}" type="button"><i class="bi bi-file-earmark-text me-2 text-primary"></i>Invoice</button>`
          ];
          if (isCashierMgr) {
            items.push(`<button class="dropdown-item" data-act="edit" data-id="${o.order_id}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`);
          }
          if (isMgr) {
            items.push(`<button class="dropdown-item text-danger" data-act="archive" data-id="${o.order_id}" type="button"><i class="bi bi-archive me-2"></i>Archive</button>`);
          }
          const actsHtml = actionsDropdown(items);
          const payStatus = o.payment_status || "Unpaid";
          const payStatusCls = payStatus === "Paid" ? "ok" : (payStatus === "Refunded" ? "bad" : "mute");
          const nextPayStatus = payStatus === "Paid" ? "Unpaid" : "Paid";
          const payBadgeHtml = isCashierMgr
            ? `<span class="badge status-clickable ${payStatusCls}" data-act="quick-payment" data-id="${o.order_id}" data-current="${esc(payStatus)}" role="button" tabindex="0" title="Click to mark as ${nextPayStatus}">${esc(payStatus)}</span>`
            : `<span class="badge ${payStatusCls}">${esc(payStatus)}</span>`;
          return `<tr><td><strong>${ord(o.order_id)}</strong></td><td>${esc(o.customer_name)}</td><td>${formatDate(o.order_date)}</td><td>${orderTypeBadge(o.release_type)}</td><td>${orderStatusBadge(o.order_status, o.order_id, o.release_type)}</td><td>${payBadgeHtml}</td><td class="num">${peso(o.total)}</td><td>${actsHtml}</td></tr>`;
        }).join("");
      },
      validate(d) {
        const e = {};
        if (!d.first_name || !d.first_name.trim()) e.first_name = "First name is required";
        if (!d.last_name || !d.last_name.trim()) e.last_name = "Last name is required";
        const contactErr = validateContact(d.contact, "Contact number", true);
        if (contactErr) e.contact = contactErr;
        if (!d.street || !d.street.trim()) e.street = "Street address is required";
        if (!d.barangay || !d.barangay.trim()) e.barangay = "Please select a barangay";
        if (!d.service_id) e.service_id = "Please select a service";
        if (!d.weight_kg || Number(d.weight_kg) <= 0) e.weight_kg = "Valid weight/quantity required";
        return e;
      },
      payload: (d) => {
        const svcId = Number(d.service_id) || 1;
        const weight = Number(d.weight_kg) || 1.0;
        const totalVal = Number(d.total) || 0;
        return {
          customer_id: d.customer_id ? Number(d.customer_id) : null,
          first_name: (d.first_name || '').trim(),
          last_name: (d.last_name || '').trim(),
          customer_name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
          contact: (d.contact || '').trim(),
          phone: (d.contact || '').trim(),
          street_address: (d.street || '').trim(),
          street: (d.street || '').trim(),
          barangay: (d.barangay || '').trim(),
          address: `${d.street || ''}, ${d.barangay || ''}`.trim(),
          release_type: d.release_type || "Pickup",
          total: totalVal,
          order_date: d.order_date || today(),
          order_status: EDIT ? (EDIT.order_status || "Received") : "Received",
          items: [{ service_id: svcId, weight_kg: weight, subtotal: totalVal }]
        };
      },
      delMsg: (r) => `Archive order <strong>#${ord(r.order_id)}</strong>?`,
      async act(a, r) {
        if (a === "archive") {
          if (await ask("Archive Order?", `Archive Order <strong>#${ord(r.order_id)}</strong>? It can be viewed or restored in Archived Records.`, "Archive")) {
            const res = await fetch(`/api/orders/${r.order_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive order");
            toast(`Order #${ord(r.order_id)} archived successfully.`);
            await init();
          }
        }
      }
    },
    services: {
      name: "services", id: "service_id",
      defaults: () => ({ category: "Wash & fold", unit: "kg", turnaround_hours: 24, status: "Active" }),
      init: (f) => {
        if (f.elements.category && Array.isArray(S.rows)) {
          const existing = new Set(Array.from(f.elements.category.options).map(o => o.value.trim().toLowerCase()));
          S.rows.forEach(r => {
            const cat = (r.category || "").trim();
            if (cat && !existing.has(cat.toLowerCase())) {
              const opt = document.createElement("option");
              opt.value = cat;
              opt.textContent = cat;
              f.elements.category.appendChild(opt);
              existing.add(cat.toLowerCase());
            }
          });
        }
      },
      filter: (rows, f) => {
        const q = (f.q || "").toLowerCase();
        const cat = (f.cat || "").toLowerCase();
        const st = (f.st || "").toLowerCase();
        return rows.filter((r) => {
          const nameDesc = `${r.service_name || ""} ${r.description || ""}`.toLowerCase();
          const matchQ = !q || nameDesc.includes(q);
          const matchCat = !cat || (r.category || "").toLowerCase() === cat;
          const statusLower = (r.status || "Active").toLowerCase();
          const isDisc = statusLower === "discontinued" || statusLower === "inactive";
          const matchSt = !st || (st === "active" ? !isDisc : isDisc);
          return matchQ && matchCat && matchSt;
        }).sort((a, b) => a.service_name.localeCompare(b.service_name));
      },
      draw: (list) => {
        const isMgr = isManager();
        const filterSt = (flt().st || "").toLowerCase();

        const catFilter = $("#fl_cat");
        if (catFilter && Array.isArray(S.rows)) {
          const existingFilterVals = new Set(Array.from(catFilter.options).map(o => o.value.trim().toLowerCase()));
          S.rows.forEach(r => {
            const cat = (r.category || "").trim();
            if (cat && !existingFilterVals.has(cat.toLowerCase())) {
              const opt = document.createElement("option");
              opt.value = cat.toLowerCase();
              opt.textContent = cat;
              catFilter.appendChild(opt);
              existingFilterVals.add(cat.toLowerCase());
            }
          });
        }

        const activeList = list.filter((r) => {
          const s = (r.status || "Active").toLowerCase();
          return s !== "discontinued" && s !== "inactive";
        });
        const discList = list.filter((r) => {
          const s = (r.status || "Active").toLowerCase();
          return s === "discontinued" || s === "inactive";
        });

        const badgeActive = $("#badge-active");
        if (badgeActive) badgeActive.textContent = activeList.length;

        const badgeDisc = $("#badge-discontinued");
        if (badgeDisc) badgeDisc.textContent = discList.length;

        const secActive = $("#list");
        if (secActive) {
          secActive.style.display = filterSt === "discontinued" ? "none" : "block";
        }

        const secDisc = $("#section-discontinued");
        if (secDisc) {
          secDisc.style.display = filterSt === "active" ? "none" : "block";
        }

        const renderRow = (r) => {
          const isAct = (r.status || "Active").toLowerCase() === "active";
          const items = [];
          if (isMgr) {
            items.push(`<button class="dropdown-item" data-act="edit" data-id="${r.service_id}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`);
            if (isAct) {
              items.push(`<button class="dropdown-item text-danger" data-act="toggle-status" data-id="${r.service_id}" type="button"><i class="bi bi-slash-circle me-2"></i>Discontinue</button>`);
            } else {
              items.push(`<button class="dropdown-item text-success" data-act="toggle-status" data-id="${r.service_id}" type="button"><i class="bi bi-arrow-counterclockwise me-2"></i>Reactivate Service</button>`);
            }
          }
          const actsHtml = actionsDropdown(items, "Read only");
          const displayStatus = isAct ? "Active" : "Discontinued";
          const badgeHtml = isMgr
            ? `<span class="badge status-clickable ${isAct ? "ok" : "mute"}" data-act="quick-status" data-id="${r.service_id}" data-current="${esc(displayStatus)}" role="button" tabindex="0" title="Click to ${isAct ? 'discontinue' : 'reactivate'}">${esc(displayStatus)}</span>`
            : `<span class="badge ${isAct ? "ok" : "mute"}">${esc(displayStatus)}</span>`;
          return `<tr><td><strong>${esc(r.service_name)}</strong>${r.description ? `<span class="sub">${esc(r.description)}</span>` : ""}</td><td>${esc(r.category || 'Wash & fold')}</td><td class="num">${peso(r.price || r.price_per_kg)}<span class="sub">per ${esc(r.unit || 'kg')}</span></td><td class="num">${hrs(r.turnaround_hours || 24)}</td><td>${badgeHtml}</td><td>${actsHtml}</td></tr>`;
        };

        const outDisc = $("#out-discontinued");
        if (outDisc) {
          if (discList.length === 0) {
            outDisc.innerHTML = `<tr class="empty-row"><td colspan="6" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No discontinued services.</p></div></td></tr>`;
          } else {
            outDisc.innerHTML = discList.map(renderRow).join("");
          }
        }

        if (activeList.length === 0) {
          return `<tr class="empty-row"><td colspan="6" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No active services found.</p></div></td></tr>`;
        }
        return activeList.map(renderRow).join("");
      },
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
      delMsg: (r) => `Discontinue service <strong>"${esc(r.service_name)}"</strong>?`,
      async act(a, r) {
        if (a === "toggle-status") {
          const isAct = (r.status || "Active").toLowerCase() === "active";
          if (isAct) {
            if (await ask(
              "Discontinue Service?",
              `Discontinue laundry service <strong>"${esc(r.service_name)}"</strong>? It will be moved to the Discontinued Services table and hidden from new order creation.`,
              "Discontinue"
            )) {
              const res = await fetch(`/api/services/${r.service_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
              if (!res.ok) throw new Error("Failed to toggle service status");
              toast(`Service "${r.service_name}" discontinued.`);
              await init();
            }
          } else {
            if (await ask(
              "Reactivate Service?",
              `Reactivate laundry service <strong>"${esc(r.service_name)}"</strong>? It will be restored to active services and available for new orders.`,
              "Reactivate"
            )) {
              const res = await fetch(`/api/services/${r.service_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
              if (!res.ok) throw new Error("Failed to toggle service status");
              toast(`Service "${r.service_name}" reactivated.`);
              await init();
            }
          }
        }
      }
    },
    payments: {
      name: "payments", id: "payment_id", defaults: () => ({ paid_at: today(), method: "Cash", status: "Paid" }),
      init: (f) => {
        f.elements.paid_at.max = today();
        if (EDIT) {
          ["order_id", "amount", "method"].forEach((name) => {
            if (f.elements[name]) f.elements[name].disabled = true;
          });
        }
        if (f.elements.amount) {
          f.elements.amount.readOnly = true;
        }
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
          const isNonCash = methodVal !== "" && methodVal !== "Cash";
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
          if (!id) {
            if (f.elements.amount) f.elements.amount.value = "";
            return void (h && (h.textContent = ""));
          }
          const b = balance(id);
          const o = getOrderById(id);
          const isFullyPaid = String(o?.payment_status || "").trim().toLowerCase() === "paid" || b <= 0;
          if (!EDIT && isFullyPaid) {
            e.target.value = "";
            if (f.elements.amount) f.elements.amount.value = "";
            if (h) h.textContent = "";
            toast("This order is already fully paid.", 1);
            return;
          }
          if(h) h.textContent = b > 0 ? `Balance due: ${peso(b)}` : "Already paid.";
          if (f.elements.amount) {
            const amountVal = EDIT ? Number(EDIT.amount || EDIT.amount_paid || b || 0) : (b > 0 ? b : Number(o.total || 0));
            f.elements.amount.value = amountVal.toFixed(2);
            f.elements.amount.readOnly = true;
          }
        }
      },
      filter: (rows, f) => rows.filter((p) => (!f.q || `${p.customer_name || nameOf(p)} ${pay(p.payment_id)} PAY-${p.payment_id} ${p.payment_id} ${ord(p.order_id)} ORD-${p.order_id} ${p.order_id} ${p.reference_no || ''}`.toLowerCase().includes(f.q)) && (!f.m || p.method.toLowerCase() === f.m) && (!f.st || p.status.toLowerCase() === f.st) && (!f.from || p.paid_at >= f.from) && (!f.to || p.paid_at <= f.to)).sort((a, b) => b.paid_at.localeCompare(a.paid_at) || b.payment_id - a.payment_id),
      stats: (list) => {
        const paid = list.filter((p) => p.status === "Paid");
        const pending = list.filter((p) => p.status === "Pending");
        const refunded = list.filter((p) => p.status === "Refunded");
        const paidTotal = paid.reduce((n, p) => n + Number(p.amount), 0);
        const pendingTotal = pending.reduce((n, p) => n + Number(p.amount), 0);
        const refundedTotal = refunded.reduce((n, p) => n + Number(p.amount), 0);
        return {
          Paid: peso(paidTotal),
          PaidCount: `${paid.length} paid transaction${paid.length === 1 ? '' : 's'}`,
          Pending: peso(pendingTotal),
          PendingCount: `${pending.length} pending confirmation`,
          Refunded: peso(refundedTotal),
          RefundedCount: `${refunded.length} refunded`,
          TotalTransactions: String(list.length),
          TransactionsDesc: `${paid.length} paid · ${pending.length} pending`
        };
      },
      draw: (list) => {
        const isMgr = isManager();
        const isCashierMgr = isCashierOrManager();
        const isProdOrRider = isProductionStaff() || isRider();
        return list.map((p) => {
          const items = [];
          items.push(`<button class="dropdown-item" data-act="receipt" data-id="${p.payment_id}" type="button"><i class="bi bi-receipt me-2 text-primary"></i>Receipt</button>`);
          if (!isProdOrRider && isCashierMgr) {
            items.push(`<button class="dropdown-item" data-act="edit" data-id="${p.payment_id}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`);
          }
          if (!isProdOrRider && isMgr) {
            items.push(`<button class="dropdown-item text-danger" data-act="archive" data-id="${p.payment_id}" type="button"><i class="bi bi-archive me-2"></i>Archive</button>`);
          }
          const actsHtml = actionsDropdown(items, "View only");
          const pStatus = p.status || "Paid";
          const pStatusCls = { Paid: "ok", Pending: "warn", Refunded: "bad" }[pStatus] || "mute";
          const nextPStatus = pStatus === "Paid" ? "Pending" : "Paid";
          const statusBadgeHtml = isMgr
            ? `<span class="badge status-clickable ${pStatusCls}" data-act="quick-payment-status" data-id="${p.payment_id}" data-current="${esc(pStatus)}" role="button" tabindex="0" title="Click to mark as ${nextPStatus}">${esc(pStatus)}</span>`
            : `<span class="badge ${pStatusCls}">${esc(pStatus)}</span>`;
          return `<tr><td><strong>${pay(p.payment_id)}</strong>${p.reference_no ? `<span class="sub">Ref ${esc(p.reference_no)}</span>` : ""}</td><td><strong>${ord(p.order_id)}</strong><span class="sub">${esc(nameOf(p))}</span></td><td>${esc(p.method)}</td><td>${formatDate(p.paid_at || p.payment_date)}</td><td class="num"><strong>${peso(p.amount)}</strong></td><td>${statusBadgeHtml}</td><td>${actsHtml}</td></tr>`;
        }).join("");
      },
      validate(d) {
        const e = {};
        const method = EDIT ? (EDIT.method || EDIT.payment_method) : d.method;
        if (!EDIT && !d.order_id) e.order_id = "Please choose an order";
        if (!EDIT && (!d.amount || Number(d.amount) <= 0)) e.amount = "Valid amount is required";
        if (!method) e.method = "Payment method is required";
        if (method && method !== "Cash" && (!d.reference_no || !d.reference_no.trim())) {
          e.reference_no = "Reference number is required";
        }
        if (!EDIT && d.order_id) {
          const b = calculateRemainingBalance(d.order_id);
          const o = getOrderById(d.order_id);
          const isFullyPaid = String(o?.payment_status || "").trim().toLowerCase() === "paid" || b <= 0;
          if (isFullyPaid) {
            e.order_id = "This order is already fully paid";
          } else if (Number(d.amount) < b) {
            e.amount = `Partial payments are not allowed. Full balance due is ${peso(b)}`;
          }
        }
        return e;
      },
      payload: (d) => ({
        ...(EDIT ? {
          reference_no: (EDIT.method === "Cash" || EDIT.payment_method === "Cash") ? null : (d.reference_no || "").trim(),
          payment_date: d.paid_at || today()
        } : {
          order_id: +d.order_id,
          amount: +d.amount,
          amount_paid: +d.amount,
          method: d.method,
          payment_method: d.method,
          reference_no: (d.method === "Cash") ? null : (d.reference_no || "").trim(),
          status: "Paid",
          paid_at: d.paid_at || today(),
          payment_date: d.paid_at || today()
        })
      }),
      delMsg: (r) => `Archive payment <strong>#${pay(r.payment_id)} of ${peso(r.amount)}</strong>?`,
      async act(a, r) {
        if (a === "archive") {
          if (await ask("Archive Payment?", `Archive payment <strong>#${pay(r.payment_id)} of ${peso(r.amount)}</strong>? It will be hidden while preserving financial audit trails.`, "Archive")) {
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
          setRadioValue(f, "type", EDIT.type || "Pickup");
        } else {
          setRadioValue(f, "type", "Pickup");
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
          const hasCompletedRun = (S.rows || []).some(d => d.order_id == e.target.value && String(d.status || "").toLowerCase() === "completed");
          const isCompleted = String(o?.order_status || "").trim().toLowerCase() === "completed"
            || Number(o?.status_id) === 5
            || (o?.release_date != null && String(o?.release_date).trim() !== "")
            || Number(o?.completed_runs_count) > 0
            || hasCompletedRun;
          if (isCompleted && !EDIT) {
            e.target.value = "";
            toast("Orders that have already been picked up or delivered cannot be scheduled for a new run.", 1);
            return;
          }
          if (f.elements.contact && (!f.elements.contact.value || !EDIT)) f.elements.contact.value = o.contact || o.customer_phone || "";
          if (f.elements.street && (!f.elements.street.value || !EDIT)) f.elements.street.value = o.street || o.address || "";
          if (f.elements.barangay && (!f.elements.barangay.value || !EDIT) && o.barangay) f.elements.barangay.value = o.barangay;
        }
      },
      filter: (rows, f) => {
        const staff = getAuthStaff() || {};
        const isR = isRider();
        const filtered = rows.filter((r) => {
          if (isR) {
            const staffName = (staff.full_name || `${staff.first_name || ''} ${staff.last_name || ''}`).trim().toLowerCase();
            const rRider = (r.rider || "").toLowerCase();
            const matchesId = staff.staff_id && Number(r.rider_id) === Number(staff.staff_id);
            const matchesName = staffName && rRider && rRider === staffName;
            if (!matchesId && !matchesName) return false;
          }
          const displayAddress = r.street && r.barangay ? `${r.street}, ${r.barangay}` : (r.address || "");
          const searchable = `${r.customer_name || nameOf(r) || ''} ${ord(r.order_id)} ORD-${r.order_id} ${r.order_id} ${displayAddress} ${r.rider || ''} ${r.contact || ''}`.toLowerCase();
          return (!f.q || searchable.includes(f.q)) && (!f.type || (r.type || "").toLowerCase() === f.type) && (!f.rider || (r.rider && r.rider.toLowerCase() === f.rider)) && (!f.st || (r.status || "").toLowerCase() === f.st) && (!f.date || r.scheduled_date === f.date);
        });

        const sortMode = (f.sort || "closest").trim().toLowerCase();

        const getClosestWeight = (dStr) => {
          if (!dStr) return 999999;
          const d = new Date(dStr + "T00:00:00");
          const t = new Date(today() + "T00:00:00");
          const diffDays = Math.round((d - t) / 86400000);
          const abs = Math.abs(diffDays);
          return diffDays >= 0 ? abs * 2 : abs * 2 + 1;
        };

        return filtered.sort((a, b) => {
          if (sortMode === "date-asc") {
            return (a.scheduled_date || "").localeCompare(b.scheduled_date || "") || (slots().indexOf(a.time_slot) - slots().indexOf(b.time_slot)) || (a.order_id - b.order_id);
          }
          if (sortMode === "date-desc") {
            return (b.scheduled_date || "").localeCompare(a.scheduled_date || "") || (slots().indexOf(b.time_slot) - slots().indexOf(a.time_slot)) || (b.order_id - a.order_id);
          }
          if (sortMode === "order-asc") {
            return (Number(a.order_id) || 0) - (Number(b.order_id) || 0);
          }
          if (sortMode === "order-desc") {
            return (Number(b.order_id) || 0) - (Number(a.order_id) || 0);
          }
          if (sortMode === "customer-asc") {
            const nameA = (a.customer_name || nameOf(a) || "").toLowerCase();
            const nameB = (b.customer_name || nameOf(b) || "").toLowerCase();
            return nameA.localeCompare(nameB);
          }
          if (sortMode === "status") {
            return (a.status || "").localeCompare(b.status || "") || (a.order_id - b.order_id);
          }
          // Default: "closest" date to today
          const wA = getClosestWeight(a.scheduled_date);
          const wB = getClosestWeight(b.scheduled_date);
          if (wA !== wB) return wA - wB;
          return (slots().indexOf(a.time_slot) - slots().indexOf(b.time_slot)) || (b.order_id - a.order_id);
        });
      },
      stats() { const all = ENT.deliveries.filter(S.rows, { ...flt(), st: "" }); return Object.fromEntries(["Scheduled", "On the way", "Completed", "Cancelled"].map((s) => [s, all.filter((r) => r.status === s).length])); },
      draw(list) {
        const isMgr = isManager();
        const isCashierMgr = isCashierOrManager();
        const isR = isRider();

        const occupiedRiderMap = {};
        (S.rows || []).forEach((d) => {
          if (d.status === "On the way") {
            if (d.rider_id) occupiedRiderMap[Number(d.rider_id)] = d;
            if (d.rider) occupiedRiderMap[d.rider.toLowerCase().trim()] = d;
          }
        });

        const f = flt();
        const sortMode = (f.sort || "closest").trim().toLowerCase();
        const isDateSort = sortMode === "closest" || sortMode === "date-asc" || sortMode === "date-desc" || sortMode === "";

        const renderTicket = (r) => {
          const act = r.status === "Scheduled" || r.status === "On the way";
          const isPickup = (r.type || "").toLowerCase() === "pickup";

          const activeRun = (r.rider_id && occupiedRiderMap[Number(r.rider_id)]) || (r.rider && occupiedRiderMap[r.rider.toLowerCase().trim()]);
          const isRiderOccupied = Boolean(activeRun && activeRun.delivery_id !== r.delivery_id);

          const items = [];
          if (!isPickup && r.status === "Scheduled" && (isCashierMgr || isR)) {
            if (isRiderOccupied) {
              items.push(`<button class="dropdown-item text-warning disabled" type="button" disabled title="Rider ${esc(r.rider)} is currently on active delivery #${ord(activeRun.order_id)}"><i class="bi bi-clock-history me-2"></i>Rider Busy</button>`);
            } else if (!r.rider) {
              items.push(`<button class="dropdown-item text-muted disabled" type="button" disabled title="Please assign a rider before starting this delivery run"><i class="bi bi-person-x me-2"></i>No Rider</button>`);
            } else {
              items.push(`<button class="dropdown-item text-warning fw-semibold" data-act="start" data-id="${r.delivery_id}" type="button"><i class="bi bi-play-circle me-2"></i>Start Run</button>`);
            }
          }

          if ((r.status === "On the way" || (isPickup && r.status === "Scheduled")) && (isCashierMgr || isR)) {
            items.push(`<button class="dropdown-item text-success fw-semibold" data-act="done" data-id="${r.delivery_id}" type="button"><i class="bi bi-check-circle me-2"></i>${isPickup ? "Complete Pickup" : "Mark Completed"}</button>`);
          }

          if (r.status !== "Completed" && r.status !== "Cancelled" && isCashierMgr) {
            items.push(`<button class="dropdown-item" data-act="edit" data-id="${r.delivery_id}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`);
          }

          if (act && isCashierMgr) {
            items.push(`<button class="dropdown-item text-danger" data-act="cancel" data-id="${r.delivery_id}" type="button"><i class="bi bi-x-circle me-2"></i>${isPickup ? "Cancel Pickup" : "Cancel Run"}</button>`);
          }

          if (r.status === "Completed" && isMgr) {
            items.push(`<button class="dropdown-item text-danger" data-act="archive" data-id="${r.delivery_id}" type="button"><i class="bi bi-archive me-2"></i>Archive</button>`);
          }

          let quickBtn = "";
          if (!isPickup && r.status === "Scheduled" && (isCashierMgr || isR)) {
            if (isRiderOccupied) {
              quickBtn = `<button class="btn sm btn-outline-warning" disabled title="Rider is currently on active delivery #${ord(activeRun.order_id)}" type="button"><i class="bi bi-clock-history me-1"></i>Busy</button>`;
            } else if (!r.rider) {
              quickBtn = `<button class="btn sm btn-outline-secondary" disabled title="Assign rider first" type="button">No Rider</button>`;
            } else {
              quickBtn = btn("start", r.delivery_id, `<i class="bi bi-play-fill me-1"></i>Start`, "btn-warning");
            }
          } else if ((r.status === "On the way" || (isPickup && r.status === "Scheduled")) && (isCashierMgr || isR)) {
            quickBtn = btn("done", r.delivery_id, `<i class="bi bi-check2 me-1"></i>${isPickup ? "Pickup" : "Done"}`, "btn-success");
          }

          const actsHtml = `
            <div class="acts">
              ${quickBtn}
              ${items.length > 0 ? `
                <div class="dropdown">
                  <button class="btn sm btn-outline-secondary dropdown-toggle action-dropdown-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-popper-config='{"strategy":"fixed"}'>
                    Actions
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                    ${items.map(item => `<li>${item}</li>`).join("")}
                  </ul>
                </div>
              ` : `<span class="text-muted small">View only</span>`}
            </div>
          `;

          const displayAddress = r.street && r.barangay ? `${r.street}, ${r.barangay}` : (r.address || "Cabuyao, Laguna");
          const riderBadge = isRiderOccupied ? `<span class="badge warn ms-1" style="font-size:9.5px; padding:1px 5px;" title="Currently doing another delivery">Busy</span>` : "";
          const statusCls = { Scheduled: "warn", "On the way": "info", Completed: "ok", Cancelled: "mute" }[r.status] || "mute";
          const typeBadge = orderTypeBadge(r.type);
          const rawDate = r.scheduled_date;
          const dateLabel = rawDate === today() ? "Today" : rawDate === addDays(1) ? "Tomorrow" : rawDate === addDays(-1) ? "Yesterday" : fmt(rawDate);

          return `<article class="ticket ${r.status.split(" ")[0]}">
            <div class="stub">
              <span class="stub-date"><i class="bi bi-calendar3"></i> ${esc(dateLabel)}</span>
              <b>${esc(r.time_slot)}</b>
            </div>
            <div class="tm">
              <div class="tt">
                <div class="tt-left">
                  <span class="ticket-order-badge">#${ord(r.order_id)}</span>
                  <strong>${esc(r.customer_name || nameOf(r) || "Unknown")}</strong>
                  ${typeBadge}
                  <span class="badge ${statusCls}">${esc(r.status)}</span>
                </div>
                ${actsHtml}
              </div>
              <div class="meta">
                <span class="meta-item addr" title="${esc(displayAddress)}"><i class="bi bi-geo-alt"></i> ${esc(displayAddress)}</span>
                <span class="meta-item" title="Contact"><i class="bi bi-telephone"></i> ${esc(r.contact || "—")}</span>
                ${(!isPickup || r.rider) ? `<span class="meta-item" title="Rider"><i class="bi bi-bicycle"></i> <b>${esc(r.rider || "Unassigned")}</b>${riderBadge}</span>` : ""}
                ${Number(r.fee) > 0 ? `<span class="meta-item" title="Fee"><i class="bi bi-cash"></i> ${peso(r.fee)}</span>` : ""}
              </div>
            </div>
          </article>`;
        };

        if (isDateSort) {
          const dayMap = new Map();
          list.forEach((r) => {
            const d = r.scheduled_date || "Unknown";
            if (!dayMap.has(d)) dayMap.set(d, []);
            dayMap.get(d).push(r);
          });

          return Array.from(dayMap.entries()).map(([d, runs]) => {
            const dayLabel = d === today() ? "Today" : d === addDays(1) ? "Tomorrow" : d === addDays(-1) ? "Yesterday" : fmt(d);
            const countLabel = `${runs.length} run${runs.length === 1 ? '' : 's'}`;
            return `<section class="day">
              <h2><span>${dayLabel} <small>${fmt(d)}</small></span><small class="badge bg-light text-dark border">${countLabel}</small></h2>
              ${runs.map(renderTicket).join("")}
            </section>`;
          }).join("");
        } else {
          return list.map(renderTicket).join("");
        }
      },
      validate(d) {
        const e = {};
        if (!d.order_id) e.order_id = "Please choose an order";
        else if (!EDIT) {
          const selectedOrder = orderOf(d.order_id);
          const isCompleted = String(selectedOrder?.order_status || "").trim().toLowerCase() === "completed" || Number(selectedOrder?.status_id) === 5;
          if (isCompleted) {
            e.order_id = "Completed orders cannot be scheduled for pickup or delivery runs";
          }
        }
        if (!d.street || !d.street.trim()) e.street = "Street address is required";
        if (!d.barangay) e.barangay = "Please select a barangay";
        const contactErr = validateContact(d.contact, "Contact number", true);
        if (contactErr) e.contact = contactErr;
        if (d.type === "Delivery" && !d.rider) e.rider = "Rider is required for delivery";
        return e;
      },
      payload: (d) => {
        const street = (d.street || "").trim();
        const barangay = (d.barangay || "").trim();
        return {
          order_id: +d.order_id,
          type: d.type,
          street,
          barangay,
          contact: (d.contact || "").trim(),
          scheduled_date: d.scheduled_date,
          time_slot: d.time_slot,
          rider: d.type === "Pickup" ? "" : d.rider,
          fee: d.fee === "" ? 0 : +d.fee,
          status: "Scheduled",
          notes: (d.notes || "").trim()
        };
      },
      delMsg: (r) => `Archive run for Order <strong>#${ord(r.order_id)}</strong>?`,
      async act(a, r) {
        if (a === "start") {
          if (!r.rider) return toast("Please assign a rider before starting the run.", 1);
          const busy = (S.rows || []).find((d) =>
            d.delivery_id !== r.delivery_id &&
            d.status === "On the way" &&
            (
              (r.rider_id && d.rider_id && Number(d.rider_id) === Number(r.rider_id)) ||
              (d.rider && r.rider && d.rider.toLowerCase().trim() === r.rider.toLowerCase().trim())
            )
          );
          if (busy) {
            return toast(`Rider ${r.rider} is currently occupied on an active delivery. Please wait until they return.`, 1);
          }
          return patch(r, { status: "On the way" }, "Run started.");
        }
        if (a === "done") {
          const isPickup = (r.type || "").toLowerCase() === "pickup";
          return patch(r, { status: "Completed" }, isPickup ? "Pickup completed." : "Run completed.");
        }
        if (a === "cancel") {
          const isPickup = (r.type || "").toLowerCase() === "pickup";
          const label = isPickup ? "pickup" : "run";
          if (await ask(`Cancel ${label}?`, `Cancel this <strong>${label}</strong>?`, `Cancel ${label}`)) {
            return patch(r, { status: "Cancelled" }, `${isPickup ? "Pickup" : "Run"} cancelled.`);
          }
        }
        if (a === "archive") {
          if (await ask("Archive Transport Run?", `Archive completed run for Order <strong>#${ord(r.order_id)}</strong>? It will be safely stored and removed from the active schedule.`, "Archive")) {
            const res = await fetch(`/api/deliveries/${r.delivery_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to archive delivery");
            toast(`Transport run archived successfully.`);
            await init();
          }
        }
      }
    },
    staff: {
      name: "staff", id: "staff_id", defaults: () => ({ role: "Cashier", status: "Active" }),
      filter: (rows, f) => rows.filter((r) => {
        const normStatus = (r.status === "Inactive" || r.status === "Deactivated") ? "deactivated" : (r.status || "Active").toLowerCase();
        return (!f.q || (r.full_name + " " + r.email + " " + (r.phone || "") + " " + r.role).toLowerCase().includes(f.q)) &&
               (!f.role || r.role.toLowerCase() === f.role) &&
               (!f.st || normStatus === f.st || (f.st === "deactivated" && (r.status || "").toLowerCase() === "inactive"));
      }).sort((a, b) => a.staff_id - b.staff_id),
      draw: (list) => {
        const isMgr = isManager();
        const currentStaff = getAuthStaff() || {};
        const activeManagers = (S.rows || []).filter(x => (x.role || "").toLowerCase() === "manager" && (x.status || "Active") === "Active" && !x.is_archived);
        const isSoleManager = activeManagers.length <= 1;

        return list.map((s) => {
          const roleBadgeCls = s.role === "Manager" ? "bad" : s.role === "Rider" ? "ok" : s.role === "Cashier" ? "warn" : s.role === "Washer" ? "info" : s.role === "Folder" ? "folding" : "mute";
          const statusCls = (s.status || "Active") === "Active" ? "ok" : "bad";
          const displayStatus = (s.status === "Inactive" || s.status === "Deactivated") ? "Deactivated" : (s.status || "Active");

          const isSelf = (currentStaff.staff_id && Number(currentStaff.staff_id) === Number(s.staff_id)) ||
                         (currentStaff.email && s.email && currentStaff.email.toLowerCase() === s.email.toLowerCase());
          const isSoleManagerSelf = isMgr && isSoleManager && isSelf && (s.role || "").toLowerCase() === "manager";

          const statusBadge = (isMgr && !isSoleManagerSelf)
            ? `<span class="badge status-clickable ${statusCls}" data-act="quick-status" data-id="${s.staff_id}" data-current="${esc(displayStatus)}" role="button" tabindex="0" title="Click to toggle status">${esc(displayStatus)}</span>`
            : `<span class="badge ${statusCls}" title="${isSoleManagerSelf ? 'Cannot change status of the only manager' : ''}">${esc(displayStatus)}</span>`;
          const items = [];
          if (isMgr && !isSoleManagerSelf) {
            items.push(`<button class="dropdown-item" data-act="edit" data-id="${s.staff_id}" type="button"><i class="bi bi-pencil me-2"></i>Edit</button>`);
            items.push(`<button class="dropdown-item text-danger" data-act="archive" data-id="${s.staff_id}" type="button"><i class="bi bi-archive me-2"></i>Archive</button>`);
          }
          const acts = actionsDropdown(items, isSoleManagerSelf ? "Sole Manager" : "View only");
          return `<tr><td><strong>#${s.staff_id}</strong></td><td><strong>${esc(s.full_name || `${s.first_name} ${s.last_name || ''}`)}</strong></td><td><span class="badge ${roleBadgeCls}">${esc(s.role)}</span></td><td>${esc(s.email)}</td><td>${esc(s.phone || '—')}</td><td>${statusBadge}</td><td>${acts}</td></tr>`;
        }).join("");
      },
      init: (f) => {
        const pwdHelp = $("#pwdHelp");
        if (pwdHelp) pwdHelp.textContent = EDIT ? "Leave blank to keep the current password." : "Enter a password of at least 8 characters.";
        const passwordInput = f.elements.password;
        if (passwordInput) passwordInput.required = !EDIT;
        const statusField = f.querySelector('[data-f="status"]');
        if (statusField) {
          statusField.style.display = EDIT ? "" : "none";
        }
        if (EDIT) {
          if (EDIT.first_name) f.elements.first_name.value = EDIT.first_name;
          if (EDIT.last_name) f.elements.last_name.value = EDIT.last_name;
          if (EDIT.role) f.elements.role.value = EDIT.role;
          if (EDIT.email) f.elements.email.value = EDIT.email;
          if (EDIT.phone) f.elements.phone.value = EDIT.phone;
          const currentSt = (EDIT.status === "Inactive" || EDIT.status === "Deactivated") ? "Deactivated" : "Active";
          setRadioValue(f, "status", currentSt);
          if (f.elements.password) f.elements.password.value = "";
        } else {
          setRadioValue(f, "status", "Active");
        }
      },
      validate(d) {
        const e = {};
        if (!d.first_name || !d.first_name.trim()) e.first_name = "First name is required";
        if (!d.last_name || !d.last_name.trim()) e.last_name = "Last name is required";
        if (!d.email || !d.email.trim()) {
          e.email = "Email is required";
        } else {
          const normEmail = d.email.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
            e.email = "Please enter a valid email address";
          } else if (Array.isArray(S.rows)) {
            const dup = S.rows.find(s => 
              s.email && s.email.toLowerCase() === normEmail && (!EDIT || Number(s.staff_id) !== Number(EDIT.staff_id))
            );
            if (dup) {
              e.email = "A staff member with this email address already exists. Please use a unique email.";
            }
          }
        }
        if (!d.role) e.role = "Role is required";
        if (!EDIT && (!d.password || d.password.length < 8)) {
          e.password = "Password must be at least 8 characters long";
        } else if (EDIT && d.password && d.password.length < 8) {
          e.password = "Password must be at least 8 characters long";
        }
        if (d.phone && d.phone.trim()) {
          const phoneErr = validateContact(d.phone, "Contact number", false);
          if (phoneErr) e.phone = phoneErr;
        }
        return e;
      },
      payload: (d) => {
        let rawStatus = EDIT ? (d.status || EDIT.status || "Active") : "Active";
        if (rawStatus === "Inactive") rawStatus = "Deactivated";
        const data = {
          first_name: (d.first_name || "").trim(),
          last_name: (d.last_name || "").trim(),
          role: d.role || "Cashier",
          email: (d.email || "").trim().toLowerCase(),
          phone: (d.phone || "").trim(),
          status: rawStatus
        };
        if (d.password && d.password.trim()) {
          data.password = d.password.trim();
        }
        return data;
      },
      delMsg: (r) => `Archive staff account for <strong>"${esc(r.full_name)}"</strong>?`,
      async act(a, r) {
        if (a === "archive") {
          const currentStaff = getAuthStaff() || {};
          const activeManagers = (S.rows || []).filter(x => (x.role || "").toLowerCase() === "manager" && (x.status || "Active") === "Active" && !x.is_archived);
          const isSelf = (currentStaff.staff_id && Number(currentStaff.staff_id) === Number(r.staff_id)) ||
                         (currentStaff.email && r.email && currentStaff.email.toLowerCase() === r.email.toLowerCase());
          if (activeManagers.length <= 1 && isSelf && (r.role || "").toLowerCase() === "manager") {
            return toast("A manager cannot archive their own account when they are the only manager.", 1);
          }
          if (await ask("Archive Staff Member?", `Archive staff account for <strong>"${esc(r.full_name)}"</strong> (${esc(r.role)})? The account will be deactivated without affecting historical order records.`, "Archive")) {
            const res = await fetch(`/api/staff/${r.staff_id}/archive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || "Failed to archive staff");
            }
            toast(`Staff account "${r.full_name}" archived successfully.`);
            await init();
          }
        }
      }
    }
  };
  const ENT = entityModules; // Shorthand alias for entity modules

  if($("#view")) {
    $("#view").addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-act]"); if (!b) return;
      const e = ENT[cur], a = b.dataset.act;
      if(a === "clear") { document.querySelectorAll("[data-flt]").forEach((i) => (i.value = "")); return draw(); }
      const r = S.rows.find((x) => x[e.id] == b.dataset.id);
      if (a === "quick-status" && r) {
        if (cur === "services") {
          const isAct = (r.status || "Active").toLowerCase() === "active";
          if (isAct) {
            if (await ask(
              "Discontinue Service?",
              `Discontinue laundry service <strong>"${esc(r.service_name)}"</strong>? It will be moved to the Discontinued Services table and hidden from new order creation.`,
              "Discontinue"
            )) {
              const res = await fetch(`/api/services/${r.service_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
              if (!res.ok) throw new Error("Failed to toggle service status");
              toast(`Service "${r.service_name}" discontinued.`);
              await init();
            }
          } else {
            if (await ask(
              "Reactivate Service?",
              `Reactivate laundry service <strong>"${esc(r.service_name)}"</strong>? It will be restored to active services and available for new orders.`,
              "Reactivate"
            )) {
              const res = await fetch(`/api/services/${r.service_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
              if (!res.ok) throw new Error("Failed to toggle service status");
              toast(`Service "${r.service_name}" reactivated.`);
              await init();
            }
          }
          return;
        }
        if (cur === "customers") {
          const next = (r.status || "Active") === "Active" ? "Inactive" : "Active";
          if (await ask("Change Customer Status", `Update status for <strong>"${esc(r.full_name)}"</strong> to <strong>"${next}"</strong>?`, "Update Status")) {
            await patch(r, { status: next }, `Customer status updated to ${next}.`);
          }
          return;
        }
        if (cur === "staff") {
          const currentStaff = getAuthStaff() || {};
          const activeManagers = (S.rows || []).filter(x => (x.role || "").toLowerCase() === "manager" && (x.status || "Active") === "Active" && !x.is_archived);
          const isSelf = (currentStaff.staff_id && Number(currentStaff.staff_id) === Number(r.staff_id)) ||
                         (currentStaff.email && r.email && currentStaff.email.toLowerCase() === r.email.toLowerCase());
          if (activeManagers.length <= 1 && isSelf && (r.role || "").toLowerCase() === "manager") {
            return toast("A manager cannot change the status of their own account when they are the only manager.", 1);
          }
          const isAct = (r.status || "Active") === "Active";
          const next = isAct ? "Deactivated" : "Active";
          const actWord = next === "Deactivated" ? "Deactivate" : "Activate";
          if (await ask(`${actWord} Staff Account?`, `${actWord} account for <strong>"${esc(r.full_name)}"</strong>? ${next === 'Deactivated' ? 'They will not be able to log in until reactivated.' : 'They will be able to log in.'}`, actWord)) {
            const res = await fetch(`/api/staff/${r.staff_id}/toggle-status`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || "Failed to update staff status");
            }
            toast(`Staff member "${r.full_name}" status updated to ${next}.`);
            await init();
          }
          return;
        }
        if (cur === "orders" || cur === "history") {
          const curr = r.order_status || "Received";
          const isDelivery = String(r.release_type || b.dataset.release || "").toLowerCase() === "delivery";
          const statusMap = {
            "Received": 1,
            "Washing": 2,
            "Folding": 6,
            "Ready for Pickup": 3,
            "Out for Delivery": 4,
            "Completed": 5
          };
          if (isProductionStaff()) {
            if (curr !== "Received" && curr !== "Washing" && curr !== "Folding") {
              const maxLabel = isDelivery ? "'Out for Delivery'" : "'Ready for Pickup'";
              return toast(`Washers and Folders can only update orders up to ${maxLabel}.`, 1);
            }
            const next = curr === "Received" ? "Washing" : curr === "Washing" ? "Folding" : (isDelivery ? "Out for Delivery" : "Ready for Pickup");
            const nextId = statusMap[next];
            if (await ask("Update Order Status", `Advance Order <strong>#${ord(r.order_id)}</strong> from "${curr}" to <strong>"${next}"</strong>?`, "Update Status")) {
              await patch(r, { order_status: next, status_id: nextId }, `Order #${ord(r.order_id)} status updated to ${next}.`);
            }
            return;
          }
          if (isRider()) {
            return toast("Riders update order status via Pickup & Delivery runs.", 1);
          }
          const steps = isDelivery
            ? ["Received", "Washing", "Folding", "Out for Delivery", "Completed"]
            : ["Received", "Washing", "Folding", "Ready for Pickup", "Completed"];
          const idx = steps.indexOf(curr);
          let next;
          if (idx !== -1) {
            next = steps[(idx + 1) % steps.length];
          } else if (isDelivery && curr === "Ready for Pickup") {
            next = "Out for Delivery";
          } else if (!isDelivery && curr === "Out for Delivery") {
            next = "Completed";
          } else {
            next = steps[0];
          }
          const nextId = statusMap[next];
          if (await ask("Update Order Status", `Advance Order <strong>#${ord(r.order_id)}</strong> from "${curr}" to <strong>"${next}"</strong>?`, "Update Status")) {
            await patch(r, { order_status: next, status_id: nextId }, `Order #${ord(r.order_id)} status updated to ${next}.`);
          }
          return;
        }
      }
      if (a === "quick-payment-status" && r) {
        if (!isManager()) {
          return toast("Only Managers can update payment status.", 1);
        }
        const curr = r.status || "Paid";
        const isPaid = curr === "Paid";
        const next = isPaid ? "Pending" : "Paid";
        const modalTitle = isPaid ? "Mark Payment as Pending?" : "Confirm Payment as Paid?";
        const modalMsg = isPaid
          ? `Change status of payment <strong>#${pay(r.payment_id)} of ${peso(r.amount || r.amount_paid)}</strong> for Order <strong>#${ord(r.order_id)}</strong> to <strong>Pending</strong>?`
          : `Mark payment <strong>#${pay(r.payment_id)} of ${peso(r.amount || r.amount_paid)}</strong> for Order <strong>#${ord(r.order_id)}</strong> as <strong>Paid</strong>?`;
        const confirmBtn = isPaid ? "Mark Pending" : "Mark Paid";

        if (await ask(modalTitle, modalMsg, confirmBtn)) {
          try {
            const res = await fetch(`/api/payments/${r.payment_id}/toggle-status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...getAuthHeaders() }
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || "Failed to update payment status");
            }
            toast(`Payment #${pay(r.payment_id)} marked as ${next}.`);
            await init();
          } catch (err) {
            toast(err.message, 1);
          }
        }
        return;
      }
      if (a === "invoice" || a === "receipt") {
        const isInvoice = a === "invoice" || cur === "orders" || cur === "history";
        if (cur === "payments") return openReceipt({ paymentId: b.dataset.id, isInvoice: false });
        return openReceipt({ orderId: b.dataset.id, isInvoice });
      }
      if (a === "add") return openForm();
      if (a === "edit") {
        if (cur === "staff" && r) {
          const currentStaff = getAuthStaff() || {};
          const activeManagers = (S.rows || []).filter(x => (x.role || "").toLowerCase() === "manager" && (x.status || "Active") === "Active" && !x.is_archived);
          const isSelf = (currentStaff.staff_id && Number(currentStaff.staff_id) === Number(r.staff_id)) ||
                         (currentStaff.email && r.email && currentStaff.email.toLowerCase() === r.email.toLowerCase());
          if (activeManagers.length <= 1 && isSelf && (r.role || "").toLowerCase() === "manager") {
            return toast("A manager cannot edit their own account when they are the only manager.", 1);
          }
        }
        return openForm(r);
      }
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
    $("#view").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        const b = ev.target.closest(".status-clickable, [role='button'][tabindex='0']");
        if (b && b.dataset.act) {
          ev.preventDefault();
          b.click();
        }
      }
    });
  }

  async function openReceipt({ paymentId, orderId, isInvoice } = {}) {
    try {
      let payment = null;
      let order = null;

      if (paymentId) {
        payment = await db.list(`payments/${paymentId}`).catch(() => null);
        if (!payment) payment = S.rows.find((p) => p.payment_id == paymentId);
        if (payment && payment.order_id) {
          order = await db.list(`orders/${payment.order_id}`).catch(() => null);
          if (!order) order = orderOf(payment.order_id);
          if (order && Array.isArray(order.payments)) {
            const matched = order.payments.find((p) => p.payment_id == paymentId);
            if (matched) payment = { ...payment, ...matched };
          }
        }
      } else if (orderId) {
        order = await db.list(`orders/${orderId}`).catch(() => null);
        if (!order) order = orderOf(orderId);
        if (order && order.payments && order.payments.length > 0) {
          const activePayments = order.payments.filter((p) => !p.is_archived);
          payment = activePayments[0] || order.payments[0];
        }
      }

      if (!payment && !order) {
        return toast((isInvoice ? "Invoice" : "Receipt") + " data could not be found.", 1);
      }

      const isInv = Boolean(isInvoice);
      const payId = payment ? pay(payment.payment_id) : "REC-" + ord(order?.order_id || 0).replace("ORD-", "");
      const ordId = order ? ord(order.order_id) : (payment ? ord(payment.order_id) : "ORD-0000");
      const docTitle = isInv ? "OFFICIAL INVOICE" : "OFFICIAL RECEIPT";
      const docNumLabel = isInv ? "Invoice #:" : "Receipt #:";
      const docNumVal = isInv ? `INV-${String(ordId).replace('ORD-', '')}` : payId;
      const modalTitleText = isInv ? "Official Invoice" : "Official Receipt";
      const modalTitleIcon = isInv ? "bi-file-earmark-text" : "bi-receipt";
      const printBtnText = isInv ? "Print Invoice" : "Print Receipt";
      const rawDate = payment ? (payment.paid_at || payment.payment_date) : (order ? order.order_date : today());
      const receiptDate = formatDate(rawDate);
      const staffName = (order && order.staff_name) || ((getAuthStaff() || {}).full_name) || "Staff on duty";
      const customerName = (payment && payment.customer_name) || (order && order.customer_name) || (order && nameOf(order)) || "Valued Customer";
      const contact = (payment && payment.contact) || (order && order.contact) || (order && order.customer_phone) || "N/A";
      const releaseType = (order && order.release_type) || "Pickup";
      const address = (order && (order.street || order.barangay || order.address)) ? `${order.street ? order.street + ', ' : ''}${order.barangay ? order.barangay + ', ' : ''}${order.address || ''}`.replace(/,\s*,/g, ', ').replace(/^,\s*|,\s*$/g, '').trim() : "";

      const orderTotal = Number((order && (order.total !== undefined ? order.total : order.total_amount)) || (payment && (payment.amount_paid !== undefined ? payment.amount_paid : payment.amount)) || 0);

      const paymentsList = (order && Array.isArray(order.payments)) ? order.payments : (payment ? [payment] : []);
      const activePayments = paymentsList.filter((p) => !p.is_archived);
      const paidPayments = activePayments.filter((p) => (p.status || "Paid") === "Paid");
      const totalPaidAmount = paidPayments.reduce((s, p) => s + Number(p.amount_paid !== undefined ? p.amount_paid : (p.amount || 0)), 0);

      // Payment status
      let pStatus = "Unpaid";
      if (payment && payment.status === "Refunded") {
        pStatus = "Refunded";
      } else if (order && order.payment_status === "Refunded") {
        pStatus = "Refunded";
      } else if (activePayments.length > 0 && activePayments.every((p) => p.status === "Refunded")) {
        pStatus = "Refunded";
      } else if (payment && payment.status === "Pending" && totalPaidAmount <= 0) {
        pStatus = "Pending";
      } else if ((order && order.payment_status === "Paid") || (totalPaidAmount >= orderTotal && orderTotal > 0)) {
        pStatus = "Paid";
      } else if (payment && payment.status === "Paid" && activePayments.length <= 1 && totalPaidAmount > 0) {
        pStatus = "Paid";
      } else {
        pStatus = (order && order.payment_status) ? order.payment_status : "Unpaid";
      }

      const isPaid = pStatus === "Paid";
      const isRefunded = pStatus === "Refunded";
      const isPending = pStatus === "Pending";

      let amountPaid = 0;
      let balanceDue = orderTotal;
      if (isPaid) {
        amountPaid = totalPaidAmount > 0 ? totalPaidAmount : orderTotal;
        balanceDue = 0;
      } else if (isRefunded) {
        amountPaid = 0;
        balanceDue = orderTotal;
      } else if (isPending) {
        amountPaid = 0;
        balanceDue = orderTotal;
      } else {
        amountPaid = totalPaidAmount;
        balanceDue = Math.max(0, orderTotal - totalPaidAmount);
      }

      const paymentMethod = (payment && (payment.payment_method || payment.method)) || (isPaid ? "Cash" : "N/A");
      const refNo = payment ? (payment.reference_no || "") : "";

      let items = (order && Array.isArray(order.items) && order.items.length > 0) ? order.items : [];
      let itemsHtml = "";
      if (items.length > 0) {
        itemsHtml = items.map((it, idx) => `
          <tr>
            <td class="text-center text-muted" style="width: 45px;">${idx + 1}</td>
            <td>
              <div class="fw-semibold">${esc(it.service_name || 'Laundry Service')}</div>
              ${it.notes ? `<div class="text-muted small" style="font-size: 11.5px;">${esc(it.notes)}</div>` : ''}
            </td>
            <td class="text-center">${Number(it.weight_kg || 1).toFixed(2)} kg</td>
            <td class="text-end fw-semibold">${peso(it.subtotal || 0)}</td>
          </tr>
        `).join("");
      } else {
        itemsHtml = `
          <tr>
            <td class="text-center text-muted" style="width: 45px;">1</td>
            <td>
              <div class="fw-semibold">Standard Laundry Service</div>
              <div class="text-muted small" style="font-size: 11.5px;">Wash, Dry & Fold</div>
            </td>
            <td class="text-center">1 load</td>
            <td class="text-end fw-semibold">${peso(orderTotal)}</td>
          </tr>
        `;
      }

      let modalEl = $("#receiptModal");
      if (!modalEl) {
        modalEl = document.createElement("div");
        modalEl.id = "receiptModal";
        modalEl.className = "modal fade";
        modalEl.tabIndex = -1;
        modalEl.setAttribute("aria-labelledby", "receiptModalTitle");
        modalEl.setAttribute("aria-hidden", "true");
        modalEl.innerHTML = `
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow">
              <div class="modal-header border-0 pb-0">
                <h2 class="modal-title fs-5 fw-bold" id="receiptModalTitle"><i class="bi bi-file-earmark-text me-2 text-primary"></i>Official Invoice</h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-3 p-md-4" id="receiptModalBody">
              </div>
              <div class="modal-footer border-0 pt-0 justify-content-between">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-primary" id="receiptPrintBtn"><i class="bi bi-printer me-1"></i> Print</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modalEl);

        modalEl.querySelector("#receiptPrintBtn").addEventListener("click", () => {
          window.print();
        });
      } else {
        const dialog = modalEl.querySelector(".modal-dialog");
        if (dialog && !dialog.classList.contains("modal-lg")) {
          dialog.classList.add("modal-lg");
        }
      }

      // Invoice modal header
      const titleEl = modalEl.querySelector("#receiptModalTitle");
      if (titleEl) titleEl.innerHTML = `<i class="bi ${modalTitleIcon} me-2 text-primary"></i>${modalTitleText}`;
      const printBtn = modalEl.querySelector("#receiptPrintBtn");
      if (printBtn) printBtn.innerHTML = `<i class="bi bi-printer me-1"></i> ${printBtnText}`;

      let statusBadgeStyle = "background: rgba(100, 116, 139, 0.12); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.25);";
      if (isPaid) {
        statusBadgeStyle = "background: rgba(46, 125, 50, 0.12); color: #2e7d32; border: 1px solid rgba(46, 125, 50, 0.25);";
      } else if (isRefunded) {
        statusBadgeStyle = "background: rgba(211, 47, 47, 0.12); color: #d32f2f; border: 1px solid rgba(211, 47, 47, 0.25);";
      } else if (isPending) {
        statusBadgeStyle = "background: rgba(178, 94, 0, 0.12); color: #b25e00; border: 1px solid rgba(178, 94, 0, 0.25);";
      }

      $("#receiptModalBody").innerHTML = `
        <div class="invoice-container">
          <div class="invoice-paper" id="receiptPrintArea">
            <div class="invoice-header">
              <div class="invoice-brand">
                <div class="invoice-brand-title">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--magma-500)" stroke-width="2.5" class="invoice-icon"><path d="M2 12h4l2-9 5 18 3-10h6"></path></svg>
                  <span>The Floor Is <strong>Laba.</strong></span>
                </div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Professional Laundry & Dry Cleaning Services</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; line-height: 1.5;">
                  Poblacion, Cabuyao, Laguna, Philippines<br>
                  Tel: 0917-123-4567 • Email: support@floorislaba.ph<br>
                  VAT Reg. TIN: 432-891-000-000
                </div>
              </div>
              
              <div class="invoice-meta">
                <div class="invoice-title">${docTitle}</div>
                <div class="invoice-number">${docNumLabel} ${esc(docNumVal)}</div>
                <div style="margin-top: 8px;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; ${statusBadgeStyle}">
                    ${esc(pStatus)}
                  </span>
                </div>
              </div>
            </div>

            <hr class="invoice-divider">

            <div class="invoice-details-grid">
              <div>
                <div class="invoice-section-title">Billed To</div>
                <div style="font-size: 15px; font-weight: 700;">${esc(customerName)}</div>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">
                  <i class="bi bi-telephone me-1"></i> ${esc(contact)}
                </div>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">
                  <i class="bi bi-box-seam me-1"></i> Fulfillment: <strong>${esc(releaseType)}</strong>
                </div>
                ${address ? `<div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;"><i class="bi bi-geo-alt me-1"></i> ${esc(address)}</div>` : ''}
              </div>

              <div>
                <div class="invoice-section-title">Invoice Details</div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                  <span style="color: var(--text-muted);">Order ID:</span>
                  <span style="font-weight: 600;">${esc(ordId)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                  <span style="color: var(--text-muted);">Payment Status:</span>
                  <span style="display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; ${statusBadgeStyle}">${esc(pStatus)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                  <span style="color: var(--text-muted);">Issue Date:</span>
                  <span>${esc(receiptDate)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                  <span style="color: var(--text-muted);">Payment Method:</span>
                  <span>${esc(paymentMethod)}</span>
                </div>
                ${refNo ? `
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                  <span style="color: var(--text-muted);">Reference #:</span>
                  <span class="font-monospace">${esc(refNo)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0;">
                  <span style="color: var(--text-muted);">Attending Staff:</span>
                  <span>${esc(staffName)}</span>
                </div>
              </div>
            </div>

            <div class="invoice-table-wrap">
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 45px;">#</th>
                    <th>Service Description</th>
                    <th class="text-center" style="width: 140px;">Quantity / Weight</th>
                    <th class="text-end" style="width: 130px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="invoice-summary-wrapper">
              <div class="invoice-summary-card">
                <div class="invoice-summary-row">
                  <span style="color: var(--text-muted);">Order Subtotal:</span>
                  <span>${peso(orderTotal)}</span>
                </div>
                <div class="invoice-summary-row">
                  <span style="color: var(--text-muted);">Amount Paid:</span>
                  <span style="font-weight: 600; color: ${isPaid ? '#2e7d32' : (isRefunded ? '#d32f2f' : 'inherit')};">
                    ${peso(amountPaid)}${isRefunded ? ' (Refunded)' : (isPending ? ' (Pending)' : '')}
                  </span>
                </div>
                <div class="invoice-summary-row total-row">
                  <span>${isPaid ? 'Total Amount:' : 'Balance Due:'}</span>
                  <span style="color: ${isPaid ? 'inherit' : 'var(--magma-600)'};">${peso(isPaid ? orderTotal : balanceDue)}</span>
                </div>
                ${isRefunded ? `
                <div style="margin-top: 12px; padding: 10px 12px; background: rgba(211, 47, 47, 0.08); border: 1px solid rgba(211, 47, 47, 0.22); border-radius: 6px; font-size: 12px; color: #d32f2f; line-height: 1.45;">
                  <i class="bi bi-info-circle-fill me-1"></i> <strong>Payment Refunded:</strong> The payment record associated with this transaction was refunded. The balance remains due.
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      openModal(modalEl);
    } catch (err) {
      toast("Failed to generate receipt: " + err.message, 1);
    }
  }

  if($("#cancel")) $("#cancel").addEventListener("click", () => closeModal($("#dlg")));
  if($("#form")) {
    $("#form").addEventListener("change", (ev) => {
      const field = ev.target.closest(".field");
      if (field && field.classList.contains("invalid") && ev.target.value) {
        field.classList.remove("invalid");
        const errEl = field.querySelector(".err");
        if (errEl) errEl.textContent = "";
      }
      ENT[cur]?.change && ENT[cur].change(ev);
    });
    $("#form").addEventListener("input", (ev) => {
      const field = ev.target.closest(".field");
      if (ev.target.name === "contact" || ev.target.name === "phone") {
        const val = ev.target.value;
        if (field) {
          if (/[a-zA-Z]/.test(val)) {
            field.classList.add("invalid");
            let errEl = field.querySelector(".err");
            if (!errEl) { errEl = document.createElement("div"); errEl.className = "err"; field.appendChild(errEl); }
            errEl.textContent = "Contact number cannot contain letters";
          } else if (val && !/^\+?[0-9\s-]*$/.test(val)) {
            field.classList.add("invalid");
            let errEl = field.querySelector(".err");
            if (!errEl) { errEl = document.createElement("div"); errEl.className = "err"; field.appendChild(errEl); }
            errEl.textContent = "Contact number cannot contain symbols";
          } else {
            const digits = val.replace(/\D/g, "");
            if (digits.length > 11) {
              field.classList.add("invalid");
              let errEl = field.querySelector(".err");
              if (!errEl) { errEl = document.createElement("div"); errEl.className = "err"; field.appendChild(errEl); }
              errEl.textContent = "Please enter a valid 11-digit mobile number (e.g. 0917XXXXXXX)";
            } else if (digits.length === 11 && !digits.startsWith("09")) {
              field.classList.add("invalid");
              let errEl = field.querySelector(".err");
              if (!errEl) { errEl = document.createElement("div"); errEl.className = "err"; field.appendChild(errEl); }
              errEl.textContent = "Contact number should start with 09 (e.g. 0917XXXXXXX)";
            } else if (digits.length === 11 && digits.startsWith("09")) {
              field.classList.remove("invalid");
              const errEl = field.querySelector(".err");
              if (errEl) errEl.textContent = "";
            } else if (field.classList.contains("invalid")) {
              const currentErr = field.querySelector(".err")?.textContent || "";
              if (!currentErr.includes("11-digit") && !currentErr.includes("start with 09")) {
                field.classList.remove("invalid");
                const errEl = field.querySelector(".err");
                if (errEl) errEl.textContent = "";
              }
            }
          }
        }
      } else if (field && field.classList.contains("invalid") && ev.target.value.trim()) {
        field.classList.remove("invalid");
        const errEl = field.querySelector(".err");
        if (errEl) errEl.textContent = "";
      }
      if (cur === "orders" && (ev.target.name === "weight_kg" || ev.target.name === "service_id")) {
        ENT.orders.calcTotal();
      }
      if (cur === "orders" && (ev.target.name === "first_name" || ev.target.name === "last_name")) {
        ENT.orders.change(ev);
      }
    });
    $("#form").addEventListener("blur", (ev) => {
      if (ev.target.name === "contact" || ev.target.name === "phone") {
        const isReq = ev.target.hasAttribute("required");
        const err = validateContact(ev.target.value, "Contact number", isReq);
        const field = ev.target.closest(".field");
        if (field) {
          field.classList.toggle("invalid", !!err);
          let errEl = field.querySelector(".err");
          if (err) {
            if (!errEl) { errEl = document.createElement("div"); errEl.className = "err"; field.appendChild(errEl); }
            errEl.textContent = err;
          } else if (errEl) {
            errEl.textContent = "";
          }
        }
      }
      if (cur === "staff" && ev.target.name === "email") {
        const val = (ev.target.value || "").trim().toLowerCase();
        let err = "";
        if (!val) {
          err = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          err = "Please enter a valid email address";
        } else if (Array.isArray(S.rows)) {
          const dup = S.rows.find(s => 
            s.email && s.email.toLowerCase() === val && (!EDIT || Number(s.staff_id) !== Number(EDIT.staff_id))
          );
          if (dup) err = "A staff member with this email address already exists. Please use a unique email.";
        }
        const field = ev.target.closest(".field");
        if (field) {
          field.classList.toggle("invalid", !!err);
          let errEl = field.querySelector(".err");
          if (err) {
            if (!errEl) { errEl = document.createElement("div"); errEl.className = "err"; field.appendChild(errEl); }
            errEl.textContent = err;
          } else if (errEl) {
            errEl.textContent = "";
          }
        }
      }
    }, true);
    $("#form").addEventListener("input", (ev) => {
      if (cur === "staff" && ev.target.name === "email") {
        const field = ev.target.closest(".field");
        if (field && field.classList.contains("invalid")) {
          const val = (ev.target.value || "").trim().toLowerCase();
          const dup = Array.isArray(S.rows) && S.rows.find(s => 
            s.email && s.email.toLowerCase() === val && (!EDIT || Number(s.staff_id) !== Number(EDIT.staff_id))
          );
          if (!dup && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            field.classList.remove("invalid");
            const errEl = field.querySelector(".err");
            if (errEl) errEl.textContent = "";
          }
        }
      }
    });
    $("#form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const e = ENT[cur], d = Object.fromEntries(new FormData(ev.target));
      ev.target.querySelectorAll("[data-lock]").forEach((i) => { if (EDIT) d[i.name] = EDIT[i.name]; });
      const errors = e.validate ? e.validate(d) : {};
      if (!setErrors(errors)) {
        const firstErr = Object.values(errors)[0] || "Please fill in all required fields.";
        toast(firstErr, 1);
        const firstInvalid = ev.target.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      try {
        const saved = await db.save(e.name, EDIT && EDIT[e.id], e.payload(d));
        closeModal($("#dlg"));
        const entityLabel = M.one ? (M.one.charAt(0).toUpperCase() + M.one.slice(1)) : "Record";
        const msg = EDIT ? `${entityLabel} updated successfully.` : `New ${M.one || 'record'} created successfully.`;
        toast(msg);
        await init();
        if (cur === "payments" && !EDIT && saved && (saved.payment_id || saved.id)) {
          openReceipt({ paymentId: saved.payment_id || saved.id });
        }
      } catch (err) {
        toast(err.message, 1);
        if (err.field) {
          setErrors({ [err.field]: err.message });
          if (ev.target.elements[err.field]) ev.target.elements[err.field].focus();
        } else if (err.message && /email/i.test(err.message)) {
          setErrors({ email: err.message });
          if (ev.target.elements.email) ev.target.elements.email.focus();
        }
      }
    });
  }

  // Dashboard init
  async function initDashboard() {
    try {
      const res = await fetch("/api/dashboard/summary", { headers: getAuthHeaders() });
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
          tbody.innerHTML = `
            <tr class="empty-row">
              <td colspan="5" class="text-center py-5 empty-cell">
                <div class="empty-placeholder">
                  <div class="empty-icon"><i class="bi bi-inbox"></i></div>
                  <h5>No orders recorded yet</h5>
                  <p>When new laundry orders are placed, they will appear here.</p>
                </div>
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = data.latest_orders.map(o => `
            <tr>
              <td><strong>${ord(o.order_id)}</strong></td>
              <td>${esc(o.customer_name)}</td>
              <td>${formatDate(o.order_date || o.formatted_date)}</td>
              <td>${orderStatusBadge(o.order_status, o.order_id, o.release_type)}</td>
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
              const isDelivery = String(b.dataset.release || "").toLowerCase() === "delivery";
              const statusMap = {
                "Received": 1,
                "Washing": 2,
                "Folding": 6,
                "Ready for Pickup": 3,
                "Out for Delivery": 4,
                "Completed": 5
              };
              if (isProductionStaff()) {
                if (curr !== "Received" && curr !== "Washing" && curr !== "Folding") {
                  const maxLabel = isDelivery ? "'Out for Delivery'" : "'Ready for Pickup'";
                  return toast(`Washers and Folders can only update orders up to ${maxLabel}.`, 1);
                }
                const next = curr === "Received" ? "Washing" : curr === "Washing" ? "Folding" : (isDelivery ? "Out for Delivery" : "Ready for Pickup");
                const nextId = statusMap[next];
                if (await ask("Update Order Status", `Advance Order <strong>#${ord(orderId)}</strong> from "${curr}" to <strong>"${next}"</strong>?`, "Update Status")) {
                  try {
                    const res = await fetch(`/api/orders/${orderId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({ order_status: next, status_id: nextId })
                    });
                    if (!res.ok) throw new Error("Failed to update status");
                    toast(`Order #${ord(orderId)} status updated to ${next}.`);
                    await initDashboard();
                  } catch (err) {
                    toast(err.message, 1);
                  }
                }
                return;
              }
              if (isRider()) {
                return toast("Riders update order status via Pickup & Delivery runs.", 1);
              }
              const steps = isDelivery
                ? ["Received", "Washing", "Folding", "Out for Delivery", "Completed"]
                : ["Received", "Washing", "Folding", "Ready for Pickup", "Completed"];
              const idx = steps.indexOf(curr);
              let next;
              if (idx !== -1) {
                next = steps[(idx + 1) % steps.length];
              } else if (isDelivery && curr === "Ready for Pickup") {
                next = "Out for Delivery";
              } else if (!isDelivery && curr === "Out for Delivery") {
                next = "Completed";
              } else {
                next = steps[0];
              }
              const nextId = statusMap[next];
              if (await ask("Update Order Status", `Advance Order <strong>#${ord(orderId)}</strong> from "${curr}" to <strong>"${next}"</strong>?`, "Update Status")) {
                try {
                  const res = await fetch(`/api/orders/${orderId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    body: JSON.stringify({ order_status: next, status_id: nextId })
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

  async function initArchive() {
    const isMgr = isManager();
    const staffSection = $("#section-staff");
    const staffOpt = $("#opt-staff");
    const staffChip = $("#chip-staff");
    if (!isMgr) {
      if (staffSection) staffSection.style.display = "none";
      if (staffOpt) staffOpt.style.display = "none";
      if (staffChip) staffChip.style.display = "none";
    }

    let allData = { orders: [], payments: [], deliveries: [], customers: [], staff: [] };

    async function loadArchiveData() {
      try {
        const [orders, payments, deliveries, customers, staffList] = await Promise.all([
          db.list("orders?include_archived=true").catch(() => []),
          db.list("payments?include_archived=true").catch(() => []),
          db.list("deliveries?include_archived=true").catch(() => []),
          db.list("customers?include_archived=true").catch(() => []),
          isMgr ? db.list("staff?include_archived=true").catch(() => []) : Promise.resolve([])
        ]);

        allData.orders = (orders || []).filter(o => Boolean(o.is_archived));
        allData.payments = (payments || []).filter(p => Boolean(p.is_archived));
        allData.deliveries = (deliveries || []).filter(d => Boolean(d.is_archived));
        allData.customers = (customers || []).filter(c => Boolean(c.is_archived));
        allData.staff = (staffList || []).filter(s => Boolean(s.is_archived));

        renderArchivedTables();
      } catch (err) {
        toast("Error loading archived records: " + err.message, 1);
      }
    }

    function renderArchivedTables() {
      const q = ($("#arch_q")?.value || "").trim().toLowerCase();
      const selCat = ($("#arch_cat")?.value || "").trim().toLowerCase();

      // Update counters
      const totalCount = allData.orders.length + allData.payments.length + allData.deliveries.length + allData.customers.length + (isMgr ? allData.staff.length : 0);
      if ($("#count-all")) $("#count-all").textContent = totalCount;
      if ($("#count-orders")) $("#count-orders").textContent = allData.orders.length;
      if ($("#count-payments")) $("#count-payments").textContent = allData.payments.length;
      if ($("#count-deliveries")) $("#count-deliveries").textContent = allData.deliveries.length;
      if ($("#count-customers")) $("#count-customers").textContent = allData.customers.length;
      if ($("#count-staff")) $("#count-staff").textContent = allData.staff.length;

      if ($("#badge-orders")) $("#badge-orders").textContent = allData.orders.length;
      if ($("#badge-payments")) $("#badge-payments").textContent = allData.payments.length;
      if ($("#badge-deliveries")) $("#badge-deliveries").textContent = allData.deliveries.length;
      if ($("#badge-customers")) $("#badge-customers").textContent = allData.customers.length;
      if ($("#badge-staff")) $("#badge-staff").textContent = allData.staff.length;

      // Filter lists
      const filteredOrders = allData.orders.filter(o => {
        if (!q) return true;
        const text = `${ord(o.order_id)} ${o.customer_name || ''} ${o.release_type || ''} ${o.order_status || ''} ${o.payment_status || ''}`.toLowerCase();
        return text.includes(q);
      });

      const filteredPayments = allData.payments.filter(p => {
        if (!q) return true;
        const text = `${pay(p.payment_id)} ${ord(p.order_id)} ${p.customer_name || ''} ${p.method || p.payment_method || ''} ${p.reference_no || ''} ${p.status || ''}`.toLowerCase();
        return text.includes(q);
      });

      const filteredDeliveries = allData.deliveries.filter(d => {
        if (!q) return true;
        const text = `${ord(d.order_id)} ${d.type || ''} ${d.rider || ''} ${d.customer_name || ''} ${d.address || ''} ${d.street || ''} ${d.barangay || ''} ${d.status || ''}`.toLowerCase();
        return text.includes(q);
      });

      const filteredCustomers = allData.customers.filter(c => {
        if (!q) return true;
        const text = `${c.full_name || `${c.first_name || ''} ${c.last_name || ''}`} ${c.contact || c.phone || ''} ${c.street_address || ''} ${c.barangay || ''} ${c.address || ''}`.toLowerCase();
        return text.includes(q);
      });

      const filteredStaff = allData.staff.filter(s => {
        if (!q) return true;
        const text = `#${s.staff_id} ${s.full_name || `${s.first_name || ''} ${s.last_name || ''}`} ${s.role || ''} ${s.email || ''} ${s.phone || ''}`.toLowerCase();
        return text.includes(q);
      });

      // Filter sections
      const showSection = (secId, catKey) => {
        const sec = $(secId);
        if (!sec) return;
        if (catKey === "staff" && !isMgr) {
          sec.style.display = "none";
          return;
        }
        sec.style.display = (!selCat || selCat === catKey) ? "" : "none";
      };

      showSection("#section-orders", "orders");
      showSection("#section-payments", "payments");
      showSection("#section-deliveries", "deliveries");
      showSection("#section-customers", "customers");
      showSection("#section-staff", "staff");

      // Render orders
      const outOrders = $("#out-orders");
      if (outOrders) {
        if (filteredOrders.length === 0) {
          outOrders.innerHTML = `<tr class="empty-row"><td colspan="8" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No archived orders found.</p></div></td></tr>`;
        } else {
          outOrders.innerHTML = filteredOrders.map(o => {
            const items = [
              `<button class="dropdown-item" data-act="invoice" data-id="${o.order_id}" type="button"><i class="bi bi-file-earmark-text me-2 text-primary"></i>Invoice</button>`,
              `<button class="dropdown-item text-success" data-act="unarchive-order" data-id="${o.order_id}" type="button"><i class="bi bi-arrow-counterclockwise me-2"></i>Restore Order</button>`
            ];
            const payStatusCls = o.payment_status === "Paid" ? "ok" : (o.payment_status === "Refunded" ? "bad" : "mute");
            return `<tr>
              <td><strong>${ord(o.order_id)}</strong></td>
              <td>${esc(o.customer_name)}</td>
              <td>${formatDate(o.order_date)}</td>
              <td>${orderTypeBadge(o.release_type)}</td>
              <td>${orderStatusBadge(o.order_status, o.order_id, o.release_type)}</td>
              <td><span class="badge ${payStatusCls}">${esc(o.payment_status || "Unpaid")}</span></td>
              <td class="num">${peso(o.total)}</td>
              <td>${actionsDropdown(items)}</td>
            </tr>`;
          }).join("");
        }
      }

      // Render payments
      const outPayments = $("#out-payments");
      if (outPayments) {
        if (filteredPayments.length === 0) {
          outPayments.innerHTML = `<tr class="empty-row"><td colspan="9" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No archived payments found.</p></div></td></tr>`;
        } else {
          outPayments.innerHTML = filteredPayments.map(p => {
            const items = [
              `<button class="dropdown-item" data-act="receipt" data-id="${p.payment_id}" type="button"><i class="bi bi-receipt me-2 text-primary"></i>Receipt</button>`,
              `<button class="dropdown-item text-success" data-act="unarchive-payment" data-id="${p.payment_id}" type="button"><i class="bi bi-arrow-counterclockwise me-2"></i>Restore Payment</button>`
            ];
            const badgeCls = { Paid: "ok", Pending: "warn", Refunded: "bad" }[p.status] || "mute";
            return `<tr>
              <td><strong>${pay(p.payment_id)}</strong></td>
              <td><strong>${ord(p.order_id)}</strong></td>
              <td>${esc(p.customer_name || nameOf(p))}</td>
              <td>${esc(p.method || p.payment_method)}</td>
              <td>${p.reference_no ? `<span class="font-monospace">${esc(p.reference_no)}</span>` : '<span class="text-muted">-</span>'}</td>
              <td>${formatDate(p.paid_at || p.payment_date)}</td>
              <td class="num"><strong>${peso(p.amount || p.amount_paid)}</strong></td>
              <td><span class="badge ${badgeCls}">${esc(p.status || "Paid")}</span></td>
              <td>${actionsDropdown(items)}</td>
            </tr>`;
          }).join("");
        }
      }

      // Render deliveries
      const outDeliveries = $("#out-deliveries");
      if (outDeliveries) {
        if (filteredDeliveries.length === 0) {
          outDeliveries.innerHTML = `<tr class="empty-row"><td colspan="8" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No archived transport runs found.</p></div></td></tr>`;
        } else {
          outDeliveries.innerHTML = filteredDeliveries.map(d => {
            const items = [
              `<button class="dropdown-item text-success" data-act="unarchive-delivery" data-id="${d.delivery_id}" type="button"><i class="bi bi-arrow-counterclockwise me-2"></i>Restore Run</button>`
            ];
            const statusCls = { Scheduled: "warn", "On the way": "info", Completed: "ok", Cancelled: "mute" }[d.status] || "mute";
            const addr = d.address || `${d.street || ''}, ${d.barangay || ''}`.trim() || '-';
            return `<tr>
              <td><strong>${ord(d.order_id)}</strong></td>
              <td>${orderTypeBadge(d.type)}</td>
              <td>${formatDate(d.scheduled_date)}</td>
              <td>${esc(d.time_slot)}</td>
              <td>${esc(d.rider || (String(d.type).toLowerCase() === "pickup" ? "—" : "Unassigned"))}</td>
              <td><strong>${esc(d.customer_name || "Unknown")}</strong><br><small class="text-muted">${esc(addr)}</small></td>
              <td><span class="badge ${statusCls}">${esc(d.status)}</span></td>
              <td>${actionsDropdown(items)}</td>
            </tr>`;
          }).join("");
        }
      }

      // Render customers
      const outCustomers = $("#out-customers");
      if (outCustomers) {
        if (filteredCustomers.length === 0) {
          outCustomers.innerHTML = `<tr class="empty-row"><td colspan="5" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No archived customers found.</p></div></td></tr>`;
        } else {
          outCustomers.innerHTML = filteredCustomers.map(c => {
            const items = [
              `<button class="dropdown-item text-success" data-act="unarchive-customer" data-id="${c.customer_id}" type="button"><i class="bi bi-arrow-counterclockwise me-2"></i>Restore Customer</button>`
            ];
            const streetPart = c.street_address || c.street || c.address || "";
            const addr = streetPart && c.barangay ? `${streetPart}, ${c.barangay}` : (streetPart || c.barangay || '-');
            return `<tr>
              <td><strong>${esc(c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())}</strong></td>
              <td>${esc(c.contact || c.phone || '-')}</td>
              <td>${esc(addr)}</td>
              <td><span class="badge mute">Archived</span></td>
              <td>${actionsDropdown(items)}</td>
            </tr>`;
          }).join("");
        }
      }

      // Render staff
      const outStaff = $("#out-staff");
      if (outStaff && isMgr) {
        if (filteredStaff.length === 0) {
          outStaff.innerHTML = `<tr class="empty-row"><td colspan="7" class="text-center py-4"><div class="empty-placeholder text-center"><i class="bi bi-inbox fs-4 text-muted mb-1 d-block"></i><p class="text-muted small mb-0">No archived staff accounts found.</p></div></td></tr>`;
        } else {
          outStaff.innerHTML = filteredStaff.map(s => {
            const items = [
              `<button class="dropdown-item text-success" data-act="unarchive-staff" data-id="${s.staff_id}" type="button"><i class="bi bi-arrow-counterclockwise me-2"></i>Restore Staff</button>`
            ];
            const roleBadgeCls = { Manager: "bad", Cashier: "warn", Washer: "info", Folder: "folding", Rider: "ok" }[s.role] || "mute";
            return `<tr>
              <td><strong>#${s.staff_id}</strong></td>
              <td><strong>${esc(s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim())}</strong></td>
              <td><span class="badge ${roleBadgeCls}">${esc(s.role)}</span></td>
              <td>${esc(s.email)}</td>
              <td>${esc(s.phone || '-')}</td>
              <td><span class="badge mute">Archived</span></td>
              <td>${actionsDropdown(items)}</td>
            </tr>`;
          }).join("");
        }
      }

      initTablesSorting();
    }

    // Filter listeners
    const searchInput = $("#arch_q");
    if (searchInput) searchInput.addEventListener("input", debounce(renderArchivedTables, 150));

    const catSelect = $("#arch_cat");
    if (catSelect) {
      catSelect.addEventListener("change", () => {
        const val = catSelect.value;
        document.querySelectorAll(".arch-chip").forEach(ch => {
          ch.classList.toggle("active", ch.dataset.category === val);
        });
        renderArchivedTables();
      });
    }

    const clearBtn = $("#arch_clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (catSelect) catSelect.value = "";
        document.querySelectorAll(".arch-chip").forEach(ch => {
          ch.classList.toggle("active", ch.dataset.category === "");
        });
        renderArchivedTables();
      });
    }

    document.querySelectorAll(".arch-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const cat = chip.dataset.category;
        document.querySelectorAll(".arch-chip").forEach(ch => ch.classList.remove("active"));
        chip.classList.add("active");
        if (catSelect) catSelect.value = cat;
        renderArchivedTables();
      });
    });

    // Action clicks
    const mainView = $("#view");
    if (mainView) {
      mainView.addEventListener("click", async (ev) => {
        const b = ev.target.closest("[data-act]");
        if (!b) return;
        const act = b.dataset.act;
        const id = b.dataset.id;

        if (act === "invoice") {
          return openReceipt({ orderId: id, isInvoice: true });
        }
        if (act === "receipt") {
          return openReceipt({ paymentId: id, isInvoice: false });
        }

        if (act === "unarchive-order") {
          if (await ask("Restore Order?", `Restore Order <strong>#${ord(id)}</strong> back to active orders?`, "Restore")) {
            const res = await fetch(`/api/orders/${id}/unarchive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to restore order");
            toast(`Order #${ord(id)} restored to active orders.`);
            await loadArchiveData();
          }
          return;
        }

        if (act === "unarchive-payment") {
          const p = allData.payments.find(x => x.payment_id == id);
          const amtText = p ? ` of ${peso(p.amount || p.amount_paid)}` : "";
          if (await ask("Restore Payment?", `Restore payment <strong>#${pay(id)}${amtText}</strong> back to active payments?`, "Restore")) {
            const res = await fetch(`/api/payments/${id}/unarchive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to restore payment");
            toast(`Payment #${pay(id)} restored to active payments.`);
            await loadArchiveData();
          }
          return;
        }

        if (act === "unarchive-delivery") {
          const d = allData.deliveries.find(x => x.delivery_id == id);
          const ordText = d ? ` for Order <strong>#${ord(d.order_id)}</strong>` : "";
          if (await ask("Restore Transport Run?", `Restore transport run${ordText} back to active schedule?`, "Restore")) {
            const res = await fetch(`/api/deliveries/${id}/unarchive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to restore transport run");
            toast("Transport run restored to active schedule.");
            await loadArchiveData();
          }
          return;
        }

        if (act === "unarchive-customer") {
          const c = allData.customers.find(x => x.customer_id == id);
          const nameText = c ? ` <strong>"${esc(c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())}"</strong>` : "";
          if (await ask("Restore Customer?", `Restore customer${nameText} to active customers?`, "Restore")) {
            const res = await fetch(`/api/customers/${id}/unarchive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to restore customer");
            toast(`Customer restored to active customers.`);
            await loadArchiveData();
          }
          return;
        }

        if (act === "unarchive-staff") {
          const s = allData.staff.find(x => x.staff_id == id);
          const nameText = s ? ` <strong>"${esc(s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim())}"</strong>` : "";
          if (await ask("Restore Staff Member?", `Restore staff account${nameText}?`, "Restore")) {
            const res = await fetch(`/api/staff/${id}/unarchive`, { method: "PUT", headers: getAuthHeaders() });
            if (!res.ok) throw new Error("Failed to restore staff");
            toast(`Staff member restored to active staff.`);
            await loadArchiveData();
          }
          return;
        }
      });
    }

    await loadArchiveData();
  }

  // Login handler
  const loginForm = document.querySelector(".login-form-container form") || document.getElementById("loginForm");
  if (loginForm) {
    const showToggle = document.getElementById("togglePasswordBtn") || loginForm.querySelector(".pass-toggle-btn") || loginForm.querySelector(".form-group span");
    const passInput = document.getElementById("loginPassword") || loginForm.querySelector('input[type="password"]') || loginForm.querySelector('input[name="password"]');
    const emailInput = document.getElementById("loginEmail") || loginForm.querySelector('input[type="email"]') || loginForm.querySelector('input[name="email"]');
    const errorEl = document.getElementById("loginError");
    const submitBtn = document.getElementById("signInBtn") || loginForm.querySelector("button[type='submit']");

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
        showToggle.innerHTML = isPass
          ? '<i class="bi bi-eye-slash"></i> <span>Hide</span>'
          : '<i class="bi bi-eye"></i> <span>Show</span>';
      });
    }

    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      clearError();
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passInput ? passInput.value : "";
      if (!email || !password) {
        if (errorEl) {
          errorEl.textContent = "Please enter both email and password.";
          errorEl.style.display = "block";
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.75";
        submitBtn.style.pointerEvents = "none";
      }

      try {
        const res = await fetch("/api/staff/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => null);
        if (!data) {
          throw new Error(`Server returned status ${res.status}. Please check your database connection or try again.`);
        }
        if (!res.ok) throw new Error(data.error || "Login failed");
        setAuthStaff(data.staff, data.token);
        const role = (data.staff.role || "").toLowerCase();
        const target = ROLE_DEFAULT_PAGES[role] || "index.html";
        window.location.href = target;
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = "block";
        } else {
          toast(err.message, 1);
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "";
          submitBtn.style.pointerEvents = "";
        }
      }
    });
  }

  function applyRoleNavVisibility() {
    const staff = getAuthStaff();
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
    const profileEl = document.querySelector(".user-profile");
    if (nameEl) nameEl.textContent = staff.full_name || staff.first_name || "Staff Member";
    if (roleEl) roleEl.textContent = staff.role || "Active Staff";
    if (avatarEl) avatarEl.textContent = (staff.first_name || "A")[0].toUpperCase();
    if (profileEl) profileEl.setAttribute("title", `${staff.full_name || staff.first_name || "Staff Member"} (${staff.role || "Active Staff"})`);

    const mobileAvatarEl = document.querySelector("#mobileAvatar");
    if (mobileAvatarEl) {
      mobileAvatarEl.textContent = (staff.first_name || "A")[0].toUpperCase();
      mobileAvatarEl.setAttribute("title", `${staff.full_name || staff.first_name || "Staff Member"} (${staff.role || "Active Staff"})`);
    }
  }

  // Handle ticket dropdown z-index elevation
  document.addEventListener("show.bs.dropdown", (e) => {
    const ticket = e.target.closest(".ticket");
    if (ticket) ticket.classList.add("has-open-dropdown");
  });
  document.addEventListener("hidden.bs.dropdown", (e) => {
    const ticket = e.target.closest(".ticket");
    if (ticket) ticket.classList.remove("has-open-dropdown");
  });

  applyRoleNavVisibility();

  if (ENT[cur] && cur !== "history") init(true);
  if (cur === "dashboard") initDashboard();
  if (cur === "history") initArchive();
  initTablesSorting();
});