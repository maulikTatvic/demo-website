/**
 * NexusTech Solutions - Main Application & Analytics Script
 * Complies with strict coding standards:
 * - Function length <= 30 lines
 * - Function parameters <= 3
 * - Nesting depth <= 3
 * - Safe dataLayer event dispatching
 */

'use strict';

const APP_CONFIG = {
  CURRENT_PATH: window.location.pathname.split('/').pop() || 'index.html',
  ACTIVE_CLASS: 'active',
  OPEN_CLASS: 'open',
  KEYS: { ESCAPE: 'Escape' }
};

/**
 * Pushes a custom analytics event to Google Tag Manager dataLayer
 * @param {string} eventName 
 * @param {Object} eventParams 
 */
function trackCustomEvent(eventName, eventParams = {}) {
  window.dataLayer = window.dataLayer || [];
  const payload = {
    event: eventName,
    ...eventParams
  };
  window.dataLayer.push(payload);
  console.log(`[GTM dataLayer] ${eventName}:`, payload);
}

/**
 * Initializes active navigation states
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
 * Toggles an accordion item and dispatches GTM event
 * Custom Event #8: faq_accordion_toggle
 * @param {HTMLElement} item 
 */
function toggleAccordion(item) {
  const isActive = item.classList.contains(APP_CONFIG.ACTIVE_CLASS);
  const trigger = item.querySelector('.accordion-trigger');
  const willOpen = !isActive;
  
  item.classList.toggle(APP_CONFIG.ACTIVE_CLASS, willOpen);
  if (trigger) {
    trigger.setAttribute('aria-expanded', String(willOpen));
    const questionText = trigger.querySelector('span')?.textContent.trim() || 'FAQ Question';
    trackCustomEvent('faq_accordion_toggle', {
      faq_question: questionText,
      accordion_state: willOpen ? 'opened' : 'closed',
      faq_category: 'general_support'
    });
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
      if (parent) toggleAccordion(parent);
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
 * Custom Event #3: pricing_plan_toggle
 */
function initPricingSwitcher() {
  const toggle = document.getElementById('pricing-billing-toggle');
  if (!toggle) return;
  
  toggle.addEventListener('change', (e) => {
    const isAnnual = e.target.checked;
    updatePricingDisplay(isAnnual);
    trackCustomEvent('pricing_plan_toggle', {
      billing_interval: isAnnual ? 'annual' : 'monthly',
      discount_applied: isAnnual ? '20%' : 'none',
      page_location: 'pricing_page'
    });
  });
}

/**
 * Tracks pricing tier button selection
 * Custom Event #4: pricing_plan_select
 */
function initPricingPlanTracking() {
  const pricingCards = document.querySelectorAll('.pricing-card');
  pricingCards.forEach(card => {
    const btn = card.querySelector('.btn');
    const title = card.querySelector('.card-title')?.textContent.trim() || 'Custom Plan';
    const price = card.querySelector('.price-amount')?.textContent.trim() || 'Custom';
    
    if (btn) {
      btn.addEventListener('click', () => {
        const toggle = document.getElementById('pricing-billing-toggle');
        const isAnnual = toggle ? toggle.checked : false;
        trackCustomEvent('pricing_plan_select', {
          plan_name: title,
          plan_price: price,
          billing_cycle: isAnnual ? 'annual' : 'monthly'
        });
      });
    }
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
 * Dispatches filter tracking events for case studies or careers
 * Custom Event #5: case_study_filter
 * Custom Event #6: job_search_filter
 * @param {string} category 
 */
function trackFilterChange(category) {
  const isCareers = APP_CONFIG.CURRENT_PATH.includes('careers');
  if (isCareers) {
    trackCustomEvent('job_search_filter', {
      department_filter: category,
      filter_section: 'careers_openings'
    });
  } else {
    trackCustomEvent('case_study_filter', {
      filter_category: category,
      filter_type: 'industry'
    });
  }
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
      trackFilterChange(cat);
    });
  });
}

/**
 * Tracks job application CTA clicks on careers page
 * Custom Event #7: job_apply_click
 */
function initJobApplyTracking() {
  const jobCards = document.querySelectorAll('.card[data-category]');
  if (!APP_CONFIG.CURRENT_PATH.includes('careers')) return;

  jobCards.forEach(card => {
    const applyBtn = card.querySelector('.btn');
    const jobTitle = card.querySelector('.card-title')?.textContent.trim() || 'Open Role';
    const department = card.querySelector('.badge')?.textContent.trim() || 'General';
    const location = card.querySelector('span[style*="var(--color-text-light)"]')?.textContent.trim() || 'Remote';

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        trackCustomEvent('job_apply_click', {
          job_title: jobTitle,
          job_department: department,
          job_location: location
        });
      });
    }
  });
}

/**
 * Handles consultation form submission
 * Custom Event #1: lead_form_submit
 * @param {HTMLFormElement} form 
 */
function handleLeadFormSubmit(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const feedback = form.querySelector('.form-feedback');
  const inquiryType = form.querySelector('#inquiry-type')?.value || 'unspecified';
  const companyName = form.querySelector('#company-name')?.value || 'unspecified';

  trackCustomEvent('lead_form_submit', {
    form_id: 'contact-form',
    form_name: 'consultation_request',
    inquiry_type: inquiryType,
    company_name: companyName,
    form_status: 'success'
  });

  if (feedback) {
    feedback.textContent = 'Thank you! Your message has been received. Our team will contact you shortly.';
    feedback.className = 'form-feedback success';
  }
  form.reset();
  setTimeout(() => { if (feedback) feedback.className = 'form-feedback'; }, 5000);
}

/**
 * Handles newsletter subscription form submission
 * Custom Event #2: newsletter_subscribe
 * @param {HTMLFormElement} form 
 */
function handleNewsletterSubmit(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const feedback = form.querySelector('.form-feedback');

  trackCustomEvent('newsletter_subscribe', {
    form_id: 'newsletter-form',
    form_location: 'global_footer',
    subscription_status: 'success'
  });

  if (feedback) {
    feedback.textContent = 'Subscribed successfully! Thank you for joining our newsletter.';
    feedback.className = 'form-feedback success';
  }
  form.reset();
  setTimeout(() => { if (feedback) feedback.className = 'form-feedback'; }, 5000);
}

/**
 * Initializes form submission listeners
 */
function initForms() {
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLeadFormSubmit(contactForm);
    });
  }

  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleNewsletterSubmit(newsletterForm);
    });
  }
}

/**
 * Tracks navigation dropdown and menu link clicks
 * Custom Event #9: nav_menu_click
 */
function initNavigationTracking() {
  const dropdownLinks = document.querySelectorAll('.dropdown-link, .nav-list > li > a.nav-link');
  dropdownLinks.forEach(link => {
    link.addEventListener('click', () => {
      const parentDropdown = link.closest('.nav-item-dropdown');
      const category = parentDropdown ? parentDropdown.querySelector('.nav-link')?.textContent.trim() : 'Main';
      const linkText = link.querySelector('strong')?.textContent.trim() || link.textContent.trim();
      const targetUrl = link.getAttribute('href') || '#';

      trackCustomEvent('nav_menu_click', {
        menu_category: category,
        link_text: linkText,
        link_url: targetUrl
      });
    });
  });
}

/**
 * Tracks clicks on the top 10+ page directory bar
 * Custom Event #10: quick_directory_click
 */
function initDirectoryBarTracking() {
  const pills = document.querySelectorAll('.page-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const targetPage = pill.getAttribute('href') || 'index.html';
      trackCustomEvent('quick_directory_click', {
        target_page: targetPage,
        source_page: APP_CONFIG.CURRENT_PATH,
        bar_location: 'top_header_banner'
      });
    });
  });
}

/**
 * Bootstraps all modules on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initActiveNavigation();
  initMobileNavigation();
  initAccordions();
  initPricingSwitcher();
  initPricingPlanTracking();
  initFilterTabs();
  initJobApplyTracking();
  initForms();
  initNavigationTracking();
  initDirectoryBarTracking();
});
