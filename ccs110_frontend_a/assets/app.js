(() => {
  const STORAGE = { customers: 'ims_customers_v1', orders: 'ims_orders_v1' };
  const read = key => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = amount => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(Number(amount) || 0);
  const makeId = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const customers = () => read(STORAGE.customers);
  const orders = () => read(STORAGE.orders);
  const setNotice = (id, message, kind='success') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${kind}`;
    el.textContent = message;
    el.classList.remove('d-none');
    el.scrollIntoView({behavior:'smooth', block:'nearest'});
  };
  const clearNotice = id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('d-none');
  };
  const statusClass = status => ({Received:'status-pending',Washing:'status-processing',Drying:'status-drying','Ready for Pickup':'status-ready',Completed:'status-completed',Cancelled:'status-cancelled'}[status] || 'status-pending');
  const requireDemoLogin = () => {
    if (!sessionStorage.getItem('imsDemoUser')) window.location.replace('index.html');
  };
  const signoutDialog = document.createElement('div');
  signoutDialog.className = 'signout-overlay';
  signoutDialog.hidden = true;
  signoutDialog.innerHTML = `
    <section class="signout-dialog" role="dialog" aria-modal="true" aria-labelledby="signout-title" aria-describedby="signout-description">
      <div class="signout-symbol" aria-hidden="true">↪</div>
      <h2 id="signout-title">Sign out of FreshFold?</h2>
      <p id="signout-description">You’ll need to sign in again to access your workspace.</p>
      <div class="signout-actions">
        <button type="button" class="signout-cancel" data-signout-cancel>Cancel</button>
        <button type="button" class="signout-confirm" data-signout-confirm>Sign out</button>
      </div>
    </section>`;
  document.body.appendChild(signoutDialog);
  const cancelSignout = signoutDialog.querySelector('[data-signout-cancel]');
  const confirmSignout = signoutDialog.querySelector('[data-signout-confirm]');
  let lastFocusedElement = null;
  const closeSignout = () => {
    signoutDialog.hidden = true;
    if (lastFocusedElement) lastFocusedElement.focus();
  };
  document.querySelectorAll('[data-logout]').forEach(btn => btn.addEventListener('click', () => {
    lastFocusedElement = btn;
    signoutDialog.hidden = false;
    cancelSignout.focus();
  }));
  cancelSignout.addEventListener('click', closeSignout);
  signoutDialog.addEventListener('click', event => {
    if (event.target === signoutDialog) closeSignout();
  });
  document.addEventListener('keydown', event => {
    if (signoutDialog.hidden) return;
    if (event.key === 'Escape') closeSignout();
    if (event.key === 'Tab') {
      event.preventDefault();
      (document.activeElement === cancelSignout ? confirmSignout : cancelSignout).focus();
    }
  });
  confirmSignout.addEventListener('click', () => {
    sessionStorage.removeItem('imsDemoUser');
    window.location.href = 'index.html';
  });

  document.querySelectorAll('a[href$=".html"]').forEach(link => {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
      if (link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      // Navigate immediately; the active navigation state provides the visual feedback.
    });
  });

  const page = document.body.dataset.page;
  if (page) requireDemoLogin();

  if (page === 'dashboard') {
    const allCustomers = customers(), allOrders = orders();
    document.getElementById('customerCount').textContent = allCustomers.length;
    document.getElementById('orderCount').textContent = allOrders.length;
    document.getElementById('completedCount').textContent = allOrders.filter(o => ['Ready for Pickup','Completed'].includes(o.status)).length;
    const customerMap = new Map(allCustomers.map(c => [c.id, c.name]));
    const recent = [...allOrders].sort((a,b) => b.createdAt - a.createdAt).slice(0,5);
    const body = document.getElementById('recentOrders');
    body.innerHTML = recent.map(o => `<tr><td><strong>${escapeHtml(o.id)}</strong></td><td>${escapeHtml(customerMap.get(o.customerId) || 'Customer deleted')}</td><td>${escapeHtml(o.date)}</td><td><span class="status-pill ${statusClass(o.status)}">${escapeHtml(o.status)}</span></td><td class="text-end">${money(o.amount)}</td></tr>`).join('');
    document.getElementById('dashboardEmpty').style.display = recent.length ? 'none' : 'block';
  }

  if (page === 'customers') {
    const form = document.getElementById('customerForm');
    const editor = document.getElementById('customerEditor');
    const resetForm = () => {
      form.reset(); form.classList.remove('was-validated');
      document.getElementById('customerId').value = '';
      document.getElementById('customerFormTitle').textContent = 'Add customer';
      document.getElementById('saveCustomerBtn').textContent = 'Save customer';
    };
    const closeForm = () => { resetForm(); editor.style.display = 'none'; };
    const showForm = () => { editor.style.display = 'block'; editor.scrollIntoView({behavior:'smooth',block:'start'}); };
    const render = () => {
      const query = document.getElementById('customerSearch').value.trim().toLowerCase();
      const filtered = customers().filter(c => [c.name,c.email,c.phone,c.address].some(v => String(v || '').toLowerCase().includes(query)));
      document.getElementById('customerTotal').textContent = customers().length;
      const tbody = document.getElementById('customersTable');
      tbody.innerHTML = filtered.map(c => `<tr><td><div class="person-name">${escapeHtml(c.name)}</div><div class="subtext">${escapeHtml(c.id)}</div></td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.address || '—')}</td><td><div class="table-actions"><button class="btn btn-action" data-edit-customer="${escapeHtml(c.id)}">Edit</button><button class="btn btn-action btn-delete" data-delete-customer="${escapeHtml(c.id)}">Delete</button></div></td></tr>`).join('');
      document.getElementById('customersEmpty').style.display = filtered.length ? 'none' : 'block';
    };
    editor.style.display = 'none';
    document.getElementById('newCustomerBtn').addEventListener('click', () => { resetForm(); showForm(); });
    document.getElementById('closeCustomerForm').addEventListener('click', closeForm);
    document.getElementById('cancelCustomerBtn').addEventListener('click', closeForm);
    document.getElementById('customerSearch').addEventListener('input', render);
    form.addEventListener('submit', event => {
      event.preventDefault(); clearNotice('customerNotice'); form.classList.add('was-validated');
      if (!form.checkValidity()) return;
      const id = document.getElementById('customerId').value;
      const record = {
        id: id || makeId('CUS'),
        name: document.getElementById('customerName').value.trim(),
        email: document.getElementById('customerEmail').value.trim().toLowerCase(),
        phone: document.getElementById('customerPhone').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        createdAt: Date.now()
      };
      if (record.name.length < 2) { document.getElementById('customerName').setCustomValidity('Name too short'); form.classList.add('was-validated'); return; }
      document.getElementById('customerName').setCustomValidity('');
      const list = customers();
      const duplicate = list.some(c => c.email.toLowerCase() === record.email && c.id !== id);
      if (duplicate) { setNotice('customerNotice','A customer with this email already exists.','danger'); return; }
      if (id) {
        const updated = list.map(c => c.id === id ? {...c, ...record, createdAt: c.createdAt || record.createdAt} : c);
        write(STORAGE.customers, updated);
        setNotice('customerNotice','Customer record updated successfully.');
      } else {
        list.unshift(record); write(STORAGE.customers, list);
        setNotice('customerNotice','Customer record created successfully.');
      }
      closeForm(); render();
    });
    document.getElementById('customersTable').addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-customer]');
      const del = event.target.closest('[data-delete-customer]');
      if (edit) {
        const record = customers().find(c => c.id === edit.dataset.editCustomer);
        if (!record) return;
        showForm();
        document.getElementById('customerId').value = record.id;
        document.getElementById('customerName').value = record.name;
        document.getElementById('customerEmail').value = record.email;
        document.getElementById('customerPhone').value = record.phone;
        document.getElementById('customerAddress').value = record.address || '';
        document.getElementById('customerFormTitle').textContent = 'Edit customer';
        document.getElementById('saveCustomerBtn').textContent = 'Update customer';
      }
      if (del) {
        const id = del.dataset.deleteCustomer;
        const record = customers().find(c => c.id === id);
        if (!record || !confirm(`Delete ${record.name}? Orders linked to this customer will remain but show Customer deleted.`)) return;
        write(STORAGE.customers, customers().filter(c => c.id !== id));
        render(); setNotice('customerNotice','Customer record deleted.');
      }
    });
    render();
  }

  if (page === 'orders') {
    const form = document.getElementById('orderForm');
    const editor = document.getElementById('orderEditor');
    const resetForm = () => {
      form.reset(); form.classList.remove('was-validated');
      document.getElementById('orderId').value = '';
      document.getElementById('orderDate').value = new Date().toISOString().slice(0,10);
      document.getElementById('orderStatus').value = 'Received';
      document.getElementById('orderFormTitle').textContent = 'Create laundry order';
      document.getElementById('saveOrderBtn').textContent = 'Save laundry order';
    };
    const closeForm = () => { resetForm(); editor.style.display = 'none'; };
    const showForm = () => { editor.style.display = 'block'; editor.scrollIntoView({behavior:'smooth',block:'start'}); };
    const renderCustomers = selectedId => {
      const list = customers();
      const select = document.getElementById('orderCustomer');
      select.innerHTML = '<option value="">Select a customer…</option>' + list.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} — ${escapeHtml(c.email)}</option>`).join('');
      if (selectedId) select.value = selectedId;
      document.getElementById('noCustomersWarning').classList.toggle('d-none', list.length > 0);
      document.getElementById('newOrderBtn').disabled = list.length === 0;
    };
    const render = () => {
      const query = document.getElementById('orderSearch').value.trim().toLowerCase();
      const customerMap = new Map(customers().map(c => [c.id,c.name]));
      const filtered = orders().filter(o => [o.id,customerMap.get(o.customerId),o.date,o.status,o.notes].some(v => String(v || '').toLowerCase().includes(query)));
      document.getElementById('orderTotal').textContent = orders().length;
      document.getElementById('ordersTable').innerHTML = filtered.map(o => `<tr><td><strong>${escapeHtml(o.id)}</strong></td><td>${escapeHtml(customerMap.get(o.customerId) || 'Customer deleted')}</td><td>${escapeHtml(o.date)}</td><td><span class="status-pill ${statusClass(o.status)}">${escapeHtml(o.status)}</span></td><td class="text-end">${money(o.amount)}</td><td><div class="table-actions"><button class="btn btn-action" data-edit-order="${escapeHtml(o.id)}">Edit</button><button class="btn btn-action btn-delete" data-delete-order="${escapeHtml(o.id)}">Delete</button></div></td></tr>`).join('');
      document.getElementById('ordersEmpty').style.display = filtered.length ? 'none' : 'block';
    };
    editor.style.display = 'none';
    resetForm(); renderCustomers(); render();
    document.getElementById('newOrderBtn').addEventListener('click', () => { resetForm(); renderCustomers(); showForm(); });
    document.getElementById('closeOrderForm').addEventListener('click', closeForm);
    document.getElementById('cancelOrderBtn').addEventListener('click', closeForm);
    document.getElementById('orderSearch').addEventListener('input', render);
    form.addEventListener('submit', event => {
      event.preventDefault(); clearNotice('orderNotice'); form.classList.add('was-validated');
      if (!form.checkValidity()) return;
      const id = document.getElementById('orderId').value;
      const customerId = document.getElementById('orderCustomer').value;
      if (!customers().some(c => c.id === customerId)) {
        setNotice('orderNotice','Select an existing customer. Refresh the customer list and try again.','danger'); return;
      }
      const amount = Number(document.getElementById('orderAmount').value);
      if (!Number.isFinite(amount) || amount <= 0) { setNotice('orderNotice','Order amount must be greater than zero.','danger'); return; }
      const record = {
        id: id || makeId('ORD'),
        customerId,
        date: document.getElementById('orderDate').value,
        amount: Math.round(amount * 100) / 100,
        status: document.getElementById('orderStatus').value,
        notes: document.getElementById('orderNotes').value.trim(),
        createdAt: Date.now()
      };
      const list = orders();
      if (id) {
        write(STORAGE.orders, list.map(o => o.id === id ? {...o,...record,createdAt:o.createdAt || record.createdAt} : o));
        setNotice('orderNotice','Order updated successfully.');
      } else {
        list.unshift(record); write(STORAGE.orders,list);
        setNotice('orderNotice','Order created successfully.');
      }
      closeForm(); renderCustomers(); render();
    });
    document.getElementById('ordersTable').addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-order]');
      const del = event.target.closest('[data-delete-order]');
      if (edit) {
        const record = orders().find(o => o.id === edit.dataset.editOrder);
        if (!record) return;
        renderCustomers(record.customerId); showForm();
        document.getElementById('orderId').value = record.id;
        document.getElementById('orderCustomer').value = record.customerId;
        document.getElementById('orderDate').value = record.date;
        document.getElementById('orderAmount').value = record.amount;
        document.getElementById('orderStatus').value = record.status;
        document.getElementById('orderNotes').value = record.notes || '';
        document.getElementById('orderFormTitle').textContent = 'Edit laundry order';
        document.getElementById('saveOrderBtn').textContent = 'Update order';
      }
      if (del) {
        const id = del.dataset.deleteOrder;
        if (!orders().some(o => o.id === id) || !confirm(`Delete order ${id}? This cannot be undone.`)) return;
        write(STORAGE.orders,orders().filter(o => o.id !== id));
        render(); setNotice('orderNotice','Order record deleted.');
      }
    });
  }
})();
