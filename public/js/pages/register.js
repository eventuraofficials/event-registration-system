// Global state
let currentEvent = null;
let registrationInProgress = false;

function safeImageUrl(value) {
    const url = String(value || '').trim();
    if (url.startsWith('/uploads/') || /^https:\/\//i.test(url) || /^http:\/\//i.test(url)) return url;
    return '';
}

function applyEventBranding() {
    const defaults = {
        brand_name: currentEvent.client_name || currentEvent.event_name || 'Event Registration',
        tagline: '',
        footer_text: 'All rights reserved.',
        hero_kicker: 'A New Era Begins',
        hero_title: `${currentEvent.client_name || currentEvent.event_name || 'YOUR EVENT'} EVENT`.toUpperCase(),
        hero_subtitle: 'WELCOME TO WHAT\'S NEXT',
        hero_description: currentEvent.description || 'Join us for an unforgettable event experience.',
        hero_image: currentEvent.event_logo ? `/uploads/event-logos/${currentEvent.event_logo}` : '',
        supporting_image: '',
        colors: { primary: '#0f766e', secondary: '#0f172a', accent: '#ea6b57' },
        panel: {
            badge: 'Exclusive Access',
            title: 'Your Next Chapter',
            body: 'Discover the ideas, people, and experiences that make this event worth remembering.',
            stat_label: 'Guests',
            stat_value: 'Special Access'
        },
        supporting: {
            title: 'Be Part of the Next Chapter',
            lead: 'Connect, discover, and experience what is next.'
        }
    };
    const branding = currentEvent.registration_form_config?.branding || {};
    const panel = { ...defaults.panel, ...(branding.panel || {}) };
    const supporting = { ...defaults.supporting, ...(branding.supporting || {}) };
    const colors = { ...defaults.colors, ...(branding.colors || {}) };

    document.documentElement.style.setProperty('--primary', colors.primary);
    document.documentElement.style.setProperty('--primary-hover', colors.secondary);
    document.documentElement.style.setProperty('--primary-light', `${colors.primary}18`);
    document.documentElement.style.setProperty('--brand-teal', colors.primary);
    document.documentElement.style.setProperty('--brand-navy', colors.secondary);
    document.documentElement.style.setProperty('--brand-coral', colors.accent);

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element && value) element.textContent = value;
    };

    setText('heroBrandName', branding.brand_name || defaults.brand_name);
    document.querySelectorAll('[data-site-tagline]').forEach((element) => {
        element.textContent = branding.tagline || '';
        element.style.display = branding.tagline ? '' : 'none';
    });
    setText('heroKicker', branding.hero_kicker || defaults.hero_kicker);
    setText('heroTitle', branding.hero_title || defaults.hero_title);
    setText('heroSubtitle', branding.hero_subtitle || defaults.hero_subtitle);
    setText('heroDescription', branding.hero_description || defaults.hero_description);
    setText('heroPanelBadge', panel.badge);
    setText('heroPanelTitle', panel.title);
    setText('heroPanelBody', panel.body);
    setText('heroPanelStatLabel', panel.stat_label);
    setText('heroPanelStatValue', panel.stat_value);
    setText('supportingTitle', supporting.title);
    setText('supportingLead', supporting.lead);

    const heroImage = safeImageUrl(branding.hero_image || defaults.hero_image);
    const hero = document.querySelector('.premium-event-hero');
    if (heroImage && hero) {
        hero.style.backgroundImage = `linear-gradient(120deg, ${colors.secondary}d1 0%, ${colors.secondary}a6 35%, ${colors.primary}2e 100%), url(${JSON.stringify(heroImage)})`;
    }

    const supportingImage = safeImageUrl(branding.supporting_image);
    const supportingVisual = document.getElementById('supportingVisual');
    if (supportingImage && supportingVisual) {
        supportingVisual.style.backgroundImage = `linear-gradient(140deg, ${colors.secondary}59, ${colors.primary}14), url(${JSON.stringify(supportingImage)})`;
    }

    if (typeof window.updateEventFooter === 'function') {
        window.updateEventFooter({
            name: branding.brand_name || defaults.brand_name,
            text: branding.footer_text || defaults.footer_text
        });
    }
}

function getRegistrationDraftKey() {
    const eventCode = new URLSearchParams(window.location.search).get('event');
    return eventCode ? `registration-draft:${eventCode}` : null;
}

function saveRegistrationDraft() {
    const key = getRegistrationDraftKey();
    const form = document.getElementById('guestForm');
    if (!key || !form) return;

    const values = {};
    form.querySelectorAll('input, textarea, select').forEach((field) => {
        if (field.id) values[field.id] = field.value;
    });
    sessionStorage.setItem(key, JSON.stringify(values));
}

function restoreRegistrationDraft() {
    const key = getRegistrationDraftKey();
    if (!key) return;

    try {
        const values = JSON.parse(sessionStorage.getItem(key) || '{}');
        Object.entries(values).forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (field) field.value = value;
        });
    } catch (error) {
        sessionStorage.removeItem(key);
    }
}

function clearRegistrationDraft() {
    const key = getRegistrationDraftKey();
    if (key) sessionStorage.removeItem(key);
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', () => {
    // Site name will be set after event loads

    loadEventFromURL();
    document.getElementById('guestForm').addEventListener('submit', handleRegistration);
});
// Load event from URL parameter
async function loadEventFromURL() {
    try {
        // Get event code from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const eventCode = urlParams.get('event');

        if (!eventCode) {
            document.getElementById('loadingEvent').innerHTML = `
                <div style="text-align: center; padding: 32px 16px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #e74c3c;"></i>
                    <h3 style="margin-top: 16px; color: #333;">No Event Code Provided</h3>
                    <p style="color: #666;">Please scan the Event QR code to register.</p>
                </div>
            `;
            return;
        }

        // Fetch event details
        const data = await fetchAPI(API.getEventByCode(eventCode));

        if (!data.success) {
            throw new Error(data.message || 'Event not found');
        }

        currentEvent = data.event;
        applyEventBranding();

        // Display event information
        document.getElementById('loadingEvent').style.display = 'none';
        document.getElementById('eventDetails').style.display = 'block';
        document.getElementById('eventInfo').setAttribute('aria-busy', 'false');

        // Show event logo if available
        const logoEl = document.getElementById('eventLogo');
        if (logoEl && currentEvent.event_logo) {
            logoEl.src = `/uploads/event-logos/${currentEvent.event_logo}`;
            logoEl.style.display = 'block';
        }
         
        // Override site name with per-event client branding, fallback to event name
              const displayName = currentEvent.client_name || currentEvent.event_name;
        if (displayName) {
            document.querySelectorAll('[data-site-name]').forEach(el => { el.textContent = displayName; });
            document.title = displayName + ' – Registration';
        }

        // Apply event font settings
        if (currentEvent.font_style) {
            const fonts = {
                inter: "'Inter', sans-serif",
                poppins: "'Poppins', sans-serif",
                roboto: "'Roboto', sans-serif",
                playfair: "'Playfair Display', serif",
                montserrat: "'Montserrat', sans-serif"
            };
            document.documentElement.style.fontFamily = fonts[currentEvent.font_style] || fonts.inter;
        }
        if (currentEvent.font_size) {
            document.documentElement.style.fontSize = currentEvent.font_size;
        }

        // Apply client name to footer
        document.querySelectorAll('[data-footer-name]').forEach(el => {
            el.textContent = `© ${new Date().getFullYear()} ${displayName}. All rights reserved.`;
        });

        document.getElementById('eventName').textContent = currentEvent.event_name;
        document.getElementById('eventDate').textContent = formatDate(currentEvent.event_date);
        document.getElementById('eventTime').textContent = formatTime(currentEvent.event_time);
        document.getElementById('eventVenue').textContent = currentEvent.venue || 'TBA';
        document.getElementById('eventDescription').textContent = currentEvent.description || '';
        document.getElementById('heroEventDate').textContent = formatDate(currentEvent.event_date);
        document.getElementById('heroEventTime').textContent = formatTime(currentEvent.event_time);
        document.getElementById('heroEventVenue').textContent = currentEvent.venue || 'TBA';
        document.getElementById('eventName').focus({ preventScroll: true });

        // Check if registration is open
        if (!currentEvent.registration_open) {
            document.getElementById('registrationClosed').style.display = 'block';
            return;
        }

        // Show capacity badge if max_capacity is set
        const capacityBadge = document.getElementById('capacityBadge');
        if (capacityBadge && currentEvent.max_capacity) {
            const remaining = currentEvent.max_capacity - (currentEvent.registered_count || 0);
            if (remaining <= 0) {
                // Event full — show closed notice instead of form
                capacityBadge.className = 'capacity-badge full';
                capacityBadge.innerHTML = '<i class="fas fa-times-circle"></i> Event Full';
                capacityBadge.style.display = 'flex';
                document.getElementById('registrationClosed').querySelector('h3').textContent = 'Event Full';
                document.getElementById('registrationClosed').querySelector('p').textContent =
                    'This event has reached its maximum capacity. Please contact the organizer.';
                document.getElementById('registrationClosed').style.display = 'block';
                return;
            } else if (remaining <= 10) {
                capacityBadge.className = 'capacity-badge low';
                capacityBadge.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${remaining} spot${remaining === 1 ? '' : 's'} left`;
                capacityBadge.style.display = 'flex';
            } else {
                capacityBadge.className = 'capacity-badge available';
                capacityBadge.innerHTML = `<i class="fas fa-check-circle"></i> ${remaining} spots available`;
                capacityBadge.style.display = 'flex';
            }
        }

        // Build dynamic registration form based on event config
        buildRegistrationForm();

        // Show registration form
        document.getElementById('registrationFormCard').style.display = 'block';
        restoreRegistrationDraft();

    } catch (error) {
        console.error('Load event error:', error);
        document.getElementById('loadingEvent').innerHTML = `
            <div style="text-align: center; padding: 32px 16px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; color: #e74c3c;"></i>
                <h3 style="margin-top: 16px; color: #333;">Event Not Found</h3>
                <p style="color: #666;">${error.message || 'The event you\'re trying to register for does not exist or is no longer available.'}</p>
            </div>
        `;
    }
}

// Build dynamic registration form based on event configuration
function buildRegistrationForm() {
    const formConfig = currentEvent.registration_form_config;

    // If no config, use default form (already in HTML)
    if (!formConfig || !formConfig.fields) {
        return;
    }

    const formContainer = document.getElementById('guestForm');
    const submitButton = formContainer.querySelector('button[type="submit"]');

    // Clear existing form fields (except submit button)
    while (formContainer.firstChild && formContainer.firstChild !== submitButton) {
        formContainer.removeChild(formContainer.firstChild);
    }

    // Rebuild form based on config
    const fields = formConfig.fields;

    // Full Name
    if (fields.full_name && fields.full_name.enabled) {
        formContainer.insertBefore(createFormField(
            'fullName',
            'text',
            fields.full_name.label || 'Full Name',
            fields.full_name.required
        ), submitButton);
    }

    // Email
    if (fields.email && fields.email.enabled) {
        formContainer.insertBefore(createFormField(
            'email',
            'email',
            fields.email.label || 'Email Address',
            fields.email.required
        ), submitButton);
    }

    // Contact Number
    if (fields.contact_number && fields.contact_number.enabled) {
        formContainer.insertBefore(createFormField(
            'contactNumber',
            'tel',
            fields.contact_number.label || 'Contact Number',
            fields.contact_number.required
        ), submitButton);
    }

    // Home Address
    if (fields.home_address && fields.home_address.enabled) {
        formContainer.insertBefore(createFormField(
            'homeAddress',
            'textarea',
            fields.home_address.label || 'Home Address',
            fields.home_address.required
        ), submitButton);
    }

    // Company Name
    if (fields.company_name && fields.company_name.enabled) {
        formContainer.insertBefore(createFormField(
            'companyName',
            'text',
            fields.company_name.label || 'Company Name',
            fields.company_name.required
        ), submitButton);
    }

    // Guest Category
    if (fields.guest_category && fields.guest_category.enabled) {
        formContainer.insertBefore(createFormField(
            'guestCategory',
            'select',
            fields.guest_category.label || 'Guest Category',
            fields.guest_category.required,
            [
                { value: 'Regular', text: 'Regular Guest' },
                { value: 'VIP', text: 'VIP' },
                { value: 'Speaker', text: 'Speaker' },
                { value: 'Sponsor', text: 'Sponsor' },
                { value: 'Media', text: 'Media' }
            ]
        ), submitButton);
    }

    // Custom fields
    if (formConfig.custom_fields && formConfig.custom_fields.length > 0) {
        formConfig.custom_fields.forEach((field, index) => {
            formContainer.insertBefore(createFormField(
                `custom_field_${index}`,
                field.type || 'text',
                field.label,
                field.required,
                field.options
            ), submitButton);
        });
    }
}

// Helper function to create form fields
function createFormField(id, type, label, required, options) {
    const div = document.createElement('div');
    div.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', id);
    labelEl.textContent = label + (required ? ' *' : '');
    div.appendChild(labelEl);

    let inputEl;

    if (type === 'textarea') {
        inputEl = document.createElement('textarea');
        inputEl.id = id;
        inputEl.rows = 3;
        inputEl.autocomplete = id === 'homeAddress' ? 'street-address' : 'off';
        if (required) inputEl.required = true;
    } else if (type === 'select') {
        inputEl = document.createElement('select');
        inputEl.id = id;
        if (required) inputEl.required = true;

        if (options && options.length > 0) {
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text || opt.value;
                inputEl.appendChild(option);
            });
        }
    } else {
        inputEl = document.createElement('input');
        inputEl.type = type;
        inputEl.id = id;
        inputEl.autocomplete = id === 'fullName' ? 'name' : id === 'email' ? 'email' : id === 'contactNumber' ? 'tel' : 'off';
        if (required) inputEl.required = true;
    }

    inputEl.setAttribute('aria-required', required ? 'true' : 'false');
    div.appendChild(inputEl);
    return div;
}

// Handle registration submission
async function handleRegistration(e) {
    e.preventDefault();

    if (registrationInProgress) return;

    if (!currentEvent) {
        showAlert('Please select an event first', 'danger');
        return;
    }

    // Get form data
    const formData = {
        event_id: currentEvent.id,
        full_name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        contact_number: document.getElementById('contactNumber').value.trim(),
        home_address: document.getElementById('homeAddress')?.value.trim() || '',
        company_name: document.getElementById('companyName')?.value.trim() || '',
        guest_category: document.getElementById('guestCategory')?.value || 'Regular'
    };

    // Validate required fields
    if (!formData.full_name || !formData.email || !formData.contact_number) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showAlert('Please enter a valid email address', 'danger');
        return;
    }

    registrationInProgress = true;
    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
    }
    saveRegistrationDraft();

    showLoading();

    try {
        const data = await fetchAPI(API.registerGuest, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        if (data.duplicate && data.guest) {
            displayQRCode(data.guest);
            clearRegistrationDraft();
            showAlert('You are already registered for this event. Your saved ticket is shown below.', 'info');
            hideLoading();
            return;
        }

        // Display QR code and success message
        displayQRCode(data.guest);
        clearRegistrationDraft();

        if (data.emailStatus === 'failed') {
            showAlert('Registration succeeded, but the ticket email could not be delivered. Please download the QR code below.', 'warning');
        }

        hideLoading();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Registration failed. Please try again.', 'danger');
    } finally {
        registrationInProgress = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute('aria-busy');
        }
    }
}

// Display QR code
function displayQRCode(guest) {
    // Update QR code image
    document.getElementById('qrCodeImage').src = guest.qrCode;
    document.getElementById('guestCodeDisplay').textContent = guest.guestCode;

    // Show event logo on ticket if available
    const ticketLogo = document.getElementById('qrTicketLogo');
    if (ticketLogo && currentEvent.event_logo) {
        ticketLogo.src = `/uploads/event-logos/${currentEvent.event_logo}`;
        ticketLogo.style.display = 'block';
    }

    // Update event and attendee names (prominent display)
    document.getElementById('qrEventName').textContent = guest.event_name || currentEvent.event_name;
    document.getElementById('qrAttendeeName').textContent = guest.full_name;

    // Update guest details
    document.getElementById('confirmEmail').textContent = guest.email;

    // Show QR code section, hide registration
    document.getElementById('registrationSection').classList.remove('active');
    document.getElementById('qrCodeSection').classList.add('active');

    // Scroll to top to show the QR code
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('qrSuccessTitle').focus({ preventScroll: true });

    // Show success alert
    showAlert('Registration successful! Please save your QR code for event entry.', 'success');
}

// Convert base64 data URL to Blob
function dataURLtoBlob(dataURL) {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// Download QR code — works on iOS, Android, and desktop
async function downloadQRCode() {
    const qrImage = document.getElementById('qrCodeImage');
    const guestCode = document.getElementById('guestCodeDisplay').textContent.trim();
    const filename = `QR-${guestCode}.png`;

    // iPad Pro on iOS 13+ reports as MacIntel with touch support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const blob = dataURLtoBlob(qrImage.src);
    const file = new File([blob], filename, { type: 'image/png' });

    // 1. Web Share API — native share sheet on iOS and Android (best UX)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: `QR Code - ${guestCode}` });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return; // user cancelled
            // Share failed — fall through to next method
        }
    }

    // 2. iOS fallback — navigate to data URL (user saves via long-press)
    if (isIOS) {
        const newTab = window.open(qrImage.src, '_blank');
        if (!newTab) window.location.href = qrImage.src; // popup blocked fallback
        return;
    }

    // 3. Desktop / Android Chrome / Samsung Internet — blob object URL download
    const objectURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectURL), 3000);
}

// Print QR code
function printQRCode() {
    window.print();
}

