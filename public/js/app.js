/**
 * CLAIMBACK – Frontend Application Logic
 * Single Page Application controller handling dashboard, table rendering,
 * search/filter, live date calculation, modals, validation, and theme.
 */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  const state = {
    products: [],
    stats: {
      totalProducts: 0,
      activeCount: 0,
      expiringSoonCount: 0,
      expiredCount: 0,
      upcomingExpirations: [],
      categories: []
    },
    filterStatus: 'ALL',
    filterCategory: 'ALL',
    searchQuery: '',
    sortBy: 'expiryDate',
    sortOrder: 'asc',
    currentEditingId: null,
    currentDeletingProduct: null,
    activeView: 'dashboard'
  };

  // --- DOM ELEMENT REFERENCES ---
  const elements = {
    views: document.querySelectorAll('.app-view'),
    navBtns: document.querySelectorAll('.nav-btn[data-view]'),
    brandHomeBtn: document.getElementById('brand-home-btn'),

    // KPI Cards
    kpiTotal: document.getElementById('kpi-total'),
    kpiActive: document.getElementById('kpi-active'),
    kpiExpiring: document.getElementById('kpi-expiring'),
    kpiExpired: document.getElementById('kpi-expired'),
    statCards: document.querySelectorAll('.stat-card'),

    // Upcoming list
    upcomingListContainer: document.getElementById('upcoming-list-container'),
    upcomingCountBadge: document.getElementById('upcoming-count-badge'),

    // Products table & controls
    productsTableBody: document.getElementById('products-table-body'),
    productsEmptyState: document.getElementById('products-empty-state'),
    inputSearch: document.getElementById('input-search'),
    statusFilterPills: document.querySelectorAll('#status-filter-pills .filter-pill'),
    selectCategory: document.getElementById('select-category'),
    selectSort: document.getElementById('select-sort'),
    sortHeaders: document.querySelectorAll('.product-table th.sortable'),

    // Add buttons
    navAdd: document.getElementById('nav-add'),
    btnDashAdd: document.getElementById('btn-dash-add-product'),
    btnListAdd: document.getElementById('btn-list-add-product'),
    btnEmptyAdd: document.getElementById('btn-empty-add'),
    bannerBtnAdd: document.getElementById('banner-btn-add'),
    bannerBtnView: document.getElementById('banner-btn-view'),

    // Modals
    modalForm: document.getElementById('modal-product-form'),
    formModalTitle: document.getElementById('form-modal-title'),
    productForm: document.getElementById('product-form'),
    formProductId: document.getElementById('form-product-id'),
    formName: document.getElementById('form-name'),
    formBrand: document.getElementById('form-brand'),
    formCategory: document.getElementById('form-category'),
    formPurchaseDate: document.getElementById('form-purchase-date'),
    formWarrantyDuration: document.getElementById('form-warranty-duration'),
    formWarrantyUnit: document.getElementById('form-warranty-unit'),
    formPrice: document.getElementById('form-price'),
    formSerial: document.getElementById('form-serial'),
    formSeller: document.getElementById('form-seller'),
    formNotes: document.getElementById('form-notes'),
    formPreviewDate: document.getElementById('form-preview-date'),
    formPreviewStatus: document.getElementById('form-preview-status'),

    // Details modal
    modalDetails: document.getElementById('modal-product-details'),
    detailsProductId: document.getElementById('details-product-id'),
    detailsProductName: document.getElementById('details-product-name'),
    detailsStatusBadge: document.getElementById('details-status-badge'),
    detailsProgressBar: document.getElementById('details-progress-bar'),
    detailsTimelinePurchased: document.getElementById('details-timeline-purchased'),
    detailsTimelineExpires: document.getElementById('details-timeline-expires'),
    detailsTimelineDaysLabel: document.getElementById('details-timeline-days-label'),
    detailsBrand: document.getElementById('details-brand'),
    detailsCategory: document.getElementById('details-category'),
    detailsDuration: document.getElementById('details-duration'),
    detailsPrice: document.getElementById('details-price'),
    detailsSerial: document.getElementById('details-serial'),
    detailsSeller: document.getElementById('details-seller'),
    detailsNotes: document.getElementById('details-notes'),
    btnDetailsEdit: document.getElementById('btn-details-edit'),
    btnDetailsDelete: document.getElementById('btn-details-delete'),

    // Delete modal
    modalDelete: document.getElementById('modal-delete-confirm'),
    deleteConfirmName: document.getElementById('delete-confirm-name'),
    deleteConfirmId: document.getElementById('delete-confirm-id'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete-action'),

    // Tools
    btnDemoToggle: document.getElementById('btn-demo-toggle'),
    demoBtnLabel: document.getElementById('demo-btn-label'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    themeToggle: document.getElementById('theme-toggle'),
    toastContainer: document.getElementById('toast-container'),

    // Standalone Calculator
    calcPurchaseDate: document.getElementById('calc-purchase-date'),
    calcDuration: document.getElementById('calc-duration'),
    calcUnit: document.getElementById('calc-unit'),
    calcResultDate: document.getElementById('calc-result-date'),
    calcResultDays: document.getElementById('calc-result-days'),
    calcResultStatus: document.getElementById('calc-result-status'),
    btnCalcConvertToProduct: document.getElementById('btn-calc-convert-to-product')
  };

  // --- INITIALIZATION ---
  async function init() {
    setupTheme();
    setupMaxDateLimits();
    attachEventListeners();
    await fetchDashboardStats();
    await fetchProducts();

    // Default standalone calculator to today
    const todayStr = getTodayISO();
    if (elements.calcPurchaseDate) {
      elements.calcPurchaseDate.value = todayStr;
      calculateStandaloneWarranty();
    }
  }

  // --- HELPERS ---
  function getTodayISO() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setupMaxDateLimits() {
    const today = getTodayISO();
    if (elements.formPurchaseDate) {
      elements.formPurchaseDate.setAttribute('max', today);
    }
    if (elements.calcPurchaseDate) {
      elements.calcPurchaseDate.setAttribute('max', today);
    }
  }

  // Pure frontend date arithmetic matching Java LocalDate rules
  function addMonthsToDate(dateStr, monthsToAdd) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const totalMonths = (year * 12 + (month - 1)) + monthsToAdd;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = (totalMonths % 12) + 1;

    const maxDays = new Date(newYear, newMonth, 0).getDate();
    const adjustedDay = Math.min(day, maxDays);

    const pad = (n) => String(n).padStart(2, '0');
    return `${newYear}-${pad(newMonth)}-${pad(adjustedDay)}`;
  }

  function calculateDaysDifference(expiryDateStr) {
    if (!expiryDateStr) return 0;
    const todayStr = getTodayISO();

    const [expY, expM, expD] = expiryDateStr.split('-').map(Number);
    const [refY, refM, refD] = todayStr.split('-').map(Number);

    const utcExpiry = Date.UTC(expY, expM - 1, expD);
    const utcRef = Date.UTC(refY, refM - 1, refD);

    return Math.round((utcExpiry - utcRef) / (1000 * 60 * 60 * 24));
  }

  function getStatusInfo(daysRemaining) {
    if (daysRemaining < 0) {
      return {
        key: 'EXPIRED',
        label: 'Expired',
        badgeClass: 'status-expired',
        daysLabel: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
      };
    }
    if (daysRemaining <= 30) {
      return {
        key: 'EXPIRING_SOON',
        label: 'Expiring Soon',
        badgeClass: 'status-expiring',
        daysLabel: daysRemaining === 0 ? 'Expires today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
      };
    }
    return {
      key: 'ACTIVE',
      label: 'Active',
      badgeClass: 'status-active',
      daysLabel: `${daysRemaining} days remaining`
    };
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- API CALLS ---
  async function fetchDashboardStats() {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success) {
        state.stats = json.data;
        renderDashboard();
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  async function fetchProducts() {
    try {
      const params = new URLSearchParams({
        search: state.searchQuery,
        status: state.filterStatus,
        category: state.filterCategory,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      });

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        state.products = json.data;
        renderProductsTable();
        updateCategoryDropdown();
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      showToast('Could not load products.', 'error');
    }
  }

  // --- RENDERING ---
  function renderDashboard() {
    const s = state.stats;
    elements.kpiTotal.textContent = s.totalProducts;
    elements.kpiActive.textContent = s.activeCount;
    elements.kpiExpiring.textContent = s.expiringSoonCount;
    elements.kpiExpired.textContent = s.expiredCount;

    // Has demo data?
    const hasDemo = state.products.some(p => p.productName.includes('[DEMO]'));
    if (elements.demoBtnLabel) {
      elements.demoBtnLabel.textContent = hasDemo ? 'Clear Demo Data' : 'Demo Data';
    }

    // Render upcoming expirations
    elements.upcomingListContainer.innerHTML = '';
    const upcoming = s.upcomingExpirations || [];
    elements.upcomingCountBadge.textContent = `${upcoming.length} item${upcoming.length === 1 ? '' : 's'}`;

    if (upcoming.length === 0) {
      elements.upcomingListContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-dim); font-size: 0.85rem;">
          No items expiring soon. All active warranties are in healthy standing.
        </div>
      `;
      return;
    }

    upcoming.forEach(item => {
      const statusInfo = getStatusInfo(item.daysRemaining);
      const row = document.createElement('div');
      row.className = 'upcoming-item';
      row.innerHTML = `
        <div class="upcoming-info">
          <h4>${escapeHTML(item.productName)}</h4>
          <div class="upcoming-meta">
            <span><strong>Brand:</strong> ${escapeHTML(item.brand)}</span>
            <span>&bull;</span>
            <span><strong>Expires:</strong> ${escapeHTML(item.expiryDate)}</span>
          </div>
        </div>
        <div class="upcoming-actions">
          <span class="badge ${statusInfo.badgeClass}">
            <span class="badge-dot"></span>
            ${statusInfo.daysLabel}
          </span>
          <button class="btn btn-secondary btn-sm btn-view-item" data-id="${item.productId}" title="View Details">
            View
          </button>
        </div>
      `;
      elements.upcomingListContainer.appendChild(row);
    });

    // Add view listeners to upcoming items
    elements.upcomingListContainer.querySelectorAll('.btn-view-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openProductDetails(id);
      });
    });
  }

  function renderProductsTable() {
    elements.productsTableBody.innerHTML = '';

    if (state.products.length === 0) {
      elements.productsTableBody.parentElement.style.display = 'none';
      elements.productsEmptyState.style.display = 'block';
      return;
    }

    elements.productsTableBody.parentElement.style.display = 'table';
    elements.productsEmptyState.style.display = 'none';

    state.products.forEach(p => {
      const statusInfo = getStatusInfo(p.daysRemaining);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="product-id-cell">${escapeHTML(p.productId)}</span></td>
        <td>
          <strong style="color: var(--text-main);">${escapeHTML(p.productName)}</strong>
          ${p.serialNumber ? `<div style="font-size: 0.75rem; color: var(--text-dim); font-family: monospace;">S/N: ${escapeHTML(p.serialNumber)}</div>` : ''}
        </td>
        <td>${escapeHTML(p.brand)}</td>
        <td><span class="badge badge-tag">${escapeHTML(p.category || 'General')}</span></td>
        <td>${escapeHTML(p.purchaseDate)}</td>
        <td><strong>${escapeHTML(p.expiryDate)}</strong></td>
        <td>
          <span style="font-weight: 600; font-size: 0.825rem;">
            ${p.daysRemaining >= 0 ? `${p.daysRemaining}d` : `${Math.abs(p.daysRemaining)}d ago`}
          </span>
        </td>
        <td>
          <span class="badge ${statusInfo.badgeClass}">
            <span class="badge-dot"></span>
            ${statusInfo.label}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm action-view" data-id="${p.productId}" title="View details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-secondary btn-sm action-edit" data-id="${p.productId}" title="Edit product">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
            <button class="btn btn-secondary btn-sm action-delete" data-id="${p.productId}" title="Delete product">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;

      // Quick row click to view details (unless action button clicked)
      tr.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          openProductDetails(p.productId);
        }
      });

      elements.productsTableBody.appendChild(tr);
    });

    // Attach row action handlers
    elements.productsTableBody.querySelectorAll('.action-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProductDetails(btn.getAttribute('data-id'));
      });
    });

    elements.productsTableBody.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditProductModal(btn.getAttribute('data-id'));
      });
    });

    elements.productsTableBody.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteConfirmModal(btn.getAttribute('data-id'));
      });
    });
  }

  function updateCategoryDropdown() {
    const currentVal = elements.selectCategory.value;
    const cats = state.stats.categories || ['General'];

    elements.selectCategory.innerHTML = '<option value="ALL">All Categories</option>';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === currentVal) opt.selected = true;
      elements.selectCategory.appendChild(opt);
    });
  }

  // --- NAVIGATION / VIEWS ---
  function switchView(viewName) {
    state.activeView = viewName;

    elements.views.forEach(v => {
      v.style.display = v.id === `view-${viewName}` ? 'block' : 'none';
    });

    elements.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'products') {
      fetchProducts();
    } else if (viewName === 'dashboard') {
      fetchDashboardStats();
    }
  }

  // --- MODAL CONTROLS ---
  function openModal(modalEl) {
    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('active');
    document.body.style.overflow = '';
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(closeModal);
  }

  // --- ADD / EDIT PRODUCT MODAL ---
  function openAddProductModal(prefill = {}) {
    state.currentEditingId = null;
    elements.formModalTitle.textContent = 'Add New Product';
    elements.productForm.reset();
    clearFormErrors();

    elements.formProductId.value = '';
    elements.formPurchaseDate.value = prefill.purchaseDate || getTodayISO();
    elements.formWarrantyDuration.value = prefill.warrantyDuration || '12';
    elements.formWarrantyUnit.value = prefill.warrantyUnit || 'MONTHS';
    elements.formCategory.value = prefill.category || 'Electronics';

    updateLiveFormPreview();
    openModal(elements.modalForm);
    setTimeout(() => elements.formName.focus(), 150);
  }

  function openEditProductModal(productId) {
    const product = state.products.find(p => p.productId === productId);
    if (!product) return;

    state.currentEditingId = productId;
    elements.formModalTitle.textContent = `Edit Product (${product.productId})`;
    clearFormErrors();

    elements.formProductId.value = product.productId;
    elements.formName.value = product.productName || '';
    elements.formBrand.value = product.brand || '';
    elements.formCategory.value = product.category || 'General';
    elements.formPurchaseDate.value = product.purchaseDate || '';
    elements.formWarrantyDuration.value = product.warrantyDuration || 12;
    elements.formWarrantyUnit.value = product.warrantyUnit || 'MONTHS';
    elements.formPrice.value = product.purchasePrice !== null ? product.purchasePrice : '';
    elements.formSerial.value = product.serialNumber || '';
    elements.formSeller.value = product.seller || '';
    elements.formNotes.value = product.notes || '';

    updateLiveFormPreview();
    openModal(elements.modalForm);
  }

  function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
  }

  function updateLiveFormPreview() {
    const purchaseDate = elements.formPurchaseDate.value;
    const duration = parseInt(elements.formWarrantyDuration.value, 10);
    const unit = elements.formWarrantyUnit.value;

    if (!purchaseDate || isNaN(duration) || duration <= 0) {
      elements.formPreviewDate.textContent = '--';
      elements.formPreviewStatus.innerHTML = '<span class="badge">--</span>';
      return;
    }

    const months = unit === 'YEARS' ? duration * 12 : duration;
    const expiryDate = addMonthsToDate(purchaseDate, months);
    const daysRemaining = calculateDaysDifference(expiryDate);
    const statusInfo = getStatusInfo(daysRemaining);

    elements.formPreviewDate.textContent = expiryDate;
    elements.formPreviewStatus.innerHTML = `
      <span class="badge ${statusInfo.badgeClass}">
        <span class="badge-dot"></span>
        ${statusInfo.label} (${daysRemaining >= 0 ? `${daysRemaining}d left` : `${Math.abs(daysRemaining)}d ago`})
      </span>
    `;
  }

  async function handleProductFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const payload = {
      productName: elements.formName.value.trim(),
      brand: elements.formBrand.value.trim(),
      category: elements.formCategory.value.trim() || 'General',
      purchaseDate: elements.formPurchaseDate.value,
      warrantyDuration: parseInt(elements.formWarrantyDuration.value, 10),
      warrantyUnit: elements.formWarrantyUnit.value,
      purchasePrice: elements.formPrice.value !== '' ? parseFloat(elements.formPrice.value) : null,
      serialNumber: elements.formSerial.value.trim(),
      seller: elements.formSeller.value.trim(),
      notes: elements.formNotes.value.trim()
    };

    const isEdit = Boolean(state.currentEditingId);
    const url = isEdit ? `/api/products/${state.currentEditingId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!json.success) {
        if (json.errors) {
          // Display validation errors on matching form fields
          Object.keys(json.errors).forEach(field => {
            const errEl = document.getElementById(`err-${field}`) || document.getElementById(`err-${field.toLowerCase()}`);
            if (errEl) errEl.textContent = json.errors[field];
          });
        }
        showToast(json.message || 'Please fix errors in the form.', 'error');
        return;
      }

      closeModal(elements.modalForm);
      showToast(isEdit ? 'Product updated successfully!' : `Product ${json.data.productId} added successfully!`, 'success');

      await fetchDashboardStats();
      await fetchProducts();
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Could not save product. Check server status.', 'error');
    }
  }

  // --- PRODUCT DETAILS MODAL ---
  function openProductDetails(productId) {
    const p = state.products.find(item => item.productId === productId);
    if (!p) return;

    elements.detailsProductId.textContent = p.productId;
    elements.detailsProductName.textContent = p.productName;

    const statusInfo = getStatusInfo(p.daysRemaining);
    elements.detailsStatusBadge.className = `badge ${statusInfo.badgeClass}`;
    elements.detailsStatusBadge.innerHTML = `<span class="badge-dot"></span> ${statusInfo.label}`;

    // Timeline calculation
    elements.detailsTimelinePurchased.textContent = p.purchaseDate;
    elements.detailsTimelineExpires.textContent = p.expiryDate;
    elements.detailsTimelineDaysLabel.textContent = statusInfo.daysLabel;

    const purchaseMs = new Date(p.purchaseDate).getTime();
    const expiryMs = new Date(p.expiryDate).getTime();
    const todayMs = new Date(getTodayISO()).getTime();

    let percent = 100;
    if (expiryMs > purchaseMs) {
      percent = Math.min(100, Math.max(0, Math.round(((todayMs - purchaseMs) / (expiryMs - purchaseMs)) * 100)));
    }
    elements.detailsProgressBar.style.width = `${percent}%`;

    if (p.daysRemaining < 0) {
      elements.detailsProgressBar.style.background = '#ef4444';
    } else if (p.daysRemaining <= 30) {
      elements.detailsProgressBar.style.background = '#f59e0b';
    } else {
      elements.detailsProgressBar.style.background = '#10b981';
    }

    elements.detailsBrand.textContent = p.brand;
    elements.detailsCategory.textContent = p.category || 'General';
    elements.detailsDuration.textContent = `${p.warrantyDuration} ${p.warrantyUnit.toLowerCase()}`;
    elements.detailsPrice.textContent = p.purchasePrice !== null ? `$${p.purchasePrice.toFixed(2)}` : 'Not specified';
    elements.detailsSerial.textContent = p.serialNumber || 'N/A';
    elements.detailsSeller.textContent = p.seller || 'N/A';
    elements.detailsNotes.textContent = p.notes || 'No extra notes recorded.';

    // Setup action buttons in details modal
    elements.btnDetailsEdit.onclick = () => {
      closeModal(elements.modalDetails);
      openEditProductModal(p.productId);
    };

    elements.btnDetailsDelete.onclick = () => {
      closeModal(elements.modalDetails);
      openDeleteConfirmModal(p.productId);
    };

    openModal(elements.modalDetails);
  }

  // --- DELETE CONFIRMATION ---
  function openDeleteConfirmModal(productId) {
    const product = state.products.find(p => p.productId === productId);
    if (!product) return;

    state.currentDeletingProduct = product;
    elements.deleteConfirmName.textContent = product.productName;
    elements.deleteConfirmId.textContent = `ID: ${product.productId} • Brand: ${product.brand}`;
    openModal(elements.modalDelete);
  }

  async function handleConfirmDelete() {
    if (!state.currentDeletingProduct) return;
    const { productId, productName } = state.currentDeletingProduct;

    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        closeModal(elements.modalDelete);
        showToast(`Product "${productName}" removed.`, 'info');
        await fetchDashboardStats();
        await fetchProducts();
      } else {
        showToast(json.message || 'Could not delete product.', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Deletion failed. Check server.', 'error');
    }
  }

  // --- DEMO DATA TOGGLE ---
  async function handleDemoToggle() {
    const hasDemo = state.products.some(p => p.productName.includes('[DEMO]'));
    const url = hasDemo ? '/api/demo/clear' : '/api/demo/load';

    try {
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(hasDemo ? 'Demo products cleared.' : '5 realistic demo products loaded!', 'success');
        await fetchDashboardStats();
        await fetchProducts();
      }
    } catch (err) {
      console.error('Demo toggle failed:', err);
      showToast('Failed to toggle demo data.', 'error');
    }
  }

  // --- STANDALONE CALCULATOR ---
  function calculateStandaloneWarranty() {
    const purchaseDate = elements.calcPurchaseDate.value;
    const duration = parseInt(elements.calcDuration.value, 10);
    const unit = elements.calcUnit.value;

    if (!purchaseDate || isNaN(duration) || duration <= 0) {
      elements.calcResultDate.textContent = '--';
      elements.calcResultDays.textContent = '--';
      elements.calcResultStatus.innerHTML = '--';
      elements.calcResultStatus.className = 'badge';
      return;
    }

    const months = unit === 'YEARS' ? duration * 12 : duration;
    const expiryDate = addMonthsToDate(purchaseDate, months);
    const daysRemaining = calculateDaysDifference(expiryDate);
    const statusInfo = getStatusInfo(daysRemaining);

    elements.calcResultDate.textContent = expiryDate;
    elements.calcResultDays.textContent = statusInfo.daysLabel;
    elements.calcResultStatus.className = `badge ${statusInfo.badgeClass}`;
    elements.calcResultStatus.innerHTML = `<span class="badge-dot"></span> ${statusInfo.label}`;
  }

  // --- THEME ---
  function setupTheme() {
    const saved = localStorage.getItem('claimback-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('claimback-theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    if (!elements.themeToggle) return;
    elements.themeToggle.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
  }

  // --- EVENT LISTENERS ---
  function attachEventListeners() {
    // Navigation tabs
    elements.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (view) switchView(view);
      });
    });

    if (elements.brandHomeBtn) {
      elements.brandHomeBtn.addEventListener('click', () => switchView('dashboard'));
    }

    // Modal open buttons
    if (elements.navAdd) elements.navAdd.addEventListener('click', () => openAddProductModal());
    if (elements.btnDashAdd) elements.btnDashAdd.addEventListener('click', () => openAddProductModal());
    if (elements.btnListAdd) elements.btnListAdd.addEventListener('click', () => openAddProductModal());
    if (elements.btnEmptyAdd) elements.btnEmptyAdd.addEventListener('click', () => openAddProductModal());
    if (elements.bannerBtnAdd) elements.bannerBtnAdd.addEventListener('click', () => openAddProductModal());
    if (elements.bannerBtnView) elements.bannerBtnView.addEventListener('click', () => switchView('products'));

    // Modal close buttons
    document.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
      btn.addEventListener('click', () => closeAllModals());
    });

    // Close modal on click outside box
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
      if (e.key === '/' && document.activeElement !== elements.inputSearch && !document.querySelector('.modal-overlay.active')) {
        e.preventDefault();
        switchView('products');
        setTimeout(() => elements.inputSearch.focus(), 100);
      }
    });

    // Form submit
    elements.productForm.addEventListener('submit', handleProductFormSubmit);

    // Live form preview listeners
    ['input', 'change'].forEach(evt => {
      elements.formPurchaseDate.addEventListener(evt, updateLiveFormPreview);
      elements.formWarrantyDuration.addEventListener(evt, updateLiveFormPreview);
      elements.formWarrantyUnit.addEventListener(evt, updateLiveFormPreview);
    });

    // Delete modal confirmation
    elements.btnConfirmDelete.addEventListener('click', handleConfirmDelete);

    // Search input (debounced)
    let searchTimeout;
    elements.inputSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = elements.inputSearch.value;
        fetchProducts();
      }, 200);
    });

    // Filter pills
    elements.statusFilterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.statusFilterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filterStatus = pill.getAttribute('data-status');
        fetchProducts();
      });
    });

    // KPI cards click to filter
    elements.statCards.forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.getAttribute('data-filter');
        if (filter) {
          switchView('products');
          elements.statusFilterPills.forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-status') === filter);
          });
          state.filterStatus = filter;
          fetchProducts();
        }
      });
    });

    // Category filter dropdown
    elements.selectCategory.addEventListener('change', () => {
      state.filterCategory = elements.selectCategory.value;
      fetchProducts();
    });

    // Sort dropdown
    elements.selectSort.addEventListener('change', () => {
      const [sortBy, sortOrder] = elements.selectSort.value.split('-');
      state.sortBy = sortBy;
      state.sortOrder = sortOrder;
      fetchProducts();
    });

    // Demo data toggle
    elements.btnDemoToggle.addEventListener('click', handleDemoToggle);

    // Export CSV
    elements.btnExportCsv.addEventListener('click', () => {
      window.location.href = '/api/export/csv';
      showToast('Downloading warranty registry CSV...', 'info');
    });

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Standalone Calculator events
    ['input', 'change'].forEach(evt => {
      elements.calcPurchaseDate.addEventListener(evt, calculateStandaloneWarranty);
      elements.calcDuration.addEventListener(evt, calculateStandaloneWarranty);
      elements.calcUnit.addEventListener(evt, calculateStandaloneWarranty);
    });

    elements.btnCalcConvertToProduct.addEventListener('click', () => {
      const purchaseDate = elements.calcPurchaseDate.value;
      const duration = elements.calcDuration.value;
      const unit = elements.calcUnit.value;
      openAddProductModal({
        purchaseDate,
        warrantyDuration: duration,
        warrantyUnit: unit
      });
    });
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
