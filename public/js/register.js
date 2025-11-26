// Global state
let currentEvent = null;

// Initialize page on load
document.addEventListener('DOMContentLoaded', () => {
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
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c;"></i>
                    <h3 style="margin-top: 20px; color: #333;">No Event Code Provided</h3>
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

        // Display event information
        document.getElementById('loadingEvent').style.display = 'none';
        document.getElementById('eventDetails').style.display = 'block';
        document.getElementById('eventName').textContent = currentEvent.event_name;
        document.getElementById('eventDate').textContent = formatDate(currentEvent.event_date);
        document.getElementById('eventTime').textContent = formatTime(currentEvent.event_time);
        document.getElementById('eventVenue').textContent = currentEvent.venue || 'TBA';
        document.getElementById('eventDescription').textContent = currentEvent.description || '';

        // Build dynamic registration form based on event config
        buildRegistrationForm();

        // Show registration form
        document.getElementById('registrationFormCard').style.display = 'block';

    } catch (error) {
        console.error('Load event error:', error);
        document.getElementById('loadingEvent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #e74c3c;"></i>
                <h3 style="margin-top: 20px; color: #333;">Event Not Found</h3>
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
        if (required) inputEl.required = true;
    }

    div.appendChild(inputEl);
    return div;
}

// Handle registration submission
async function handleRegistration(e) {
    e.preventDefault();

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

    showLoading();

    try {
        const data = await fetchAPI(API.registerGuest, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        // Display QR code and success message
        displayQRCode(data.guest);

        hideLoading();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Registration failed. Please try again.', 'danger');
    }
}

// Display QR code
function displayQRCode(guest) {
    // Update QR code image
    document.getElementById('qrCodeImage').src = guest.qrCode;
    document.getElementById('guestCodeDisplay').textContent = guest.guestCode;

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

    // Show success alert
    showAlert('Registration successful! Please save your QR code for event entry.', 'success');
}

// Download QR code
function downloadQRCode() {
    const qrImage = document.getElementById('qrCodeImage');
    const guestCode = document.getElementById('guestCodeDisplay').textContent;

    // Create download link
    const link = document.createElement('a');
    link.href = qrImage.src;
    link.download = `QR-Code-${guestCode}.png`;
    link.click();
}

// Print QR code
function printQRCode() {
    window.print();
}

