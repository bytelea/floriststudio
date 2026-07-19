/* Florist Studio v3.0 — Bloom Club, privacy tools, media and dashboard personalisation */
(() => {
  const V3_VERSION = '3.0.0';
  const imageState = { inventory: '', orders: [] };
  const dashboardLabels = {
    'three-0': 'Sales and profit',
    'command-grid-0': 'This week, payments and quick actions',
    'grid-0': 'Branding and device backups',
    'grid-1': 'Charts and low-stock insights'
  };

  function ensureV3Data() {
    db.loyaltyCards ||= [];
    db.privacy ||= {
      minimise: true,
      requireConsent: true,
      privateTokens: true,
      retentionMonths: '24',
      log: []
    };
    db.cloud ||= { provider: 'supabase', url: '', anonKey: '', connected: false };
    db.dashboard ||= { hidden: [] };
    db.inventory.forEach(i => { i.image ||= ''; });
    db.orders.forEach(o => { o.images ||= []; });
    db.customers.forEach(c => { c.consent ||= {}; });
    db.version = V3_VERSION;
  }

  function logPrivacy(action, detail='') {
    ensureV3Data();
    db.privacy.log.unshift({ id: Date.now(), at: new Date().toISOString(), action, detail });
    db.privacy.log = db.privacy.log.slice(0, 50);
  }

  function fileToDataUrl(file, max = 1200, quality = .78) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Please choose an image.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The image could not be read.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('The image could not be opened.'));
        image.onload = () => {
          const scale = Math.min(1, max / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleInventoryImage(event) {
    try {
      imageState.inventory = await fileToDataUrl(event.target.files[0]);
      const preview = $('inventoryImagePreview');
      preview.classList.remove('empty');
      preview.innerHTML = `<img src="${imageState.inventory}" alt="Inventory item preview"><button type="button" onclick="clearInventoryImage()">Remove</button>`;
    } catch (error) { alert(error.message); }
  }

  async function handleOrderImages(event) {
    const files = [...event.target.files].slice(0, 8);
    try {
      imageState.orders = await Promise.all(files.map(f => fileToDataUrl(f, 1400, .76)));
      renderOrderImagePreview();
    } catch (error) { alert(error.message); }
  }

  function renderOrderImagePreview() {
    const preview = $('orderImagesPreview');
    if (!imageState.orders.length) {
      preview.className = 'upload-gallery empty';
      preview.innerHTML = '<span>🌸</span><small>Add screenshots or inspiration pictures sent by the customer</small>';
      return;
    }
    preview.className = 'upload-gallery';
    preview.innerHTML = imageState.orders.map((src, index) => `<figure><img src="${src}" alt="Customer inspiration ${index+1}"><button type="button" onclick="removeOrderImage(${index})">×</button></figure>`).join('');
  }

  window.clearInventoryImage = () => {
    imageState.inventory = '';
    $('inventoryImage').value = '';
    $('inventoryImagePreview').className = 'upload-preview empty';
    $('inventoryImagePreview').innerHTML = '<span>📷</span><small>Add a clear product or flower photo</small>';
  };
  window.removeOrderImage = index => { imageState.orders.splice(index, 1); renderOrderImagePreview(); };

  const originalAddInventory = window.addInventory;
  window.addInventory = function() {
    const before = db.inventory.length;
    originalAddInventory();
    if (db.inventory.length > before) {
      db.inventory[db.inventory.length - 1].image = imageState.inventory;
      clearInventoryImage();
      save();
    }
  };

  const originalAddManualOrder = window.addManualOrder;
  window.addManualOrder = function() {
    const before = db.orders.length;
    originalAddManualOrder();
    if (db.orders.length > before) {
      db.orders[db.orders.length - 1].images = [...imageState.orders];
      imageState.orders = [];
      $('orderImages').value = '';
      renderOrderImagePreview();
      save();
    }
  };

  function loyaltyCustomerOptions() {
    const options = '<option value="">Choose a customer</option>' + db.customers.map(c => `<option value="${c.id}">${esc(c.name)}${c.email ? ' · '+esc(c.email) : ''}</option>`).join('');
    if ($('loyaltyCustomer')) $('loyaltyCustomer').innerHTML = options;
    if ($('privacyCustomer')) $('privacyCustomer').innerHTML = options;
  }

  function cardForCustomer(customerId) {
    return db.loyaltyCards.find(card => String(card.customerId) === String(customerId));
  }

  function secureToken() {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    return [...bytes].map(b => b.toString(16).padStart(2,'0')).join('');
  }

  window.saveLoyaltyCard = function() {
    ensureV3Data();
    const customer = db.customers.find(c => String(c.id) === String($('loyaltyCustomer').value));
    if (!customer) return alert('Choose a customer first.');
    if (!$('loyaltyConsent').checked) return alert('Record the customer’s agreement before creating their digital card.');
    let card = cardForCustomer(customer.id);
    if (!card) {
      card = { id: Date.now(), customerId: customer.id, stamps: 0, rewardsRedeemed: 0, history: [], token: secureToken(), createdAt: new Date().toISOString() };
      db.loyaltyCards.push(card);
    }
    card.program = $('loyaltyProgram').value.trim() || 'Bloom Club';
    card.goal = Math.max(2, Number($('loyaltyGoal').value) || 10);
    card.reward = $('loyaltyReward').value.trim() || 'A complimentary seasonal bouquet';
    card.updatedAt = new Date().toISOString();
    customer.consent.loyalty = { granted: true, at: new Date().toISOString(), source: 'Recorded by florist' };
    logPrivacy('Loyalty consent recorded', customer.name);
    save();
    $('loyaltyCustomer').value = customer.id;
    renderV3();
  };

  window.addLoyaltyStamp = function(id) {
    const card = db.loyaltyCards.find(c => c.id === id);
    if (!card) return;
    if (card.stamps >= card.goal) return alert('This card has reached its reward. Redeem it before adding another stamp.');
    card.stamps += 1;
    card.history.unshift({ at: new Date().toISOString(), type: 'stamp', note: 'Stamp added by florist' });
    save(); renderV3();
  };
  window.removeLoyaltyStamp = function(id) {
    const card = db.loyaltyCards.find(c => c.id === id);
    if (!card || card.stamps <= 0) return;
    card.stamps -= 1;
    card.history.unshift({ at: new Date().toISOString(), type: 'adjustment', note: 'Stamp removed by florist' });
    save(); renderV3();
  };
  window.redeemLoyaltyReward = function(id) {
    const card = db.loyaltyCards.find(c => c.id === id);
    if (!card || card.stamps < card.goal) return alert('The member has not reached their reward yet.');
    if (!confirm(`Redeem “${card.reward}” and reset the card?`)) return;
    card.stamps = 0; card.rewardsRedeemed += 1;
    card.history.unshift({ at: new Date().toISOString(), type: 'reward', note: card.reward });
    save(); renderV3();
  };
  window.deleteLoyaltyCard = function(id) {
    if (!confirm('Delete this loyalty card and its stamp history?')) return;
    db.loyaltyCards = db.loyaltyCards.filter(c => c.id !== id);
    save(); renderV3();
  };
  window.shareLoyaltyCard = async function(id) {
    const card = db.loyaltyCards.find(c => c.id === id);
    const customer = db.customers.find(c => String(c.id) === String(card?.customerId));
    if (!card || !customer) return;
    const message = `${db.settings.businessName} ${card.program}: ${card.stamps}/${card.goal} stamps. Your private digital card will be available at ${location.origin === 'null' ? 'your Bloom Club customer portal once cloud sync is connected' : `${location.origin}/club/${card.token}`}.`;
    try { if (navigator.share) await navigator.share({ title: `${card.program} card`, text: message }); else { await navigator.clipboard.writeText(message); alert('Card message copied.'); } }
    catch (_) {}
  };
  window.previewLoyaltyCard = id => {
    const card = db.loyaltyCards.find(c => c.id === id);
    if (!card) return;
    $('loyaltyCustomer').value = card.customerId;
    $('loyaltyProgram').value = card.program;
    $('loyaltyGoal').value = card.goal;
    $('loyaltyReward').value = card.reward;
    $('loyaltyConsent').checked = true;
    renderWalletPreview(card);
    window.scrollTo({ top: $('loyalty').offsetTop, behavior: 'smooth' });
  };
  window.resetLoyaltyForm = function() {
    $('loyaltyCustomer').value=''; $('loyaltyProgram').value='Bloom Club'; $('loyaltyGoal').value=10;
    $('loyaltyReward').value='A complimentary seasonal bouquet'; $('loyaltyConsent').checked=false;
    renderWalletPreview(null);
  };
  window.showLoyaltyCreate = () => { resetLoyaltyForm(); $('loyaltyCustomer').focus(); };

  function renderWalletPreview(card) {
    const customer = card && db.customers.find(c => String(c.id) === String(card.customerId));
    const preview = $('walletCardPreview');
    if (!preview) return;
    if (!card || !customer) {
      preview.innerHTML = '<div class="wallet-card-top"><span>ETERNAL BLOOMS</span><span>🌸</span></div><h3>Bloom Club</h3><p>Select a member to preview their card.</p><div class="stamp-track"></div><div class="wallet-code">•••• ••••</div>';
      return;
    }
    const stamps = Array.from({length: card.goal}, (_,i)=>`<span class="${i<card.stamps?'filled':''}">${i<card.stamps?'✿':'○'}</span>`).join('');
    preview.innerHTML = `<div class="wallet-card-top"><span>${esc(db.settings.businessName).toUpperCase()}</span><span>🌸</span></div><small>MEMBER</small><h3>${esc(customer.name)}</h3><p>${esc(card.program)} · ${card.stamps} of ${card.goal} stamps</p><div class="stamp-track">${stamps}</div><div class="wallet-reward"><small>NEXT REWARD</small><b>${esc(card.reward)}</b></div><div class="wallet-code">${String(card.id).slice(-8).match(/.{1,4}/g).join(' ')}</div>`;
  }

  function renderLoyalty() {
    if (!$('loyaltyCards')) return;
    loyaltyCustomerOptions();
    const cards = db.loyaltyCards;
    $('loyaltyMemberCount').textContent = `${cards.length} member${cards.length===1?'':'s'}`;
    if ($('studioLoyaltyCount')) $('studioLoyaltyCount').textContent = cards.length;
    $('loyaltyCards').innerHTML = cards.length ? cards.map(card => {
      const customer = db.customers.find(c => String(c.id) === String(card.customerId));
      if (!customer) return '';
      const complete = card.stamps >= card.goal;
      return `<article class="loyalty-member-card"><div class="member-card-head"><div class="member-avatar">${esc(customer.name).slice(0,1).toUpperCase()}</div><div><h3>${esc(customer.name)}</h3><p>${esc(card.program)}</p></div><span class="pill ${complete?'done':''}">${card.stamps}/${card.goal}</span></div><div class="member-progress"><span style="width:${Math.min(100, card.stamps/card.goal*100)}%"></span></div><p class="mini">${complete ? 'Reward ready: '+esc(card.reward) : `${card.goal-card.stamps} stamp${card.goal-card.stamps===1?'':'s'} until ${esc(card.reward)}`}</p><div class="actions"><button class="primary" onclick="addLoyaltyStamp(${card.id})">Add stamp</button><button onclick="removeLoyaltyStamp(${card.id})">−</button>${complete?`<button onclick="redeemLoyaltyReward(${card.id})">Redeem</button>`:''}<button onclick="previewLoyaltyCard(${card.id})">View</button><button onclick="shareLoyaltyCard(${card.id})">Share</button><button class="danger" onclick="deleteLoyaltyCard(${card.id})">Delete</button></div></article>`;
    }).join('') : '<div class="empty-state">No Bloom Club members yet. Create a card from an existing customer to begin. 🌸</div>';
    const selected = cardForCustomer($('loyaltyCustomer')?.value);
    renderWalletPreview(selected || cards[0] || null);
  }

  function renderMedia() {
    if ($('inventoryBody')) $('inventoryBody').querySelectorAll('tr').forEach((row,index)=>{
      const item=db.inventory[index]; if (!item) return;
      const cell=row.cells[0];
      if (item.image && !cell.querySelector('img')) cell.innerHTML=`<div class="table-item-with-image"><img src="${item.image}" alt=""><span>${esc(item.name)}</span></div>`;
    });
    if ($('inventoryCards')) $('inventoryCards').querySelectorAll('.mobile-card').forEach((cardEl,index)=>{
      const item=db.inventory[index]; if(item?.image && !cardEl.querySelector('.inventory-card-image')) cardEl.insertAdjacentHTML('afterbegin',`<img class="inventory-card-image" src="${item.image}" alt="${esc(item.name)}">`);
    });
    if ($('ordersBody')) $('ordersBody').querySelectorAll('tr').forEach((row,index)=>{
      const order=db.orders[index]; if(order?.images?.length && !row.cells[1].querySelector('.order-thumbs')) row.cells[1].insertAdjacentHTML('beforeend',`<div class="order-thumbs">${order.images.slice(0,3).map(src=>`<img src="${src}" alt="Inspiration">`).join('')}${order.images.length>3?`<span>+${order.images.length-3}</span>`:''}</div>`);
    });
    if ($('ordersCards')) $('ordersCards').querySelectorAll('.mobile-card').forEach((cardEl,index)=>{
      const order=db.orders[index]; if(order?.images?.length && !cardEl.querySelector('.order-gallery')) cardEl.insertAdjacentHTML('afterbegin',`<div class="order-gallery">${order.images.map(src=>`<img src="${src}" alt="Customer inspiration">`).join('')}</div>`);
    });
  }

  function applyDashboardVisibility() {
    const hidden = new Set(db.dashboard.hidden || []);
    document.querySelectorAll('[data-dashboard-widget]').forEach(el => el.hidden = hidden.has(el.dataset.dashboardWidget));
  }
  window.openDashboardCustomiser = function() {
    const modal=$('dashboardCustomiser');
    $('dashboardSwitches').innerHTML=[...document.querySelectorAll('[data-dashboard-widget]')].map(el=>{
      const id=el.dataset.dashboardWidget;
      return `<label class="switch-row"><input type="checkbox" ${db.dashboard.hidden.includes(id)?'':'checked'} onchange="toggleDashboardWidget('${id}',this.checked)"><span class="switch"></span><span>${dashboardLabels[id]||id}</span></label>`;
    }).join('');
    modal.hidden=false; modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
  };
  window.closeDashboardCustomiser = function(){ const m=$('dashboardCustomiser');m.hidden=true;m.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open'); };
  window.toggleDashboardWidget = function(id, visible){
    const set=new Set(db.dashboard.hidden||[]); visible?set.delete(id):set.add(id); db.dashboard.hidden=[...set]; save(); applyDashboardVisibility();
  };
  window.resetDashboardLayout = function(){ db.dashboard.hidden=[]; save(); applyDashboardVisibility(); openDashboardCustomiser(); };

  window.saveCloudSettings = function(){
    ensureV3Data(); db.cloud.url=$('cloudUrl').value.trim(); db.cloud.anonKey=$('cloudAnonKey').value.trim(); db.cloud.connected=false;
    logPrivacy('Cloud configuration saved', db.cloud.url ? 'Supabase settings stored locally' : 'Connection cleared'); save(); renderPrivacy();
  };
  window.testCloudSettings = function(){
    const url=$('cloudUrl').value.trim(), key=$('cloudAnonKey').value.trim();
    $('cloudStatus').textContent = url && key ? 'Configuration looks complete. Live sync is not enabled in this offline build; the secure database schema and deployment step are still required.' : 'Add both your Supabase project URL and public anonymous key.';
  };
  window.savePrivacySettings = function(){
    db.privacy.minimise=$('privacyMinimise').checked; db.privacy.requireConsent=$('privacyConsent').checked; db.privacy.privateTokens=$('privacyAutoLock').checked; db.privacy.retentionMonths=$('privacyRetention').value;
    logPrivacy('Privacy defaults updated'); save(); renderPrivacy();
  };
  window.exportCustomerData = function(){
    const id=$('privacyCustomer').value; const customer=db.customers.find(c=>String(c.id)===String(id)); if(!customer)return alert('Choose a customer.');
    const payload={exportedAt:new Date().toISOString(),customer,orders:db.orders.filter(o=>String(o.customerId)===String(id)),invoices:db.invoices.filter(i=>i.customer===customer.name),loyalty:cardForCustomer(id)||null};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${customer.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-data-export.json`;a.click();URL.revokeObjectURL(a.href); logPrivacy('Customer data exported',customer.name);save();renderPrivacy();
  };
  window.eraseCustomerData = function(){
    const id=$('privacyCustomer').value; const customer=db.customers.find(c=>String(c.id)===String(id)); if(!customer)return alert('Choose a customer.');
    if(!confirm(`Erase ${customer.name}’s contact, loyalty and image data? Orders and invoices will be anonymised rather than removed.`))return;
    db.loyaltyCards=db.loyaltyCards.filter(c=>String(c.customerId)!==String(id));
    db.orders.forEach(o=>{if(String(o.customerId)===String(id)){o.customerId='';o.customerName='Deleted customer';o.images=[];}});
    db.invoices.forEach(i=>{if(i.customer===customer.name)i.customer='Deleted customer';});
    db.customers=db.customers.filter(c=>String(c.id)!==String(id));
    logPrivacy('Customer erasure completed',customer.name);save();render();renderV3();
  };

  function renderPrivacy(){
    if(!$('privacyLog'))return;
    $('cloudUrl').value=db.cloud.url||''; $('cloudAnonKey').value=db.cloud.anonKey||'';
    $('privacyMinimise').checked=db.privacy.minimise!==false; $('privacyConsent').checked=db.privacy.requireConsent!==false; $('privacyAutoLock').checked=db.privacy.privateTokens!==false; $('privacyRetention').value=db.privacy.retentionMonths||'24';
    $('cloudStatus').textContent=db.cloud.url?'Supabase details saved locally. Live sync awaits deployment and security-policy setup.':'Not connected. Data stays on this device.';
    $('privacyLog').innerHTML=db.privacy.log.length?db.privacy.log.map(item=>`<div><b>${esc(item.action)}</b><span>${new Date(item.at).toLocaleString()}</span>${item.detail?`<small>${esc(item.detail)}</small>`:''}</div>`).join(''):'<p class="mini">Privacy actions will appear here.</p>';
  }

  function addNavigation() {
    if (!pages.some(p => p[0] === 'studio')) pages.splice(1,0,['studio','Studio','🌷']);
    if (!pages.some(p => p[0] === 'loyalty')) pages.splice(7,0,['loyalty','Bloom Club','🌸']);
    if (!pages.some(p => p[0] === 'privacy')) pages.push(['privacy','Privacy','🔒']);
    if (!pages.some(p => p[0] === 'install')) pages.push(['install','Install','⬇️']);
    NAV_ICONS.loyalty='<path d="M12 21s-7-4.4-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.6-7 11-7 11Z"/><path d="M9 12h6M12 9v6"/>';
    NAV_ICONS.privacy='<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>';
    if (typeof setupNav === 'function') setupNav();
  }

  function renderV3(){ ensureV3Data(); renderLoyalty(); renderMedia(); renderPrivacy(); applyDashboardVisibility(); loyaltyCustomerOptions(); }
  const originalRender = window.render;
  window.render = function(){ originalRender(); renderV3(); };

  document.addEventListener('DOMContentLoaded',()=>{
    ensureV3Data();
    addNavigation();
    $('inventoryImage')?.addEventListener('change',handleInventoryImage);
    $('orderImages')?.addEventListener('change',handleOrderImages);
    $('loyaltyCustomer')?.addEventListener('change',e=>renderWalletPreview(cardForCustomer(e.target.value)));
    renderV3();
  });
})();
