/* Florist Studio v4.2 — targeted layout and editing repair layer. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const placeholder = 'assets/images/inventory-placeholder.svg';
  const originalRender = window.render;
  const originalShowPage = window.showPage;
  const originalAddInventory = window.addInventory;

  function inventoryImage(item) {
    return item?.image || placeholder;
  }

  function renderInventoryStable() {
    const body = byId('inventoryBody');
    const cards = byId('inventoryCards');
    if (!body || !cards || !window.db) return;
    body.innerHTML = db.inventory.map(item => `
      <tr>
        <td><div class="inventory-item-cell"><img src="${inventoryImage(item)}" alt="${item.image ? esc(item.name) : 'Inventory placeholder'}"><div><b>${esc(item.name)}</b><small>${esc(item.cat)}</small></div></div></td>
        <td>${esc(item.cat)}</td>
        <td><span class="pill ${+item.qty <= +item.min ? 'low' : ''}">${item.qty} ${esc(item.unit)}</span></td>
        <td>${money(item.cost)}</td>
        <td>${money((+item.qty || 0) * (+item.cost || 0))}</td>
        <td><div class="table-actions"><button onclick="adjInv(${item.id},-1)" aria-label="Reduce ${esc(item.name)}">−</button><button onclick="adjInv(${item.id},1)" aria-label="Increase ${esc(item.name)}">+</button><button onclick="editInventoryItem(${item.id})">Edit</button><button class="danger" onclick="del('inventory',${item.id})">Delete</button></div></td>
      </tr>`).join('');
    cards.innerHTML = db.inventory.map(item => `
      <article class="mobile-card inventory-card-stable">
        <img class="inventory-card-image" src="${inventoryImage(item)}" alt="${item.image ? esc(item.name) : 'Inventory placeholder'}">
        <div class="inventory-card-content"><div class="mobile-card-head"><b>${esc(item.name)}</b><span class="pill ${+item.qty <= +item.min ? 'low' : ''}">${item.qty} ${esc(item.unit)}</span></div><p class="mini">${esc(item.cat)}</p><div class="mini-metrics"><span>Cost <b>${money(item.cost)}</b></span><span>Value <b>${money((+item.qty || 0) * (+item.cost || 0))}</b></span></div><div class="actions"><button onclick="adjInv(${item.id},-1)">−</button><button onclick="adjInv(${item.id},1)">+</button><button onclick="editInventoryItem(${item.id})">Edit</button><button class="danger" onclick="del('inventory',${item.id})">Delete</button></div></div>
      </article>`).join('');
  }

  function renderOrdersStable() {
    const cards = byId('ordersCards');
    if (!cards || !window.db) return;
    const balance = o => Math.max(0, (+o.price || 0) - (+o.depositAmount || 0));
    cards.innerHTML = db.orders.map(o => {
      const stock = (o.stockUsed || []).map(s => `<li>${s.qty} ${esc(s.unit)} ${esc(s.name)}</li>`).join('');
      const images = (o.images || []).slice(0,4).map(src => `<img src="${src}" alt="Order inspiration">`).join('');
      return `<article class="mobile-card order-card-stable">
        ${images ? `<div class="order-gallery">${images}</div>` : ''}
        <div class="order-card-title"><div><b>${esc(o.name)}</b><p>${formatDate(o.date)} · ${esc(o.customerName || 'No customer')}</p></div><span class="pill ${orderStatus(o)==='Done'?'done':'notdone'}">${orderStatus(o)}</span></div>
        <div class="order-metrics"><span>Sale<b>${money(o.price)}</b></span><span>Deposit<b>${money(o.depositAmount)}</b></span><span>Balance<b>${money(balance(o))}</b></span><span>Profit<b>${money((+o.price||0)-(+o.cost||0))}</b></span></div>
        ${stock ? `<details class="stock-details"><summary>Stock used (${(o.stockUsed||[]).length})</summary><ul>${stock}</ul></details>` : '<p class="mini">No stock assigned.</p>'}
        <div class="actions"><button onclick="invoiceOrder.value='${o.id}';invoiceFromOrder()">Invoice</button><button onclick="openGoogleCalendar(${o.id})">Google</button><button onclick="downloadOrderICS(${o.id})">Calendar file</button><button class="danger" onclick="del('orders',${o.id})">Delete</button></div>
      </article>`;
    }).join('');
  }

  function renderInvoicesStable() {
    const cards = byId('invoicesCards');
    if (!cards || !window.db) return;
    cards.innerHTML = db.invoices.map(i => {
      const balance = Math.max(0, (+i.amount || 0) - (+i.depositAmount || 0));
      return `<article class="mobile-card invoice-card-stable"><div class="invoice-card-title"><div><b>${esc(i.customer)}</b><p>${formatDate(i.date)} · ${esc(i.item)}</p></div><span class="pill ${i.status==='Paid'?'done':'notdone'}">${esc(i.status)}</span></div><div class="invoice-metrics"><span>Total<b>${money(i.amount)}</b></span><span>Deposit<b>${money(i.depositAmount)}</b></span><span>Balance<b>${money(balance)}</b></span></div><div class="actions"><button onclick="previewInvoice(${i.id})">Preview</button><button onclick="downloadInvoice(${i.id})">Download</button><button onclick="printInvoice(${i.id})">PDF</button><button class="danger" onclick="del('invoices',${i.id})">Delete</button></div></article>`;
    }).join('');
  }

  function afterRender() {
    renderInventoryStable();
    renderOrdersStable();
    renderInvoicesStable();
    const footer = byId('globalFooter');
    if (footer) footer.hidden = location.hash !== '#install';
  }

  window.render = function stableRender() {
    originalRender();
    afterRender();
  };

  window.showPage = function stableShowPage(id) {
    originalShowPage(id);
    const footer = byId('globalFooter');
    if (footer) footer.hidden = id !== 'install';
  };

  window.editInventoryItem = function(id) {
    const item = db.inventory.find(x => x.id === Number(id));
    if (!item) return;
    byId('iEditId').value = item.id;
    byId('iName').value = item.name || '';
    byId('iCat').value = item.cat || 'Other';
    byId('iQty').value = item.qty ?? '';
    byId('iUnit').value = item.unit || '';
    byId('iCost').value = item.cost ?? '';
    byId('iMin').value = item.min ?? '';
    const preview = byId('inventoryImagePreview');
    preview.dataset.existingImage = item.image || '';
    preview.className = item.image ? 'upload-preview' : 'upload-preview empty';
    preview.innerHTML = item.image ? `<img src="${item.image}" alt="${esc(item.name)}"><button type="button" onclick="clearInventoryImage()">Remove</button>` : '<span>📷</span><small>No image yet — choose one above</small>';
    byId('inventorySaveButton').textContent = 'Save changes';
    byId('inventoryCancelEdit').hidden = false;
    byId('inventory').scrollIntoView({behavior:'smooth', block:'start'});
    byId('iName').focus();
  };

  window.cancelInventoryEdit = function() {
    byId('iEditId').value = '';
    ['iName','iQty','iUnit','iCost','iMin'].forEach(id => byId(id).value = '');
    byId('iCat').selectedIndex = 0;
    const preview = byId('inventoryImagePreview');
    preview.dataset.existingImage = '';
    preview.className = 'upload-preview empty';
    preview.innerHTML = '<span>📷</span><small>Add a clear product or flower photo</small>';
    byId('inventorySaveButton').textContent = 'Add inventory';
    byId('inventoryCancelEdit').hidden = true;
  };

  window.addInventory = function stableAddInventory() {
    const editId = Number(byId('iEditId')?.value || 0);
    if (!editId) return originalAddInventory();
    const item = db.inventory.find(x => x.id === editId);
    if (!item) return cancelInventoryEdit();
    const previewImg = byId('inventoryImagePreview')?.querySelector('img');
    item.name = byId('iName').value.trim() || 'Stock item';
    item.cat = byId('iCat').value;
    item.qty = Math.max(0, Number(byId('iQty').value) || 0);
    item.unit = byId('iUnit').value.trim() || 'items';
    item.cost = Math.max(0, Number(byId('iCost').value) || 0);
    item.min = Math.max(0, Number(byId('iMin').value) || 0);
    item.image = previewImg?.src?.startsWith('data:') ? previewImg.src : (byId('inventoryImagePreview').dataset.existingImage || item.image || '');
    cancelInventoryEdit();
    save();
  };

  document.addEventListener('DOMContentLoaded', afterRender);
})();
