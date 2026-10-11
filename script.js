var SEED = {
  customers: [
    {
      customer_id: 1,
      first_name: "Lisa",
      last_name: "Delos Santos",
      phone: "09171234501",
      address: "12 Rizal St., Cabuyao, Laguna",
    },
    {
      customer_id: 2,
      first_name: "Cedric",
      last_name: "Garcia",
      phone: "09171234502",
      address: "45 Mabini Ave., Cabuyao, Laguna",
    },
    {
      customer_id: 3,
      first_name: "Martin",
      last_name: "Rivera",
      phone: "09171234503",
      address: "8 Bonifacio St., Santa Rosa, Laguna",
    },
    {
      customer_id: 4,
      first_name: "Janine",
      last_name: "Gonzales",
      phone: "09171234504",
      address: "23 Luna St., Cabuyao, Laguna",
    },
    {
      customer_id: 5,
      first_name: "Eugene",
      last_name: "Reyes",
      phone: "09171234505",
      address: "67 Del Pilar St., Binan, Laguna",
    },
  ],
  staff: [
    { staff_id: 1, first_name: "Maria", last_name: "Santos", role: "Cashier" },
    { staff_id: 2, first_name: "Jose", last_name: "Dela Cruz", role: "Washer" },
    { staff_id: 3, first_name: "Ana", last_name: "Lopez", role: "Folder" },
    { staff_id: 4, first_name: "Pedro", last_name: "Ramos", role: "Rider" },
    { staff_id: 5, first_name: "Rosa", last_name: "Mendoza", role: "Manager" },
  ],
  statuses: [
    { status_id: 1, status_name: "Received" },
    { status_id: 2, status_name: "Washing" },
    { status_id: 3, status_name: "Ready for Pickup" },
    { status_id: 4, status_name: "Out for Delivery" },
    { status_id: 5, status_name: "Completed" },
  ],
  services: [
    { service_id: 1, service_name: "Wash and Fold", price_per_kg: 45 },
    { service_id: 2, service_name: "Wash and Dry", price_per_kg: 55 },
    { service_id: 3, service_name: "Dry Cleaning", price_per_kg: 120 },
    { service_id: 4, service_name: "Ironing Only", price_per_kg: 35 },
    { service_id: 5, service_name: "Comforter Wash", price_per_kg: 150 },
  ],
  orders: [
    {
      order_id: 1,
      customer_id: 1,
      staff_id: 1,
      status_id: 5,
      order_date: "2026-10-01",
      release_type: "Pickup",
      release_date: "2026-10-03",
    },
    {
      order_id: 2,
      customer_id: 2,
      staff_id: 1,
      status_id: 5,
      order_date: "2026-10-02",
      release_type: "Delivery",
      release_date: "2026-10-04",
    },
    {
      order_id: 3,
      customer_id: 3,
      staff_id: 5,
      status_id: 3,
      order_date: "2026-10-05",
      release_type: "Pickup",
      release_date: null,
    },
    {
      order_id: 4,
      customer_id: 4,
      staff_id: 1,
      status_id: 4,
      order_date: "2026-10-06",
      release_type: "Delivery",
      release_date: null,
    },
    {
      order_id: 5,
      customer_id: 5,
      staff_id: 1,
      status_id: 2,
      order_date: "2026-10-07",
      release_type: "Pickup",
      release_date: null,
    },
  ],
  items: [
    {
      order_item_id: 1,
      order_id: 1,
      service_id: 1,
      weight_kg: 4,
      subtotal: 180,
    },
    {
      order_item_id: 2,
      order_id: 1,
      service_id: 4,
      weight_kg: 2,
      subtotal: 70,
    },
    {
      order_item_id: 3,
      order_id: 2,
      service_id: 2,
      weight_kg: 5,
      subtotal: 275,
    },
    {
      order_item_id: 4,
      order_id: 3,
      service_id: 3,
      weight_kg: 2,
      subtotal: 240,
    },
    {
      order_item_id: 5,
      order_id: 3,
      service_id: 1,
      weight_kg: 3,
      subtotal: 135,
    },
    {
      order_item_id: 6,
      order_id: 4,
      service_id: 5,
      weight_kg: 1.5,
      subtotal: 225,
    },
    {
      order_item_id: 7,
      order_id: 5,
      service_id: 1,
      weight_kg: 6,
      subtotal: 270,
    },
    {
      order_item_id: 8,
      order_id: 5,
      service_id: 4,
      weight_kg: 1,
      subtotal: 35,
    },
  ],
  payments: [
    {
      payment_id: 1,
      order_id: 1,
      amount_paid: 250,
      payment_method: "Cash",
      payment_date: "2026-10-03",
    },
    {
      payment_id: 2,
      order_id: 2,
      amount_paid: 275,
      payment_method: "GCash",
      payment_date: "2026-10-04",
    },
    {
      payment_id: 3,
      order_id: 3,
      amount_paid: 100,
      payment_method: "Cash",
      payment_date: "2026-10-05",
    },
    {
      payment_id: 4,
      order_id: 4,
      amount_paid: 225,
      payment_method: "GCash",
      payment_date: "2026-10-06",
    },
    {
      payment_id: 5,
      order_id: 5,
      amount_paid: 150,
      payment_method: "Cash",
      payment_date: "2026-10-07",
    },
  ],
};

var STORE_KEY = "laundry_shop_data";
var db;

// load saved data or use the sample data
function loadData() {
  var saved = localStorage.getItem(STORE_KEY);
  if (saved) {
    db = JSON.parse(saved);
  } else {
    db = JSON.parse(JSON.stringify(SEED));
  }
}

function saveData() {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

// ---------- SMALL HELPER FUNCTIONS ----------
function $(selector) {
  return document.querySelector(selector);
}

function peso(n) {
  return (
    "₱" +
    Number(n).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function todayDate() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function formatDate(iso) {
  var parts = iso.split("-");
  var d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// get the next id for a table
function nextId(list, key) {
  var max = 0;
  for (var i = 0; i < list.length; i++) {
    if (list[i][key] > max) max = list[i][key];
  }
  return max + 1;
}

// stops html tags from being typed into the page
function safe(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- LOOKUP FUNCTIONS ----------
function findOrder(id) {
  return db.orders.find(function (o) {
    return o.order_id === id;
  });
}

function findCustomer(id) {
  return (
    db.customers.find(function (c) {
      return c.customer_id === id;
    }) || {}
  );
}

function customerName(id) {
  var c = findCustomer(id);
  if (!c.first_name) return "Unknown customer";
  return c.first_name + " " + c.last_name;
}

function staffName(id) {
  var s = db.staff.find(function (x) {
    return x.staff_id === id;
  });
  if (!s) return "-";
  return s.first_name + " " + s.last_name;
}

function statusName(id) {
  var s = db.statuses.find(function (x) {
    return x.status_id === id;
  });
  return s ? s.status_name : "";
}

// total of all items in an order
function orderTotal(orderId) {
  var total = 0;
  db.items.forEach(function (item) {
    if (item.order_id === orderId) total += Number(item.subtotal);
  });
  return round2(total);
}

// total paid for an order (can skip one payment when editing it)
function orderPaid(orderId, skipPaymentId) {
  var total = 0;
  db.payments.forEach(function (p) {
    if (p.order_id === orderId && p.payment_id !== skipPaymentId) {
      total += Number(p.amount_paid);
    }
  });
  return round2(total);
}

function orderBalance(orderId, skipPaymentId) {
  return round2(orderTotal(orderId) - orderPaid(orderId, skipPaymentId));
}

// ---------- FORM ERROR HELPERS ----------
function clearErrors(form) {
  var fields = form.querySelectorAll(".field");
  fields.forEach(function (f) {
    f.classList.remove("invalid");
    f.querySelector(".err").textContent = "";
  });
}

// errors is an object like { service_name: "message" }
// returns true if there are NO errors
function showErrors(form, errors) {
  clearErrors(form);
  var names = Object.keys(errors);
  names.forEach(function (name) {
    var field = form.querySelector('[data-field="' + name + '"]');
    field.classList.add("invalid");
    field.querySelector(".err").textContent = errors[name];
  });
  return names.length === 0;
}

// cancel buttons close their dialog
document.querySelectorAll("[data-close]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    btn.closest("dialog").close();
  });
});

// ---------- PAGE NAVIGATION ----------
function showPage() {
  var pages = ["services", "payments", "delivery"];
  var current = location.hash.slice(1);
  if (pages.indexOf(current) === -1) current = "services";

  pages.forEach(function (p) {
    $("#page-" + p).classList.remove("active");
  });
  $("#page-" + current).classList.add("active");

  document.querySelectorAll("[data-nav]").forEach(function (a) {
    if (a.dataset.nav === current) {
      a.setAttribute("aria-current", "page");
    } else {
      a.removeAttribute("aria-current");
    }
  });
}
window.addEventListener("hashchange", showPage);

// SERVICES

var editingServiceId = null;

function countServiceUsed(serviceId) {
  var count = 0;
  db.items.forEach(function (i) {
    if (i.service_id === serviceId) count++;
  });
  return count;
}

function renderServices() {
  var search = $("#s-q").value.trim().toLowerCase();
  var sort = $("#s-sort").value;

  // filter
  var list = db.services.filter(function (s) {
    return s.service_name.toLowerCase().indexOf(search) !== -1;
  });

  // sort
  list.sort(function (a, b) {
    if (sort === "price_asc") return a.price_per_kg - b.price_per_kg;
    if (sort === "price_desc") return b.price_per_kg - a.price_per_kg;
    return a.service_name.localeCompare(b.service_name);
  });

  $("#s-count").textContent =
    "Showing " + list.length + " of " + db.services.length + " services";

  var html = "";
  list.forEach(function (s) {
    html += "<tr>";
    html +=
      "<td><strong>" +
      safe(s.service_name) +
      "</strong><span class='sub'>Service #" +
      s.service_id +
      "</span></td>";
    html += "<td class='num'>" + peso(s.price_per_kg) + "</td>";
    html += "<td class='num'>" + countServiceUsed(s.service_id) + "</td>";
    html += "<td><div class='actions'>";
    html +=
      "<button class='btn btn-sm' data-act='edit' data-id='" +
      s.service_id +
      "' type='button'>Edit</button> ";
    html +=
      "<button class='btn btn-sm btn-danger' data-act='del' data-id='" +
      s.service_id +
      "' type='button'>Delete</button>";
    html += "</div></td>";
    html += "</tr>";
  });
  $("#s-rows").innerHTML = html;

  // empty message
  var empty = $("#s-empty");
  if (list.length === 0) {
    empty.hidden = false;
    empty.innerHTML =
      "<h3>No services found</h3><p>Try a different search or add a new service.</p>";
  } else {
    empty.hidden = true;
  }
}

function openServiceForm(id) {
  var form = $("#f-service");
  form.reset();
  clearErrors(form);
  editingServiceId = id || null;

  if (id) {
    var s = db.services.find(function (x) {
      return x.service_id === id;
    });
    $("#dlg-service-title").textContent = "Edit service";
    $("#svcSave").textContent = "Save changes";
    form.service_name.value = s.service_name;
    form.price_per_kg.value = s.price_per_kg;
  } else {
    $("#dlg-service-title").textContent = "Add service";
    $("#svcSave").textContent = "Save service";
  }
  $("#dlg-service").showModal();
}

function checkService(name, price) {
  var errors = {};

  if (name === "") {
    errors.service_name = "Enter a service name.";
  } else if (name.length < 2) {
    errors.service_name = "Use at least 2 characters.";
  } else {
    // no duplicate names
    var duplicate = db.services.some(function (s) {
      return (
        s.service_id !== editingServiceId &&
        s.service_name.toLowerCase() === name.toLowerCase()
      );
    });
    if (duplicate) errors.service_name = "This service already exists.";
  }

  if (price === "") {
    errors.price_per_kg = "Enter the price per kg.";
  } else if (Number(price) <= 0) {
    errors.price_per_kg = "Price must be more than 0.";
  } else if (Number(price) > 5000) {
    errors.price_per_kg = "Price can't be more than ₱5,000.";
  }

  return errors;
}

$("#f-service").addEventListener("submit", function (e) {
  e.preventDefault();
  var form = e.target;
  var name = form.service_name.value.trim();
  var price = form.price_per_kg.value;

  if (!showErrors(form, checkService(name, price))) return;

  if (editingServiceId) {
    var s = db.services.find(function (x) {
      return x.service_id === editingServiceId;
    });
    s.service_name = name;
    s.price_per_kg = round2(Number(price));
  } else {
    db.services.push({
      service_id: nextId(db.services, "service_id"),
      service_name: name,
      price_per_kg: round2(Number(price)),
    });
  }

  saveData();
  $("#dlg-service").close();
  renderAll();
});

$("#svcAdd").addEventListener("click", function () {
  openServiceForm();
});
$("#s-q").addEventListener("input", renderServices);
$("#s-sort").addEventListener("change", renderServices);
$("#s-clear").addEventListener("click", function () {
  $("#s-q").value = "";
  $("#s-sort").value = "name";
  renderServices();
});

// edit / delete buttons inside the table
$("#s-rows").addEventListener("click", function (e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  var id = Number(btn.dataset.id);

  if (btn.dataset.act === "edit") {
    openServiceForm(id);
  } else {
    var used = countServiceUsed(id);
    if (used > 0) {
      alert(
        "This service can't be deleted because it is used in " +
          used +
          " order item(s).",
      );
      return;
    }
    if (confirm("Delete this service?")) {
      db.services = db.services.filter(function (s) {
        return s.service_id !== id;
      });
      saveData();
      renderAll();
    }
  }
});

// PAYMENTS

var editingPaymentId = null;

function renderPayments() {
  var search = $("#p-q").value.trim().toLowerCase().replace("#", "");
  var method = $("#p-method").value;
  var settled = $("#p-settled").value;

  var list = db.payments.filter(function (p) {
    var order = findOrder(p.order_id) || {};
    var text = (
      customerName(order.customer_id) +
      " order " +
      p.order_id
    ).toLowerCase();
    var status = orderBalance(p.order_id) <= 0 ? "paid" : "partial";

    if (search && text.indexOf(search) === -1) return false;
    if (method && p.payment_method !== method) return false;
    if (settled && status !== settled) return false;
    return true;
  });

  // newest first
  list.sort(function (a, b) {
    return (
      b.payment_date.localeCompare(a.payment_date) ||
      b.payment_id - a.payment_id
    );
  });

  // totals at the top
  var collected = 0;
  list.forEach(function (p) {
    collected += Number(p.amount_paid);
  });

  var unpaid = 0;
  var withBalance = 0;
  db.orders.forEach(function (o) {
    var bal = orderBalance(o.order_id);
    if (bal > 0) {
      unpaid += bal;
      withBalance++;
    }
  });

  $("#p-collected").textContent = peso(collected);
  $("#p-unpaid").textContent = peso(unpaid);
  $("#p-nbal").textContent = withBalance + " of " + db.orders.length;
  $("#p-count").textContent =
    "Showing " + list.length + " of " + db.payments.length + " payments";

  var html = "";
  list.forEach(function (p) {
    var order = findOrder(p.order_id) || {};
    var bal = orderBalance(p.order_id);

    html += "<tr>";
    html += "<td><strong>Payment #" + p.payment_id + "</strong></td>";
    html +=
      "<td><strong>Order #" +
      p.order_id +
      "</strong><span class='sub'>" +
      safe(customerName(order.customer_id)) +
      "</span></td>";
    html += "<td>" + safe(p.payment_method) + "</td>";
    html += "<td>" + formatDate(p.payment_date) + "</td>";
    html += "<td class='num'><strong>" + peso(p.amount_paid) + "</strong></td>";
    if (bal <= 0) {
      html += "<td class='num'><span class='badge b-ok'>Fully paid</span></td>";
    } else {
      html += "<td class='num'>" + peso(bal) + "</td>";
    }
    html += "<td><div class='actions'>";
    html +=
      "<button class='btn btn-sm' data-act='edit' data-id='" +
      p.payment_id +
      "' type='button'>Edit</button> ";
    html +=
      "<button class='btn btn-sm btn-danger' data-act='del' data-id='" +
      p.payment_id +
      "' type='button'>Delete</button>";
    html += "</div></td>";
    html += "</tr>";
  });
  $("#p-rows").innerHTML = html;

  var empty = $("#p-empty");
  if (list.length === 0) {
    empty.hidden = false;
    empty.innerHTML =
      "<h3>No payments found</h3><p>Try a different search or record a payment.</p>";
  } else {
    empty.hidden = true;
  }
}

// fill the order dropdown in the payment form
function fillOrderList(isEditing) {
  var html = "";
  if (!isEditing) html += "<option value=''>Choose an order</option>";

  db.orders.forEach(function (o) {
    // when adding, only show orders that still have a balance
    if (!isEditing && orderBalance(o.order_id) <= 0) return;
    var info = isEditing
      ? "total " + peso(orderTotal(o.order_id))
      : "balance " + peso(orderBalance(o.order_id));
    html +=
      "<option value='" +
      o.order_id +
      "'>Order #" +
      o.order_id +
      " - " +
      safe(customerName(o.customer_id)) +
      " (" +
      info +
      ")</option>";
  });
  $("#order_id").innerHTML = html;
}

// show balance under the order dropdown
function updateBalanceHint(fillAmount) {
  var orderId = Number($("#order_id").value);
  if (!orderId) {
    $("#balHint").textContent = "";
    return;
  }
  var bal = orderBalance(orderId, editingPaymentId);
  if (bal > 0) {
    $("#balHint").textContent = "Balance due: " + peso(bal);
    if (fillAmount && $("#amount_paid").value === "") {
      $("#amount_paid").value = bal.toFixed(2);
    }
  } else {
    $("#balHint").textContent = "This order is already fully paid.";
  }
}

function openPaymentForm(id) {
  var form = $("#f-payment");
  form.reset();
  clearErrors(form);
  editingPaymentId = id || null;
  form.payment_date.max = todayDate();

  if (id) {
    var p = db.payments.find(function (x) {
      return x.payment_id === id;
    });
    fillOrderList(true);
    $("#dlg-payment-title").textContent = "Edit Payment #" + id;
    $("#paySave").textContent = "Save changes";
    form.order_id.value = p.order_id;
    form.order_id.disabled = true; // can't change the order of a payment
    form.amount_paid.value = p.amount_paid;
    form.payment_method.value = p.payment_method;
    form.payment_date.value = p.payment_date;
  } else {
    fillOrderList(false);
    $("#dlg-payment-title").textContent = "Record payment";
    $("#paySave").textContent = "Save payment";
    form.order_id.disabled = false;
    form.payment_date.value = todayDate();
  }

  updateBalanceHint(false);
  $("#dlg-payment").showModal();
}

function checkPayment(form, orderId) {
  var errors = {};

  if (!orderId) errors.order_id = "Choose an order.";

  var amount = form.amount_paid.value;
  if (amount === "") {
    errors.amount_paid = "Enter the amount paid.";
  } else if (Number(amount) <= 0) {
    errors.amount_paid = "Amount must be more than 0.";
  } else if (orderId) {
    var bal = orderBalance(orderId, editingPaymentId);
    if (Number(amount) > bal) {
      errors.amount_paid =
        "Amount can't be more than the balance of " + peso(bal) + ".";
    }
  }

  if (form.payment_method.value === "")
    errors.payment_method = "Choose a payment method.";

  if (form.payment_date.value === "") {
    errors.payment_date = "Choose the payment date.";
  } else if (form.payment_date.value > todayDate()) {
    errors.payment_date = "Payment date can't be in the future.";
  }

  return errors;
}

$("#f-payment").addEventListener("submit", function (e) {
  e.preventDefault();
  var form = e.target;

  // disabled select doesn't give a value, so get order id from the payment
  var orderId;
  if (editingPaymentId) {
    orderId = db.payments.find(function (p) {
      return p.payment_id === editingPaymentId;
    }).order_id;
  } else {
    orderId = Number(form.order_id.value);
  }

  if (!showErrors(form, checkPayment(form, orderId))) return;

  var data = {
    order_id: orderId,
    amount_paid: round2(Number(form.amount_paid.value)),
    payment_method: form.payment_method.value,
    payment_date: form.payment_date.value,
  };

  if (editingPaymentId) {
    var p = db.payments.find(function (x) {
      return x.payment_id === editingPaymentId;
    });
    p.amount_paid = data.amount_paid;
    p.payment_method = data.payment_method;
    p.payment_date = data.payment_date;
  } else {
    data.payment_id = nextId(db.payments, "payment_id");
    db.payments.push(data);
  }

  saveData();
  $("#dlg-payment").close();
  renderAll();
});

$("#order_id").addEventListener("change", function () {
  updateBalanceHint(true);
});
$("#payAdd").addEventListener("click", function () {
  openPaymentForm();
});
$("#p-q").addEventListener("input", renderPayments);
$("#p-method").addEventListener("change", renderPayments);
$("#p-settled").addEventListener("change", renderPayments);
$("#p-clear").addEventListener("click", function () {
  $("#p-q").value = "";
  $("#p-method").value = "";
  $("#p-settled").value = "";
  renderPayments();
});

$("#p-rows").addEventListener("click", function (e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  var id = Number(btn.dataset.id);

  if (btn.dataset.act === "edit") {
    openPaymentForm(id);
  } else if (
    confirm("Delete this payment? The order balance will go back up.")
  ) {
    db.payments = db.payments.filter(function (p) {
      return p.payment_id !== id;
    });
    saveData();
    renderAll();
  }
});

// PICKUP & DELIVERY

// which status comes next for each release type
var NEXT_STATUS = {
  Pickup: { 1: 2, 2: 3, 3: 5 },
  Delivery: { 1: 2, 2: 4, 4: 5 },
};

// badge colors for each status
var BADGE = { 1: "b-mute", 2: "b-info", 3: "b-warn", 4: "b-info", 5: "b-ok" };

var statusFilter = 0; // 0 = all
var editingOrderId = null;

// orders after search / type / staff filters (before status chips)
function getFilteredOrders() {
  var search = $("#d-q").value.trim().toLowerCase().replace("#", "");
  var type = $("#d-type").value;
  var staff = $("#d-staff").value;

  return db.orders.filter(function (o) {
    var c = findCustomer(o.customer_id);
    var text = (
      customerName(o.customer_id) +
      " " +
      c.phone +
      " " +
      c.address +
      " order " +
      o.order_id
    ).toLowerCase();

    if (search && text.indexOf(search) === -1) return false;
    if (type && o.release_type !== type) return false;
    if (staff && String(o.staff_id) !== staff) return false;
    return true;
  });
}

function renderChips(orders) {
  var html =
    "<button type='button' class='chip' data-status='0' aria-pressed='" +
    (statusFilter === 0) +
    "'>All<b>" +
    orders.length +
    "</b></button>";

  db.statuses.forEach(function (s) {
    var count = orders.filter(function (o) {
      return o.status_id === s.status_id;
    }).length;
    html +=
      "<button type='button' class='chip' data-status='" +
      s.status_id +
      "' aria-pressed='" +
      (statusFilter === s.status_id) +
      "'>" +
      safe(s.status_name) +
      "<b>" +
      count +
      "</b></button>";
  });
  $("#d-chips").innerHTML = html;
}

function makeTicket(o) {
  var c = findCustomer(o.customer_id);
  var bal = orderBalance(o.order_id);
  var next = NEXT_STATUS[o.release_type][o.status_id];
  var needsDate = !o.release_date && o.status_id !== 5;

  var html = "<article class='ticket s" + o.status_id + "'>";
  html +=
    "<div class='stub'><span class='slot'>" +
    (o.release_date ? formatDate(o.release_date) : "No date yet") +
    "</span>";
  html += "<span class='kind'>" + safe(o.release_type) + "</span></div>";

  html += "<div class='ticket-main'>";
  html +=
    "<div class='ticket-top'><strong>" +
    safe(customerName(o.customer_id)) +
    "</strong>";
  html += "<span class='tags'>";
  if (needsDate) html += "<span class='badge b-bad'>Needs a date</span>";
  html +=
    "<span class='badge " +
    BADGE[o.status_id] +
    "'>" +
    safe(statusName(o.status_id)) +
    "</span>";
  html += "</span></div>";

  html += "<p class='addr'>" + safe(c.address) + "</p>";

  html += "<dl class='meta'>";
  html += "<div><dt>Order</dt><dd>#" + o.order_id + "</dd></div>";
  html += "<div><dt>Phone</dt><dd>" + safe(c.phone) + "</dd></div>";
  html +=
    "<div><dt>Handled by</dt><dd>" +
    safe(staffName(o.staff_id)) +
    "</dd></div>";
  html +=
    "<div><dt>Ordered</dt><dd>" + formatDate(o.order_date) + "</dd></div>";
  html +=
    "<div><dt>Total</dt><dd>" + peso(orderTotal(o.order_id)) + "</dd></div>";
  html +=
    "<div><dt>Balance</dt><dd>" +
    (bal > 0 ? peso(bal) : "<span class='balance-ok'>Paid in full</span>") +
    "</dd></div>";
  html += "</dl>";

  html += "<div class='actions'>";
  if (next) {
    html +=
      "<button class='btn btn-sm btn-primary' data-act='next' data-id='" +
      o.order_id +
      "' type='button'>Move to " +
      safe(statusName(next)) +
      "</button> ";
  }
  html +=
    "<button class='btn btn-sm' data-act='edit' data-id='" +
    o.order_id +
    "' type='button'>Edit release details</button>";
  html += "</div>";

  html += "</div></article>";
  return html;
}

function renderDelivery() {
  var orders = getFilteredOrders();
  renderChips(orders);

  var list = orders.filter(function (o) {
    return statusFilter === 0 || o.status_id === statusFilter;
  });

  // sort by release date, then order number
  list.sort(function (a, b) {
    return (
      (a.release_date || "").localeCompare(b.release_date || "") ||
      a.order_id - b.order_id
    );
  });

  $("#d-count").textContent =
    "Showing " + list.length + " of " + db.orders.length + " orders";

  // group the orders by release date
  var groups = {};
  list.forEach(function (o) {
    var key = o.release_date || "";
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  var html = "";
  Object.keys(groups)
    .sort()
    .forEach(function (key) {
      var title = key ? formatDate(key) : "No release date yet";
      html += "<section class='day-group'>";
      html +=
        "<h2>" +
        title +
        " <small>" +
        groups[key].length +
        " order(s)</small></h2>";
      groups[key].forEach(function (o) {
        html += makeTicket(o);
      });
      html += "</section>";
    });
  $("#d-list").innerHTML = html;

  var empty = $("#d-empty");
  if (list.length === 0) {
    empty.hidden = false;
    empty.innerHTML =
      "<h3>No orders found</h3><p>Try another status or search word.</p>";
  } else {
    empty.hidden = true;
  }
}

function openOrderForm(id) {
  var o = findOrder(id);
  var form = $("#f-order");
  form.reset();
  clearErrors(form);
  editingOrderId = id;

  $("#dlg-order-title").textContent = "Release details for Order #" + id;
  $("#dlg-order-sub").textContent = customerName(o.customer_id);

  // fill status dropdown
  var html = "";
  db.statuses.forEach(function (s) {
    html +=
      "<option value='" +
      s.status_id +
      "'>" +
      safe(s.status_name) +
      "</option>";
  });
  $("#status_id").innerHTML = html;

  // fill staff dropdown
  html = "";
  db.staff.forEach(function (s) {
    html +=
      "<option value='" +
      s.staff_id +
      "'>" +
      safe(s.first_name + " " + s.last_name) +
      " (" +
      safe(s.role) +
      ")</option>";
  });
  $("#staff_id").innerHTML = html;

  form.release_type.value = o.release_type;
  form.release_date.value = o.release_date || "";
  form.release_date.min = o.order_date;
  form.status_id.value = o.status_id;
  form.staff_id.value = o.staff_id;

  $("#dlg-order").showModal();
}

function checkOrder(form) {
  var errors = {};
  var order = findOrder(editingOrderId);
  var type = form.release_type.value;
  var date = form.release_date.value;
  var status = Number(form.status_id.value);

  if (type === "") errors.release_type = "Choose pickup or delivery.";

  if (date && date < order.order_date) {
    errors.release_date = "Release date can't be before the order date.";
  }
  if (status === 5 && date === "") {
    errors.release_date =
      "Add a release date before marking the order completed.";
  }

  if (type === "Pickup" && status === 4) {
    errors.status_id = "Out for Delivery is only for delivery orders.";
  }
  if (type === "Delivery" && status === 3) {
    errors.status_id = "Ready for Pickup is only for pickup orders.";
  }

  return errors;
}

$("#f-order").addEventListener("submit", function (e) {
  e.preventDefault();
  var form = e.target;

  if (!showErrors(form, checkOrder(form))) return;

  var o = findOrder(editingOrderId);
  o.release_type = form.release_type.value;
  o.release_date = form.release_date.value || null;
  o.status_id = Number(form.status_id.value);
  o.staff_id = Number(form.staff_id.value);

  saveData();
  $("#dlg-order").close();
  renderAll();
});

// filters
$("#d-q").addEventListener("input", renderDelivery);
$("#d-type").addEventListener("change", renderDelivery);
$("#d-staff").addEventListener("change", renderDelivery);
$("#d-clear").addEventListener("click", function () {
  $("#d-q").value = "";
  $("#d-type").value = "";
  $("#d-staff").value = "";
  statusFilter = 0;
  renderDelivery();
});

// status chips
$("#d-chips").addEventListener("click", function (e) {
  var chip = e.target.closest(".chip");
  if (!chip) return;
  statusFilter = Number(chip.dataset.status);
  renderDelivery();
});

// buttons inside the tickets
$("#d-list").addEventListener("click", function (e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  var id = Number(btn.dataset.id);
  var o = findOrder(id);

  if (btn.dataset.act === "edit") {
    openOrderForm(id);
  } else {
    var next = NEXT_STATUS[o.release_type][o.status_id];
    o.status_id = next;
    // if completed and no date yet, use today
    if (next === 5 && !o.release_date) o.release_date = todayDate();
    saveData();
    renderAll();
  }
});


// start 
function renderAll() {
  renderServices();
  renderPayments();
  renderDelivery();
}

$("#resetData").addEventListener("click", function () {
  if (confirm("Reset all data back to the sample data?")) {
    db = JSON.parse(JSON.stringify(SEED));
    saveData();
    statusFilter = 0;
    renderAll();
  }
});

loadData();

// fill the "Handled by" filter
var staffOptions = "<option value=''>All staff</option>";
db.staff.forEach(function (s) {
  staffOptions +=
    "<option value='" +
    s.staff_id +
    "'>" +
    safe(s.first_name + " " + s.last_name) +
    "</option>";
});
$("#d-staff").innerHTML = staffOptions;

showPage();
renderAll();

