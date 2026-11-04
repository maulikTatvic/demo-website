/**
 * NexusTech Solutions - Main Application Script
 * Complies with strict coding standards:
 * - Function length <= 30 lines
 * - Function parameters <= 3
 * - Nesting depth <= 3
 * - Proper error handling and accessibility
 */

'use strict';

const APP_CONFIG = {
  CURRENT_PATH: window.location.pathname.split('/').pop() || 'index.html',
  ACTIVE_CLASS: 'active',
  OPEN_CLASS: 'open',
  KEYS: { ESCAPE: 'Escape' }
};

/**
 * Initializes active navigation states across desktop and mobile menus
 */
function initActiveNavigation() {
  const current = APP_CONFIG.CURRENT_PATH;
  const links = document.querySelectorAll(`a[href="${current}"]`);
  
  links.forEach(link => {
    link.classList.add(APP_CONFIG.ACTIVE_CLASS);
    link.setAttribute('aria-current', 'page');
  });
}

/**
 * Toggles mobile drawer visibility
 * @param {boolean} isOpen 
 */
function toggleMobileDrawer(isOpen) {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const toggleBtn = document.getElementById('mobile-toggle');
  
  if (!drawer || !overlay) return;
  
  drawer.classList.toggle(APP_CONFIG.OPEN_CLASS, isOpen);
  overlay.classList.toggle(APP_CONFIG.OPEN_CLASS, isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
  
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
  }
}

/**
 * Sets up mobile menu navigation handlers
 */
function initMobileNavigation() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const closeBtn = document.getElementById('drawer-close');
  const overlay = document.getElementById('drawer-overlay');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => toggleMobileDrawer(true));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleMobileDrawer(false));
  }
  if (overlay) {
    overlay.addEventListener('click', () => toggleMobileDrawer(false));
  }
  
  window.addEventListener('keydown', (event) => {
    if (event.key === APP_CONFIG.KEYS.ESCAPE) {
      toggleMobileDrawer(false);
    }
  });
}

/**
 * Toggles an accordion item
 * @param {HTMLElement} item 
 */
function toggleAccordion(item) {
  const isActive = item.classList.contains(APP_CONFIG.ACTIVE_CLASS);
  const trigger = item.querySelector('.accordion-trigger');
  
  item.classList.toggle(APP_CONFIG.ACTIVE_CLASS, !isActive);
  if (trigger) {
    trigger.setAttribute('aria-expanded', String(!isActive));
  }
}

/**
 * Sets up accessible accordion components
 */
function initAccordions() {
  const triggers = document.querySelectorAll('.accordion-trigger');
  
  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.closest('.accordion-item');
      if (parent) {
        toggleAccordion(parent);
      }
    });
  });
}

/**
 * Updates pricing display based on billing period
 * @param {boolean} isAnnual 
 */
function updatePricingDisplay(isAnnual) {
  const priceElements = document.querySelectorAll('[data-monthly-price]');
  
  priceElements.forEach(el => {
    const monthly = el.getAttribute('data-monthly-price');
    const annual = el.getAttribute('data-annual-price');
    el.textContent = isAnnual ? `$${annual}` : `$${monthly}`;
  });
  
  const periodElements = document.querySelectorAll('.price-period');
  periodElements.forEach(p => {
    p.textContent = isAnnual ? '/month (billed annually)' : '/month';
  });
}

/**
 * Initializes pricing toggle switch
 */
function initPricingSwitcher() {
  const toggle = document.getElementById('pricing-billing-toggle');
  if (!toggle) return;
  
  toggle.addEventListener('change', (e) => {
    updatePricingDisplay(e.target.checked);
  });
}

/**
 * Filters items by matching data-category
 * @param {string} category 
 */
function filterCategoryItems(category) {
  const items = document.querySelectorAll('[data-category]');
  
  items.forEach(item => {
    const itemCat = item.getAttribute('data-category');
    const isMatch = category === 'all' || itemCat === category;
    item.style.display = isMatch ? '' : 'none';
  });
}

/**
 * Initializes filter button groups
 */
function initFilterTabs() {
  const buttons = document.querySelectorAll('.filter-btn');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove(APP_CONFIG.ACTIVE_CLASS));
      btn.classList.add(APP_CONFIG.ACTIVE_CLASS);
      const cat = btn.getAttribute('data-filter') || 'all';
      filterCategoryItems(cat);
    });
  });
}

/**
 * Handles generic form submission with accessible feedback
 * @param {HTMLFormElement} form 
 * @param {string} successMessage 
 */
function handleFormSubmit(form, successMessage) {
  const feedback = form.querySelector('.form-feedback');
  if (!feedback) return;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  feedback.textContent = successMessage;
  feedback.className = 'form-feedback success';
  form.reset();

  setTimeout(() => {
    feedback.className = 'form-feedback';
    feedback.textContent = '';
  }, 5000);
}

/**
 * Initializes form submission listeners
 */
function initForms() {
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit(contactForm, 'Thank you! Your message has been received. Our team will contact you shortly.');
    });
  }

  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit(newsletterForm, 'Subscribed successfully! Thank you for joining our newsletter.');
    });
  }
}

/**
 * Bootstraps all modules on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initActiveNavigation();
  initMobileNavigation();
  initAccordions();
  initPricingSwitcher();
  initFilterTabs();
  initForms();
});

