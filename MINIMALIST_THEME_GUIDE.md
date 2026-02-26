# Minimalist Theme Guide
## Complete Copy-Paste CSS Base Theme

This is the complete minimalist design system used throughout the Event Registration System.

---

## 🎨 Base Theme (Copy-Paste Ready)

```css
/* MINIMALIST BASE THEME */

body {
  background: #F8FAFC;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1E293B;
  padding: 20px;
  margin: 0;
}

.card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
  margin-bottom: 20px;
  transition: 0.2s ease;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.btn {
  display: inline-block;
  background: #3B82F6;
  color: #FFFFFF;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: 0.2s ease;
  text-decoration: none;
}

.btn:hover {
  background: #2563EB;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59,130,246,0.25);
}

input,
select,
textarea {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #CBD5E1;
  margin-bottom: 12px;
  font-family: inherit;
  font-size: 0.938rem;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.badge {
  display: inline-block;
  background: rgba(59,130,246,0.1);
  color: #3B82F6;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}
```

---

## 🎯 Design System Variables

```css
:root {
  /* Colors */
  --primary: #3B82F6;
  --primary-hover: #2563EB;
  --bg-base: #F8FAFC;
  --bg-white: #FFFFFF;
  --border-color: #E2E8F0;
  --text-dark: #1E293B;
  --text-light: #64748B;

  /* Spacing */
  --space-xs: 12px;
  --space-sm: 20px;
  --space-md: 32px;

  /* Border Radius */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 10px;

  /* Shadows */
  --shadow: 0 4px 14px rgba(0,0,0,0.04);
  --shadow-hover: 0 8px 24px rgba(0,0,0,0.08);
}
```

---

## 📦 Component Library

### 1. Cards

```css
/* Basic Card */
.card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
}

/* Stat Card */
.stat-card {
  background: #FFFFFF;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
}

.stat-card .stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3B82F6;
}

.stat-card .stat-label {
  font-size: 0.875rem;
  color: #64748B;
  font-weight: 500;
}
```

### 2. Buttons

```css
/* Primary Button */
.btn {
  display: inline-block;
  background: #3B82F6;
  color: white;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: 0.2s ease;
}

.btn:hover {
  background: #2563EB;
  transform: translateY(-2px);
}

/* Secondary Button */
.btn-secondary {
  background: white;
  color: #1E293B;
  border: 1px solid #E2E8F0;
}

.btn-secondary:hover {
  background: #F8FAFC;
}

/* Outline Button */
.btn-outline {
  background: transparent;
  color: #3B82F6;
  border: 1px solid #3B82F6;
}

.btn-outline:hover {
  background: rgba(59,130,246,0.1);
}
```

### 3. Form Inputs

```css
input,
select,
textarea {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #CBD5E1;
  font-size: 0.938rem;
  transition: 0.2s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1E293B;
}
```

### 4. Badges

```css
/* Blue Badge */
.badge {
  display: inline-block;
  background: rgba(59,130,246,0.1);
  color: #1E40AF;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

/* Green Badge */
.badge-success {
  background: rgba(16,185,129,0.1);
  color: #065F46;
}

/* Red Badge */
.badge-danger {
  background: rgba(239,68,68,0.1);
  color: #991B1B;
}

/* Orange Badge */
.badge-warning {
  background: rgba(245,158,11,0.1);
  color: #92400E;
}
```

### 5. Tables

```css
.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
  border: 1px solid #E2E8F0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table thead {
  background: #F8FAFC;
}

table thead th {
  padding: 12px;
  text-align: left;
  font-size: 0.813rem;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
}

table tbody td {
  padding: 12px;
  border-top: 1px solid #F1F5F9;
  font-size: 0.938rem;
  color: #1E293B;
}

table tbody tr:hover {
  background: #F8FAFC;
}
```

---

## 🏗️ Layout System

### Header (White Sticky)

```css
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
}
```

### Sidebar (Clean White)

```css
.app-sidebar {
  width: 240px;
  background: #FFFFFF;
  border-right: 1px solid #E2E8F0;
  position: fixed;
  top: 60px;
  left: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 20px 0;
}

.sidebar-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #64748B;
  text-decoration: none;
  font-weight: 500;
  transition: 0.2s;
}

.sidebar-nav-link:hover {
  background: #F8FAFC;
  color: #1E293B;
}

.sidebar-nav-link.active {
  background: rgba(59,130,246,0.1);
  color: #3B82F6;
  border-left: 3px solid #3B82F6;
}
```

### Content Wrapper

```css
.content-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px;
}
```

---

## 📄 Page Templates

### Dashboard Page

```html
<div class="dashboard">
  <h1 class="title">Dashboard</h1>

  <!-- Stats Grid -->
  <div class="stats-grid">
    <div class="card stat-card">
      <h2>Total Events</h2>
      <p class="stat-value">18</p>
    </div>
    <div class="card stat-card">
      <h2>Registrations</h2>
      <p class="stat-value">432</p>
    </div>
    <div class="card stat-card">
      <h2>Today's Events</h2>
      <p class="stat-value">3</p>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="card">
    <h2>Recent Registrations</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Event</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Juan Dela Cruz</td>
            <td>Leadership Summit 2025</td>
            <td><span class="badge">Registered</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 20px;
}
```

### Event List Page

```html
<div class="event-list">
  <h1>Events</h1>

  <div class="card event-card">
    <div class="event-header">
      <h2>Leadership Summit 2025</h2>
      <span class="badge">Upcoming</span>
    </div>
    <p class="event-meta">Jan 30, 2025 • Manila</p>
    <p class="event-desc">A leadership workshop for professionals.</p>
    <button class="btn">View Details</button>
  </div>
</div>
```

```css
.event-card {
  position: relative;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.event-meta {
  color: #64748B;
  font-size: 0.875rem;
  margin-bottom: 12px;
}

.event-desc {
  color: #64748B;
  line-height: 1.6;
  margin-bottom: 16px;
}
```

### Registration Form

```html
<div class="card registration-form">
  <h1>Register for Event</h1>

  <form>
    <label>Full Name</label>
    <input type="text" placeholder="Enter full name" required>

    <label>Email Address</label>
    <input type="email" placeholder="you@example.com" required>

    <label>Phone Number</label>
    <input type="tel" placeholder="+63 900 000 0000">

    <button type="submit" class="btn">Submit Registration</button>
  </form>
</div>
```

### Login Page

```html
<div class="login-page">
  <div class="card login-box">
    <h1>Sign In</h1>

    <form>
      <label>Username</label>
      <input type="text" placeholder="Enter username" required>

      <label>Password</label>
      <input type="password" placeholder="Enter password" required>

      <button type="submit" class="btn">Login</button>
    </form>
  </div>
</div>
```

```css
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
}

.login-box {
  max-width: 400px;
  width: 100%;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 20px;
}
```

### QR Code Page

```html
<div class="card qr-box">
  <h1>Your QR Code</h1>
  <p class="subtitle">Show this QR code at the event entrance</p>

  <div class="qr-container">
    <img src="qr-code.png" class="qr-image" alt="QR Code">
  </div>

  <div class="qr-info">
    <p><strong>Event:</strong> Leadership Summit 2025</p>
    <p><strong>Name:</strong> Juan Dela Cruz</p>
    <p><strong>Code:</strong> ABC123</p>
  </div>

  <button class="btn">Download QR Code</button>
</div>
```

```css
.qr-box {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 32px;
  background: #F8FAFC;
  border-radius: 12px;
  margin: 20px 0;
}

.qr-image {
  max-width: 280px;
  width: 100%;
  border-radius: 8px;
}

.qr-info {
  text-align: left;
  background: #F8FAFC;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.qr-info p {
  margin: 8px 0;
  color: #64748B;
}

.qr-info strong {
  color: #1E293B;
}
```

---

## 🎨 Color Palette

```css
/* Primary Colors */
--blue-600: #3B82F6;      /* Primary */
--blue-700: #2563EB;      /* Primary Hover */

/* Neutrals */
--gray-50: #F8FAFC;       /* Background */
--gray-200: #E2E8F0;      /* Border */
--gray-400: #CBD5E1;      /* Input Border */
--gray-600: #64748B;      /* Text Light */
--gray-900: #1E293B;      /* Text Dark */

/* Semantic Colors */
--green: #10B981;         /* Success */
--red: #EF4444;           /* Danger */
--orange: #F59E0B;        /* Warning */
--purple: #8B5CF6;        /* Info */
```

---

## 📐 Spacing Scale

```css
--space-xs: 12px;
--space-sm: 20px;
--space-md: 32px;
--space-lg: 48px;
--space-xl: 64px;
```

---

## 🔤 Typography

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 0.938rem;   /* 15px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.5rem;       /* 24px */
--text-2xl: 2rem;        /* 32px */

/* Font Weights */
--fw-normal: 400;
--fw-medium: 500;
--fw-semibold: 600;
--fw-bold: 700;
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px;
  }

  .card {
    padding: 16px;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .content-wrapper {
    padding: 24px;
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .content-wrapper {
    max-width: 1100px;
  }
}
```

---

## ✨ Animation Guidelines

```css
/* Hover Lift */
.card:hover,
.btn:hover {
  transform: translateY(-2px);
  transition: 0.2s ease;
}

/* Focus Ring */
input:focus {
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  transition: 0.2s ease;
}

/* Loading Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## 🚀 Quick Start

1. **Import Inter Font:**
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
```

2. **Add Base Styles:**
Copy the base theme CSS into your stylesheet.

3. **Use Components:**
Apply the class names to your HTML elements.

4. **Customize:**
Modify CSS variables to match your brand colors.

---

## 📚 Additional Resources

- **Font:** [Inter on Google Fonts](https://fonts.google.com/specimen/Inter)
- **Icons:** [Font Awesome](https://fontawesome.com)
- **Color Palette:** Based on Tailwind CSS colors

---

## 🎯 Design Principles

1. **Clean & Sharp** - No unnecessary decorations
2. **Consistent Spacing** - Use spacing scale (12px, 20px, 32px)
3. **Soft Shadows** - Subtle depth (0 4px 14px rgba(0,0,0,0.04))
4. **Smooth Transitions** - 0.2s ease for all interactions
5. **Mobile First** - Design for mobile, enhance for desktop

---

**Built with ❤️ for modern web applications**
