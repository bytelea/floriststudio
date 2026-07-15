/* Florist Studio v2.4 — Events, recipes, suppliers, client approvals and calendar integration */
(() => {
  const baseNormalize = normalize;
  const baseRender = render;
  const baseShowPage = showPage;

  normalize = function extendedNormalize() {
    baseNormalize();
    db.events ||= [];
    db.recipes ||= [];
    db.suppliers ||= [];
    db.proposals ||= [];
    db.version = APP_VERSION;
    db.events.forEach((event) => {
      event.tasks ||= [];
      event.designs ||= [];
      event.status ||= "Enquiry";
    });
    db.recipes.forEach((recipe) => {
      recipe.stems ||= [];
      recipe.stems.forEach((stem) => {
        stem.role ||= stem.inventoryId ? "Flower" : "Other";
        stem.unit ||= "stem";
        stem.color ||= "#d99aae";
      });
      recipe.yield = Math.max(1, Number(recipe.yield || 1));
      recipe.waste = Math.max(0, Number(recipe.waste || 0));
      if (recipe.labourHours == null) recipe.labourHours = Number(recipe.labour || 0) > 0 ? 1 : 0;
      if (recipe.labourRate == null) recipe.labourRate = Number(recipe.labour || 0);
      if (recipe.mechanics == null) recipe.mechanics = Number(recipe.other || 0);
      if (recipe.overhead == null) recipe.overhead = 0;
      if (recipe.targetMargin == null) {
        const cost = Number(recipe.cost || 0);
        const price = Number(recipe.price || 0);
        recipe.targetMargin = price > 0 ? Math.max(0, Math.min(95, ((price - cost) / price) * 100)) : 50;
      }
    });
    db.suppliers.forEach((supplier) => (supplier.items ||= []));
    db.proposals.forEach((proposal) => {
      proposal.status ||= "Draft";
      proposal.token ||= makeToken();
    });
  };

  if (!pages.some((page) => page[0] === "studio")) {
    pages.splice(2, 0, ["studio", "Studio", "✨"]);
  }

  showPage = function enhancedShowPage(id) {
    baseShowPage(id);
    if (id === "studio") renderStudio();
    history.replaceState(null, "", `#${id}`);
  };

  render = function enhancedRender() {
    baseRender();
    renderStudio();
  };

  function makeToken() {
    return (
      Math.random().toString(36).slice(2, 7).toUpperCase() +
      Date.now().toString(36).slice(-4).toUpperCase()
    );
  }

  function getCustomerName(id) {
    return (
      db.customers.find((customer) => String(customer.id) === String(id))
        ?.name || ""
    );
  }

  function eventById(id) {
    return db.events.find((event) => event.id === Number(id));
  }

  function recipeById(id) {
    return db.recipes.find((recipe) => recipe.id === Number(id));
  }

  function proposalById(id) {
    return db.proposals.find((proposal) => proposal.id === Number(id));
  }

  function numeric(id) {
    return Math.max(0, Number($(id)?.value) || 0);
  }

  function setSelectOptions(select, options, emptyLabel) {
    if (!select) return;
    const selected = select.value;
    select.innerHTML = `<option value="">${esc(emptyLabel)}</option>${options}`;
    if ([...select.options].some((option) => option.value === selected))
      select.value = selected;
  }

  function renderStudio() {
    normalize();
    if (!$("studio")) return;
    renderStudioMetrics();
    renderEventOptions();
    renderEvents();
    renderRecipeInventoryOptions();
    renderRecipes();
    renderSupplierOptions();
    renderSuppliers();
    renderProposalOptions();
    renderProposals();
  }

  function renderStudioMetrics() {
    const upcoming = db.events.filter(
      (event) => event.date >= today() && event.status !== "Completed",
    ).length;
    const pending = db.proposals.filter((proposal) =>
      ["Sent", "Viewed", "Changes requested"].includes(proposal.status),
    ).length;
    $("studioUpcoming").textContent = String(upcoming);
    $("studioRecipes").textContent = String(db.recipes.length);
    $("studioSuppliers").textContent = String(db.suppliers.length);
    $("studioApprovals").textContent = String(pending);
  }

  function renderEventOptions() {
    setSelectOptions(
      $("eventCustomer"),
      db.customers
        .map(
          (customer) =>
            `<option value="${customer.id}">${esc(customer.name)}</option>`,
        )
        .join(""),
      "Choose an existing client",
    );
  }

  function renderEvents() {
    const target = $("eventCards");
    if (!target) return;
    const events = [...db.events].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    target.innerHTML = events.length
      ? events
          .map((event) => {
            const tasksDone = event.tasks.filter((task) => task.done).length;
            const linkedTotal = event.designs.reduce((sum, design) => {
              const recipe = recipeById(design.recipeId);
              return (
                sum +
                (recipe
                  ? Number(recipe.price || 0) * Number(design.qty || 1)
                  : 0)
              );
            }, 0);
            const palette = (event.palette || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            return `<article class="studio-card event-card">
        <div class="studio-card-head">
          <div><span class="eyebrow">${esc(event.type || "Event")}</span><h3>${esc(event.title)}</h3><p class="mini">${formatDate(event.date)} · ${esc(event.venue || "Venue not added")}</p></div>
          <span class="status-badge status-${slug(event.status)}">${esc(event.status)}</span>
        </div>
        ${palette.length ? `<div class="palette-row">${palette.map((color, index) => `<span style="--swatch:${paletteColour(color, index)}" title="${esc(color)}">${esc(color)}</span>`).join("")}</div>` : ""}
        <div class="event-summary"><span>Client <b>${esc(event.customerName || "Not assigned")}</b></span><span>Budget <b>${money(event.budget || 0)}</b></span><span>Recipes <b>${event.designs.length}</b></span></div>
        ${event.notes ? `<p class="studio-note">${esc(event.notes)}</p>` : ""}
        <div class="task-progress"><span style="width:${event.tasks.length ? (tasksDone / event.tasks.length) * 100 : 0}%"></span></div>
        <div class="mini">${tasksDone}/${event.tasks.length} checklist tasks complete${linkedTotal ? ` · ${money(linkedTotal)} planned floral value` : ""}</div>
        <div class="task-list">${event.tasks.map((task) => `<label class="task-row"><input type="checkbox" ${task.done ? "checked" : ""} onchange="toggleEventTask(${event.id},${task.id})"><span>${esc(task.text)}</span><button type="button" class="icon-button" onclick="deleteEventTask(${event.id},${task.id})" aria-label="Delete task">×</button></label>`).join("")}</div>
        ${
          event.designs.length
            ? `<div class="linked-recipes">${event.designs
                .map((design) => {
                  const recipe = recipeById(design.recipeId);
                  return recipe
                    ? `<span>💐 ${esc(recipe.name)} × ${design.qty}</span>`
                    : "";
                })
                .join("")}</div>`
            : ""
        }
        <div class="studio-actions">
          <select aria-label="Event status" onchange="setEventStatus(${event.id},this.value)">${["Enquiry", "Booked", "Designing", "Preparing", "Completed"].map((status) => `<option ${event.status === status ? "selected" : ""}>${status}</option>`).join("")}</select>
          <button onclick="addEventTask(${event.id})">+ Task</button>
          <button onclick="attachRecipeToEvent(${event.id})">+ Recipe</button>
          <button onclick="createProposalFromEvent(${event.id})">Proposal</button>
          <button class="danger" onclick="deleteStudioItem('events',${event.id})">Delete</button>
        </div>
      </article>`;
          })
          .join("")
      : '<div class="empty-state">No weddings or events yet. Add your first booking plan above. 🌸</div>';
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
  }

  function paletteColour(value, index) {
    const named = {
      blush: "#efcbd2",
      pink: "#e9a8bc",
      rose: "#c98294",
      red: "#b95b63",
      burgundy: "#7b3347",
      white: "#fffdf9",
      ivory: "#f5eddb",
      cream: "#f0dfc4",
      peach: "#efb99e",
      orange: "#d98b59",
      yellow: "#e7c66b",
      sage: "#9eaf99",
      green: "#789070",
      blue: "#8caec7",
      lavender: "#b5a1c7",
      purple: "#8d729d",
      plum: "#66435f",
      black: "#302b2e",
      gold: "#c6a15d",
    };
    const key = String(value || "").toLowerCase();
    return (
      named[key] ||
      ["#efcbd2", "#d7c3d8", "#b7c9b2", "#ead8b3", "#cbb7a9"][index % 5]
    );
  }

  window.switchStudioTab = function switchStudioTab(name) {
    document
      .querySelectorAll(".studio-tab")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.studioTab === name),
      );
    document
      .querySelectorAll(".studio-panel")
      .forEach((panel) =>
        panel.classList.toggle("active", panel.id === `studio-${name}`),
      );
    localStorage.ebStudioTab = name;
    if (name === "recipes") calculateRecipe();
  };

  window.addEventPlan = function addEventPlan() {
    const customerId = $("eventCustomer").value;
    db.events.push({
      id: Date.now(),
      title: $("eventTitle").value.trim() || "Wedding or event",
      type: $("eventType").value,
      date: $("eventDate").value || today(),
      venue: $("eventVenue").value.trim(),
      customerId,
      customerName: getCustomerName(customerId),
      budget: numeric("eventBudget"),
      palette: $("eventPalette").value.trim(),
      status: $("eventStatus").value,
      notes: $("eventNotes").value.trim(),
      tasks: [
        {
          id: Date.now() + 1,
          text: "Confirm design brief and colour palette",
          done: false,
        },
        {
          id: Date.now() + 2,
          text: "Confirm final stem quantities",
          done: false,
        },
        {
          id: Date.now() + 3,
          text: "Prepare delivery and installation plan",
          done: false,
        },
      ],
      designs: [],
    });
    [
      "eventTitle",
      "eventVenue",
      "eventBudget",
      "eventPalette",
      "eventNotes",
    ].forEach((id) => ($(id).value = ""));
    $("eventDate").value = today();
    save();
    setSaveStatus("Event plan created", "saved");
  };

  window.setEventStatus = function setEventStatus(id, status) {
    const event = eventById(id);
    if (!event) return;
    event.status = status;
    save();
  };

  window.addEventTask = function addEventTask(id) {
    const event = eventById(id);
    if (!event) return;
    const text = prompt("Add a checklist task");
    if (!text?.trim()) return;
    event.tasks.push({ id: Date.now(), text: text.trim(), done: false });
    save();
  };

  window.toggleEventTask = function toggleEventTask(eventId, taskId) {
    const task = eventById(eventId)?.tasks.find(
      (item) => item.id === Number(taskId),
    );
    if (!task) return;
    task.done = !task.done;
    save();
  };

  window.deleteEventTask = function deleteEventTask(eventId, taskId) {
    const event = eventById(eventId);
    if (!event) return;
    event.tasks = event.tasks.filter((task) => task.id !== Number(taskId));
    save();
  };

  window.attachRecipeToEvent = function attachRecipeToEvent(eventId) {
    const event = eventById(eventId);
    if (!event || !db.recipes.length)
      return alert("Create a stem recipe first.");
    const menu = db.recipes
      .map(
        (recipe, index) =>
          `${index + 1}. ${recipe.name} — ${money(recipe.price)}`,
      )
      .join("\n");
    const choice = Number(prompt(`Choose a recipe number:\n${menu}`));
    const recipe = db.recipes[choice - 1];
    if (!recipe) return;
    const qty = Math.max(
      1,
      Number(prompt("How many of this design?", "1")) || 1,
    );
    event.designs.push({ id: Date.now(), recipeId: recipe.id, qty });
    save();
  };

  function recipeRoleFromInventory(item) {
    const category = String(item?.category || "").toLowerCase();
    if (category.includes("foliage")) return "Foliage";
    if (category.includes("supplies") || category.includes("packaging")) return "Mechanics";
    return "Flower";
  }

  function recipeMarginFromRecord(recipe) {
    if (Number.isFinite(Number(recipe.targetMargin))) return Math.max(0, Math.min(95, Number(recipe.targetMargin)));
    const cost = Number(recipe.cost || 0);
    const price = Number(recipe.price || 0);
    return price > 0 ? Math.max(0, Math.min(95, ((price - cost) / price) * 100)) : 50;
  }

  function renderRecipeInventoryOptions() {
    document.querySelectorAll(".recipe-inventory").forEach((select) => {
      const selected = select.value;
      select.innerHTML = `<option value="">Custom ingredient</option>${db.inventory
        .map((item) => `<option value="${item.id}">${esc(item.name)} · ${money(item.cost)} / ${esc(item.unit || "unit")}</option>`)
        .join("")}`;
      if ([...select.options].some((option) => option.value === selected)) select.value = selected;
    });
  }

  window.addRecipeStemRow = function addRecipeStemRow(stem = {}) {
    const container = $("recipeStemRows");
    if (!container) return;
    const row = document.createElement("div");
    row.className = "stem-row stem-row-v2";
    row.innerHTML = `
      <div class="field-group stem-source-field">
        <label>Stock source</label>
        <select class="recipe-inventory" aria-label="Inventory source">
          <option value="">Custom ingredient</option>
          ${db.inventory.map((item) => `<option value="${item.id}" ${String(item.id) === String(stem.inventoryId || "") ? "selected" : ""}>${esc(item.name)} · ${money(item.cost)} / ${esc(item.unit || "unit")}</option>`).join("")}
        </select>
      </div>
      <div class="field-group stem-name-field">
        <label>Flower, foliage or material</label>
        <input class="stem-name" value="${esc(stem.name || "")}" placeholder="e.g. Quicksand rose" aria-label="Ingredient name">
      </div>
      <div class="field-group stem-role-field">
        <label>Role</label>
        <select class="stem-role" aria-label="Ingredient role">
          ${["Flower", "Focal flower", "Filler flower", "Foliage", "Mechanics", "Packaging", "Other"].map((role) => `<option ${role === (stem.role || "Flower") ? "selected" : ""}>${role}</option>`).join("")}
        </select>
      </div>
      <div class="field-group stem-qty-field">
        <label>Quantity</label>
        <input class="stem-qty" type="number" min="0" step="1" value="${Number(stem.qty ?? 1)}" aria-label="Ingredient quantity">
      </div>
      <div class="field-group stem-cost-field">
        <label>Unit cost</label>
        <input class="stem-cost" type="number" min="0" step="0.01" value="${Number(stem.cost || 0)}" aria-label="Cost per ingredient">
      </div>
      <div class="field-group stem-colour-field">
        <label>Colour</label>
        <input class="stem-colour" type="color" value="${/^#[0-9a-f]{6}$/i.test(stem.color || "") ? stem.color : "#d99aae"}" aria-label="Ingredient colour">
      </div>
      <div class="stem-line-total" aria-label="Ingredient line cost"><span>Line cost</span><b>${money(0)}</b></div>
      <button type="button" class="icon-button stem-remove" aria-label="Remove ingredient">×</button>`;

    const source = row.querySelector(".recipe-inventory");
    source.addEventListener("change", () => fillStemFromInventory(source));
    row.querySelector(".stem-remove").addEventListener("click", () => {
      row.remove();
      if (!container.children.length) addRecipeStemRow();
      calculateRecipe();
    });
    row.querySelectorAll("input,select").forEach((input) => {
      input.addEventListener("input", calculateRecipe);
      input.addEventListener("change", calculateRecipe);
    });
    container.appendChild(row);
    calculateRecipe();
  };

  window.fillStemFromInventory = function fillStemFromInventory(select) {
    const item = db.inventory.find((stock) => String(stock.id) === select.value);
    if (!item) return;
    const row = select.closest(".stem-row");
    row.querySelector(".stem-name").value = item.name;
    row.querySelector(".stem-cost").value = Number(item.cost || 0);
    row.querySelector(".stem-role").value = recipeRoleFromInventory(item);
    calculateRecipe();
  };

  function currentRecipeDraft() {
    const stems = [...document.querySelectorAll("#recipeStemRows .stem-row")]
      .map((row) => ({
        id: Number(row.dataset.id) || Date.now() + Math.random(),
        inventoryId: Number(row.querySelector(".recipe-inventory").value) || "",
        name: row.querySelector(".stem-name").value.trim(),
        role: row.querySelector(".stem-role").value,
        unit: "unit",
        qty: Math.max(0, Number(row.querySelector(".stem-qty").value) || 0),
        cost: Math.max(0, Number(row.querySelector(".stem-cost").value) || 0),
        color: row.querySelector(".stem-colour").value,
      }))
      .filter((stem) => stem.name && stem.qty > 0);

    const yieldCount = Math.max(1, Math.round(numeric("recipeYield") || 1));
    const stemCost = stems.reduce((sum, stem) => sum + stem.qty * stem.cost, 0);
    const stemCount = stems
      .filter((stem) => !["Mechanics", "Packaging"].includes(stem.role))
      .reduce((sum, stem) => sum + stem.qty, 0);
    const waste = Math.min(100, numeric("recipeWaste"));
    const wasteCost = stemCost * (waste / 100);
    const labourHours = numeric("recipeLabourHours");
    const labourRate = numeric("recipeLabourRate");
    const labour = labourHours * labourRate;
    const mechanics = numeric("recipeOther");
    const overhead = numeric("recipeOverhead");
    const targetMargin = Math.min(95, numeric("recipeMargin"));
    const cost = stemCost + wasteCost + labour + mechanics + overhead;
    const price = targetMargin >= 95 ? cost * 20 : cost / Math.max(0.05, 1 - targetMargin / 100);
    const profit = Math.max(0, price - cost);
    const margin = price > 0 ? (profit / price) * 100 : 0;
    const markup = cost > 0 ? (profit / cost) * 100 : 0;

    return {
      stems,
      yield: yieldCount,
      stemCount,
      waste,
      wasteCost,
      labourHours,
      labourRate,
      labour,
      mechanics,
      overhead,
      targetMargin,
      markup,
      other: mechanics,
      stemCost,
      cost,
      price,
      profit,
      margin,
      unitCost: cost / yieldCount,
      unitPrice: price / yieldCount,
    };
  }

  function roleLabel(role) {
    return role || "Other";
  }

  window.calculateRecipe = function calculateRecipe() {
    if (!$("recipeStemRows")) return;
    const draft = currentRecipeDraft();

    document.querySelectorAll("#recipeStemRows .stem-row").forEach((row) => {
      const qty = Math.max(0, Number(row.querySelector(".stem-qty").value) || 0);
      const cost = Math.max(0, Number(row.querySelector(".stem-cost").value) || 0);
      const output = row.querySelector(".stem-line-total b");
      if (output) output.textContent = money(qty * cost);
    });

    $("recipeStemCount").textContent = String(draft.stemCount);
    $("recipeStemCost").textContent = money(draft.stemCost);
    $("recipeCost").textContent = money(draft.cost);
    $("recipePrice").textContent = money(draft.price);
    $("recipeProfit").textContent = money(draft.profit);
    $("recipeGrossMargin").textContent = `${draft.margin.toFixed(1)}%`;
    $("recipeUnitCost").textContent = money(draft.unitCost);

    const board = $("recipeVisual");
    if (!draft.stems.length) {
      board.innerHTML = '<div class="recipe-empty">Add an ingredient to begin the production recipe.</div>';
      return;
    }

    const roleTotals = new Map();
    draft.stems.forEach((stem) => roleTotals.set(stem.role, (roleTotals.get(stem.role) || 0) + stem.qty));
    const totalUnits = [...roleTotals.values()].reduce((sum, value) => sum + value, 0) || 1;
    const missingCosts = draft.stems.filter((stem) => stem.cost <= 0).length;
    const composition = [...roleTotals.entries()]
      .map(([role, qty], index) => `<span style="--portion:${Math.max(4, (qty / totalUnits) * 100)}%;--segment:${["#a95d77", "#d99aae", "#8aa896", "#b08b5a", "#8797b0", "#7d6372"][index % 6]}" title="${esc(role)} ${qty}"></span>`)
      .join("");
    const ingredientRows = draft.stems
      .map((stem) => `<div class="recipe-preview-row"><i style="--bloom:${stem.color}"></i><span><b>${esc(stem.name)}</b><small>${esc(roleLabel(stem.role))} · ${stem.qty} × ${money(stem.cost)}</small></span><strong>${money(stem.qty * stem.cost)}</strong></div>`)
      .join("");

    board.innerHTML = `
      <div class="recipe-preview-section">
        <div class="recipe-preview-title"><strong>Composition</strong><span>${draft.yield} finished design${draft.yield === 1 ? "" : "s"}</span></div>
        <div class="recipe-composition-bar">${composition}</div>
        <div class="recipe-role-key">${[...roleTotals.entries()].map(([role, qty]) => `<span>${esc(role)} <b>${qty}</b></span>`).join("")}</div>
      </div>
      <div class="recipe-preview-section">
        <div class="recipe-preview-title"><strong>Procurement list</strong><span>${draft.stems.length} ingredient${draft.stems.length === 1 ? "" : "s"}</span></div>
        <div class="recipe-preview-list">${ingredientRows}</div>
      </div>
      <div class="recipe-cost-breakdown">
        <span>Flowers &amp; materials <b>${money(draft.stemCost)}</b></span>
        <span>Wastage allowance <b>${money(draft.wasteCost)}</b></span>
        <span>Labour <b>${money(draft.labour)}</b></span>
        <span>Mechanics &amp; overhead <b>${money(draft.mechanics + draft.overhead)}</b></span>
      </div>
      ${missingCosts ? `<div class="recipe-warning">${missingCosts} ingredient${missingCosts === 1 ? " has" : "s have"} no unit cost. Add costs before relying on the selling price.</div>` : ""}`;
  };

  window.resetRecipeBuilder = function resetRecipeBuilder(ask = true) {
    const hasContent = $("recipeName")?.value.trim() || [...document.querySelectorAll("#recipeStemRows .stem-name")].some((input) => input.value.trim());
    if (ask && hasContent && !confirm("Clear the current recipe builder?")) return;
    $("recipeEditId").value = "";
    $("recipeBuilderTitle").textContent = "Build a floral recipe";
    $("recipeSaveButton").textContent = "Save recipe";
    $("recipeName").value = "";
    $("recipeCategory").value = "Bridal bouquet";
    $("recipeYield").value = "1";
    $("recipeWaste").value = "10";
    $("recipeLabourHours").value = "1";
    $("recipeLabourRate").value = "15";
    $("recipeOther").value = "0";
    $("recipeOverhead").value = "0";
    $("recipeMargin").value = "50";
    $("recipeNotes").value = "";
    $("recipeStemRows").innerHTML = "";
    addRecipeStemRow();
    calculateRecipe();
  };

  window.saveStemRecipe = function saveStemRecipe() {
    const draft = currentRecipeDraft();
    const name = $("recipeName").value.trim();
    if (!name) {
      $("recipeName").focus();
      return alert("Add a recipe name before saving.");
    }
    if (!draft.stems.length) return alert("Add at least one ingredient with a quantity.");

    const editId = Number($("recipeEditId").value) || 0;
    const existing = editId ? recipeById(editId) : null;
    const record = {
      id: existing?.id || Date.now(),
      name,
      category: $("recipeCategory").value,
      notes: $("recipeNotes").value.trim(),
      ...draft,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) Object.assign(existing, record);
    else db.recipes.push(record);

    resetRecipeBuilder(false);
    save();
    setSaveStatus(existing ? "Recipe updated" : "Recipe saved", "saved");
  };

  function renderRecipes() {
    const target = $("recipeCards");
    if (!target) return;
    target.innerHTML = db.recipes.length
      ? [...db.recipes]
          .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
          .map((recipe) => {
            const stemCount = recipe.stems
              .filter((stem) => !["Mechanics", "Packaging"].includes(stem.role))
              .reduce((sum, stem) => sum + Number(stem.qty || 0), 0);
            const margin = Number(recipe.price || 0) > 0 ? ((Number(recipe.price || 0) - Number(recipe.cost || 0)) / Number(recipe.price || 0)) * 100 : 0;
            return `<article class="studio-card recipe-card recipe-library-card">
              <div class="studio-card-head">
                <div><span class="eyebrow">${esc(recipe.category || "Floral design")}</span><h3>${esc(recipe.name)}</h3><p class="mini">${stemCount} stems · ${Number(recipe.yield || 1)} finished design${Number(recipe.yield || 1) === 1 ? "" : "s"}</p></div>
                <strong>${money(recipe.price)}</strong>
              </div>
              <div class="recipe-card-metrics">
                <span>True cost <b>${money(recipe.cost)}</b></span>
                <span>Profit <b>${money(recipe.profit)}</b></span>
                <span>Margin <b>${margin.toFixed(1)}%</b></span>
              </div>
              <div class="linked-recipes">${recipe.stems.map((stem) => `<span><i style="--bloom:${stem.color || "#d99aae"}"></i>${esc(stem.name)} × ${stem.qty}</span>`).join("")}</div>
              ${recipe.notes ? `<p class="studio-note">${esc(recipe.notes)}</p>` : ""}
              <div class="studio-actions"><button class="primary" onclick="loadRecipe(${recipe.id})">Edit recipe</button><button onclick="duplicateRecipe(${recipe.id})">Duplicate</button><button onclick="createOrderFromRecipe(${recipe.id})">Use as order</button><button class="danger" onclick="deleteStudioItem('recipes',${recipe.id})">Delete</button></div>
            </article>`;
          })
          .join("")
      : '<div class="empty-state">Save your first production recipe to build a reliable pricing and procurement library.</div>';
  }

  window.loadRecipe = function loadRecipe(id) {
    const recipe = recipeById(id);
    if (!recipe) return;
    $("recipeEditId").value = String(recipe.id);
    $("recipeBuilderTitle").textContent = `Edit ${recipe.name}`;
    $("recipeSaveButton").textContent = "Update recipe";
    $("recipeName").value = recipe.name;
    $("recipeCategory").value = recipe.category || "Other design";
    $("recipeYield").value = Math.max(1, Number(recipe.yield || 1));
    $("recipeWaste").value = Number(recipe.waste || 0);
    $("recipeLabourHours").value = Number(recipe.labourHours ?? (Number(recipe.labour || 0) ? 1 : 0));
    $("recipeLabourRate").value = Number(recipe.labourRate ?? recipe.labour ?? 0);
    $("recipeOther").value = Number(recipe.mechanics ?? recipe.other ?? 0);
    $("recipeOverhead").value = Number(recipe.overhead || 0);
    $("recipeMargin").value = recipeMarginFromRecord(recipe).toFixed(1);
    $("recipeNotes").value = recipe.notes || "";
    $("recipeStemRows").innerHTML = "";
    recipe.stems.forEach(addRecipeStemRow);
    if (!recipe.stems.length) addRecipeStemRow();
    switchStudioTab("recipes");
    calculateRecipe();
    $("recipeBuilderTitle").scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.duplicateRecipe = function duplicateRecipe(id) {
    const recipe = recipeById(id);
    if (!recipe) return;
    const copy = JSON.parse(JSON.stringify(recipe));
    copy.id = Date.now();
    copy.name = `${recipe.name} copy`;
    copy.createdAt = copy.updatedAt = new Date().toISOString();
    copy.stems.forEach((stem, index) => (stem.id = Date.now() + index));
    db.recipes.push(copy);
    save();
    setSaveStatus("Recipe duplicated", "saved");
  };

  window.createOrderFromRecipe = function createOrderFromRecipe(id) {
    const recipe = recipeById(id);
    if (!recipe) return;
    const date = prompt("Order date (YYYY-MM-DD)", today()) || today();
    const customerName = prompt("Customer name (optional)", "") || "";
    const stockUsed = recipe.stems
      .filter((stem) => stem.inventoryId)
      .map((stem) => ({
        id: stem.inventoryId,
        name: stem.name,
        qty: stem.qty,
        unit: stem.unit || "units",
        cost: stem.cost,
        total: stem.qty * stem.cost,
      }));
    reserveStock(stockUsed);
    db.orders.push({
      id: Date.now(),
      name: recipe.name,
      date,
      price: recipe.price,
      cost: recipe.cost,
      customerName,
      notes: `Created from production recipe: ${recipe.name}`,
      stockUsed,
      fromRecipe: true,
      recipeId: recipe.id,
      depositPaid: false,
      depositAmount: 0,
      startTime: "",
      endTime: "",
      location: "",
    });
    save();
    alert("Order created and linked inventory ingredients were reserved.");
  };

  function renderSupplierOptions() {
    setSelectOptions(
      $("supplierPriceSupplier"),
      db.suppliers
        .map(
          (supplier) =>
            `<option value="${supplier.id}">${esc(supplier.name)}</option>`,
        )
        .join(""),
      "Choose supplier",
    );
  }

  window.addSupplier = function addSupplier() {
    db.suppliers.push({
      id: Date.now(),
      name: $("supplierName").value.trim() || "New supplier",
      contact: $("supplierContact").value.trim(),
      email: $("supplierEmail").value.trim(),
      phone: $("supplierPhone").value.trim(),
      website: $("supplierWebsite").value.trim(),
      leadDays: numeric("supplierLeadDays"),
      minOrder: numeric("supplierMinimum"),
      notes: $("supplierNotes").value.trim(),
      items: [],
    });
    [
      "supplierName",
      "supplierContact",
      "supplierEmail",
      "supplierPhone",
      "supplierWebsite",
      "supplierLeadDays",
      "supplierMinimum",
      "supplierNotes",
    ].forEach((id) => ($(id).value = ""));
    save();
  };

  window.addSupplierPrice = function addSupplierPrice() {
    const supplier = db.suppliers.find(
      (item) => String(item.id) === $("supplierPriceSupplier").value,
    );
    if (!supplier) return alert("Choose a supplier first.");
    const name = $("supplierItemName").value.trim();
    if (!name) return alert("Add an item name.");
    supplier.items.push({
      id: Date.now(),
      name,
      unit: $("supplierItemUnit").value.trim() || "stem",
      price: numeric("supplierItemPrice"),
      season: $("supplierItemSeason").value.trim(),
    });
    [
      "supplierItemName",
      "supplierItemUnit",
      "supplierItemPrice",
      "supplierItemSeason",
    ].forEach((id) => ($(id).value = ""));
    save();
  };

  function supplierComparisons() {
    const groups = new Map();
    db.suppliers.forEach((supplier) =>
      supplier.items.forEach((item) => {
        const key = item.name.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({
          ...item,
          supplierId: supplier.id,
          supplierName: supplier.name,
        });
      }),
    );
    return [...groups.values()]
      .map((items) => ({
        name: items[0].name,
        offers: items.sort((a, b) => Number(a.price) - Number(b.price)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderSuppliers() {
    const target = $("supplierCards");
    const comparison = $("supplierComparison");
    if (!target || !comparison) return;
    target.innerHTML = db.suppliers.length
      ? db.suppliers
          .map(
            (supplier) => `<article class="studio-card supplier-card">
      <div class="studio-card-head"><div><span class="eyebrow">Supplier</span><h3>${esc(supplier.name)}</h3><p class="mini">${esc(supplier.contact || "No contact added")}</p></div><span class="supplier-mark">🚚</span></div>
      <div class="supplier-details"><span>${esc(supplier.email || "No email")}</span><span>${esc(supplier.phone || "No phone")}</span><span>${supplier.leadDays || 0} day lead time</span><span>Minimum ${money(supplier.minOrder || 0)}</span></div>
      ${supplier.website ? `<a class="text-link" href="${safeUrl(supplier.website)}" target="_blank" rel="noreferrer">Visit supplier website ↗</a>` : ""}
      ${supplier.notes ? `<p class="studio-note">${esc(supplier.notes)}</p>` : ""}
      <div class="supplier-prices">${supplier.items.map((item) => `<div><span>${esc(item.name)} <small>${esc(item.unit)}</small></span><b>${money(item.price)}</b><button class="icon-button" onclick="deleteSupplierPrice(${supplier.id},${item.id})">×</button></div>`).join("") || '<p class="mini">No prices added yet.</p>'}</div>
      <div class="studio-actions"><button class="danger" onclick="deleteStudioItem('suppliers',${supplier.id})">Delete supplier</button></div>
    </article>`,
          )
          .join("")
      : '<div class="empty-state">Add wholesalers, growers and packaging suppliers to compare prices in one place.</div>';

    const groups = supplierComparisons();
    comparison.innerHTML = groups.length
      ? `<div class="comparison-table"><div class="comparison-head"><span>Item</span><span>Best price</span><span>Supplier</span><span>Range</span></div>${groups
          .map((group) => {
            const best = group.offers[0];
            const range =
              group.offers.length > 1
                ? `${money(group.offers[0].price)}–${money(group.offers[group.offers.length - 1].price)}`
                : "Only quote";
            return `<div><span><b>${esc(group.name)}</b><small>${group.offers.length} quote${group.offers.length === 1 ? "" : "s"}</small></span><span class="best-price">${money(best.price)}</span><span>${esc(best.supplierName)}</span><span>${range}</span></div>`;
          })
          .join("")}</div>`
      : '<div class="empty-state">Add the same item from two or more suppliers to reveal the best price.</div>';
  }

  function safeUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "#";
    if (/^https?:\/\//i.test(url)) return esc(url);
    return `https://${esc(url)}`;
  }

  window.deleteSupplierPrice = function deleteSupplierPrice(
    supplierId,
    itemId,
  ) {
    const supplier = db.suppliers.find(
      (item) => item.id === Number(supplierId),
    );
    if (!supplier) return;
    supplier.items = supplier.items.filter(
      (item) => item.id !== Number(itemId),
    );
    save();
  };

  function renderProposalOptions() {
    setSelectOptions(
      $("proposalEvent"),
      db.events
        .map(
          (event) =>
            `<option value="${event.id}">${esc(event.title)} · ${formatDate(event.date)}</option>`,
        )
        .join(""),
      "Create without an event",
    );
  }

  window.fillProposalFromEvent = function fillProposalFromEvent() {
    const event = eventById($("proposalEvent").value);
    if (!event) return;
    const designTotal = event.designs.reduce((sum, design) => {
      const recipe = recipeById(design.recipeId);
      return (
        sum + (recipe ? Number(recipe.price || 0) * Number(design.qty || 1) : 0)
      );
    }, 0);
    $("proposalClient").value = event.customerName || "";
    $("proposalTitle").value = event.title;
    $("proposalTotal").value = designTotal || event.budget || 0;
    $("proposalDeposit").value =
      Math.round((designTotal || event.budget || 0) * 0.3 * 100) / 100;
    $("proposalDueDate").value = event.date || today();
    $("proposalSummary").value = [
      `${event.type || "Event"} floral design for ${event.title}.`,
      event.venue ? `Venue: ${event.venue}.` : "",
      event.palette ? `Palette: ${event.palette}.` : "",
      event.designs.length
        ? `Designs: ${event.designs.map((design) => `${recipeById(design.recipeId)?.name || "Floral design"} × ${design.qty}`).join(", ")}.`
        : "",
      event.notes || "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  window.createProposalFromEvent = function createProposalFromEvent(eventId) {
    switchStudioTab("portal");
    $("proposalEvent").value = String(eventId);
    fillProposalFromEvent();
    $("proposalTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  };

  window.addProposal = function addProposal() {
    const event = eventById($("proposalEvent").value);
    db.proposals.push({
      id: Date.now(),
      token: makeToken(),
      eventId: event?.id || "",
      client:
        $("proposalClient").value.trim() || event?.customerName || "Client",
      title:
        $("proposalTitle").value.trim() || event?.title || "Floral proposal",
      summary: $("proposalSummary").value.trim(),
      total: numeric("proposalTotal"),
      deposit: numeric("proposalDeposit"),
      dueDate: $("proposalDueDate").value || event?.date || today(),
      status: "Draft",
      signature: "",
      decisionNote: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    [
      "proposalClient",
      "proposalTitle",
      "proposalSummary",
      "proposalTotal",
      "proposalDeposit",
    ].forEach((id) => ($(id).value = ""));
    $("proposalDueDate").value = today();
    save();
  };

  function renderProposals() {
    const target = $("proposalCards");
    if (!target) return;
    target.innerHTML = db.proposals.length
      ? [...db.proposals]
          .reverse()
          .map(
            (proposal) => `<article class="studio-card proposal-card">
      <div class="studio-card-head"><div><span class="eyebrow">Proposal ${esc(proposal.token)}</span><h3>${esc(proposal.title)}</h3><p class="mini">Prepared for ${esc(proposal.client)}</p></div><span class="status-badge status-${slug(proposal.status)}">${esc(proposal.status)}</span></div>
      <div class="proposal-money"><span>Total <b>${money(proposal.total)}</b></span><span>Deposit <b>${money(proposal.deposit)}</b></span><span>Balance <b>${money(Math.max(0, proposal.total - proposal.deposit))}</b></span></div>
      <p class="studio-note proposal-summary">${esc(proposal.summary || "No proposal notes added.").replace(/\n/g, "<br>")}</p>
      ${proposal.signature ? `<div class="approval-record">Approved by <b>${esc(proposal.signature)}</b>${proposal.updatedAt ? ` · ${new Date(proposal.updatedAt).toLocaleString(db.settings.locale || undefined)}` : ""}</div>` : ""}
      ${proposal.decisionNote ? `<div class="change-note">${esc(proposal.decisionNote)}</div>` : ""}
      <div class="studio-actions"><button class="primary" onclick="openClientPortal(${proposal.id})">Open portal</button><button onclick="markProposalSent(${proposal.id})">Mark sent</button><button onclick="copyProposalMessage(${proposal.id})">Copy message</button><button onclick="downloadProposal(${proposal.id})">Download</button><button class="danger" onclick="deleteStudioItem('proposals',${proposal.id})">Delete</button></div>
    </article>`,
          )
          .join("")
      : '<div class="empty-state">Create a polished proposal, preview it as your client and record approval or requested changes.</div>';
  }

  window.markProposalSent = function markProposalSent(id) {
    const proposal = proposalById(id);
    if (!proposal) return;
    proposal.status = "Sent";
    proposal.updatedAt = new Date().toISOString();
    save();
  };

  window.openClientPortal = function openClientPortal(id) {
    const proposal = proposalById(id);
    if (!proposal) return;
    if (proposal.status === "Sent") proposal.status = "Viewed";
    proposal.updatedAt = new Date().toISOString();
    $("portalProposalId").value = String(id);
    $("portalBrand").textContent = db.settings.businessName;
    $("portalTitle").textContent = proposal.title;
    $("portalClientGreeting").textContent =
      `Prepared especially for ${proposal.client}`;
    $("portalSummary").innerHTML = esc(
      proposal.summary || "Your floral proposal is ready to review.",
    ).replace(/\n/g, "<br>");
    $("portalTotal").textContent = money(proposal.total);
    $("portalDeposit").textContent = money(proposal.deposit);
    $("portalBalance").textContent = money(
      Math.max(0, proposal.total - proposal.deposit),
    );
    $("portalDueDate").textContent = formatDate(proposal.dueDate);
    $("portalSignature").value = proposal.signature || "";
    $("portalDecisionNote").value = proposal.decisionNote || "";
    $("clientPortalModal").classList.add("open");
    $("clientPortalModal").setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    save();
  };

  window.closeClientPortal = function closeClientPortal() {
    $("clientPortalModal").classList.remove("open");
    $("clientPortalModal").setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  window.portalDecision = function portalDecision(status) {
    const proposal = proposalById($("portalProposalId").value);
    if (!proposal) return;
    const signature = $("portalSignature").value.trim();
    if (status === "Approved" && !signature)
      return alert("Please add the client name before approving.");
    proposal.status = status;
    proposal.signature = signature;
    proposal.decisionNote = $("portalDecisionNote").value.trim();
    proposal.updatedAt = new Date().toISOString();
    save();
    closeClientPortal();
    setSaveStatus(
      status === "Approved" ? "Proposal approved" : "Changes recorded",
      "saved",
    );
  };

  function proposalMessage(proposal) {
    return `Hello ${proposal.client},\n\nYour floral proposal “${proposal.title}” is ready.\nTotal: ${money(proposal.total)}\nDeposit: ${money(proposal.deposit)}\nBalance: ${money(Math.max(0, proposal.total - proposal.deposit))}\nDecision requested by: ${formatDate(proposal.dueDate)}\n\n${proposal.summary || ""}\n\nProposal reference: ${proposal.token}\n${db.settings.businessName}`;
  }

  window.copyProposalMessage = async function copyProposalMessage(id) {
    const proposal = proposalById(id);
    if (!proposal) return;
    try {
      await navigator.clipboard.writeText(proposalMessage(proposal));
      setSaveStatus("Proposal message copied", "saved");
    } catch (error) {
      prompt("Copy this proposal message", proposalMessage(proposal));
    }
  };

  function proposalHTML(proposal) {
    const logo =
      db.settings.logoData || "assets/images/eternal-blooms-logo.png";
    const summary = esc(proposal.summary || "").replace(/\n/g, "<br>");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(proposal.title)}</title><style>
      :root{font-family:Inter,system-ui,-apple-system,sans-serif;color:#30232b;background:#eee7ec}*{box-sizing:border-box}body{margin:0;padding:clamp(14px,4vw,42px);background:radial-gradient(circle at 15% 5%,#fff8fb 0,transparent 34%),linear-gradient(145deg,#f6eff3,#e8e1e8)}.sheet{max-width:820px;margin:auto;padding:clamp(26px,6vw,64px);border:1px solid #ffffffc7;border-radius:38px;background:linear-gradient(145deg,#ffffffd9,#fffafcc2);box-shadow:inset 0 1px #fff,0 28px 90px #39233024;backdrop-filter:blur(28px) saturate(1.15)}.brand{text-align:center}.brand img{width:92px;height:92px;padding:7px;border:1px solid #ffffffd9;border-radius:28px;object-fit:cover;background:#ffffffb5;box-shadow:0 14px 35px #4f2e421f}.brand h1{font-family:Georgia,serif;font-size:clamp(2.3rem,8vw,4.35rem);line-height:1;margin:18px 0 7px;color:#3b2332}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-weight:850;font-size:.72rem;color:#8d4864}.summary{line-height:1.75;margin-top:30px;padding:26px 0;border-top:1px solid #6e52621f;border-bottom:1px solid #6e52621f}.money{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:26px 0}.money div{padding:20px;border:1px solid #ffffffcc;border-radius:22px;background:linear-gradient(145deg,#ffffffa8,#f4eaf08f);box-shadow:inset 0 1px #fff}.money b{display:block;font-size:1.35rem;margin-top:6px;color:#5f3046}.footer{text-align:center;color:#786875;margin-top:38px}button{border:1px solid #ffffff3d;border-radius:999px;padding:13px 20px;font-weight:850;background:linear-gradient(135deg,#4c293b,#8d4864);color:#fff;box-shadow:0 12px 26px #5f30463d}@media(max-width:600px){body{padding:0}.sheet{border-radius:0;min-height:100vh}.money{grid-template-columns:1fr}}</style></head><body><main class="sheet"><div class="brand"><img src="${logo}" alt=""><div class="eyebrow">Floral proposal ${esc(proposal.token)}</div><h1>${esc(proposal.title)}</h1><p>Prepared for ${esc(proposal.client)}</p></div><div class="summary">${summary || "Your floral proposal is ready to review."}</div><div class="money"><div>Total<b>${money(proposal.total)}</b></div><div>Deposit<b>${money(proposal.deposit)}</b></div><div>Balance<b>${money(Math.max(0, proposal.total - proposal.deposit))}</b></div></div><p><b>Decision requested by:</b> ${formatDate(proposal.dueDate)}</p><button onclick="window.print()">Print or save as PDF</button><div class="footer">Prepared by ${esc(db.settings.businessName)}<br>${esc(db.settings.businessUser || "")}</div></main></body></html>`;
  }

  window.downloadProposal = function downloadProposal(id) {
    const proposal = proposalById(id);
    if (!proposal) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([proposalHTML(proposal)], { type: "text/html" }),
    );
    link.download = `proposal-${slug(proposal.client)}-${proposal.token}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.deleteStudioItem = function deleteStudioItem(type, id) {
    if (!confirm("Delete this item?")) return;
    db[type] = db[type].filter((item) => item.id !== Number(id));
    if (type === "recipes")
      db.events.forEach(
        (event) =>
          (event.designs = event.designs.filter(
            (design) => design.recipeId !== Number(id),
          )),
      );
    save();
  };

  function addStudioQuickAction() {
    const quick = document.querySelector(".quick-actions");
    if (quick && !quick.querySelector("[data-studio-quick]")) {
      const button = document.createElement("button");
      button.dataset.studioQuick = "true";
      button.textContent = "Plan an event";
      button.className = "primary";
      button.onclick = () => showPage("studio");
      quick.appendChild(button);
    }
  }

  function initialiseStudio() {
    normalize();
    setupNav();
    addStudioQuickAction();
    $("eventDate").value = today();
    $("proposalDueDate").value = today();
    if (!$("recipeStemRows").children.length) addRecipeStemRow();
    ["recipeYield", "recipeWaste", "recipeLabourHours", "recipeLabourRate", "recipeOther", "recipeOverhead", "recipeMargin"].forEach(
      (id) => $(id).addEventListener("input", calculateRecipe),
    );
    const tab = localStorage.ebStudioTab || "events";
    switchStudioTab(tab);
    render();
    const hash = location.hash.slice(1);
    if (pages.some((page) => page[0] === hash)) showPage(hash);
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      $("clientPortalModal")?.classList.contains("open")
    )
      closeClientPortal();
  });

  initialiseStudio();
})();
