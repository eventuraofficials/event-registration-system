/**
 * MOBILE MENU HANDLER
 * ===================
 * Hamburger menu for mobile sidebar navigation
 */

(function() {
    'use strict';

    // Wait for DOM to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

    function initMobileMenu() {
        const sidebar = document.querySelector('.sidebar');

        // Only initialize if sidebar exists (admin page)
        if (!sidebar) return;

        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-menu';
        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        hamburger.setAttribute('aria-label', 'Toggle navigation menu');
        hamburger.setAttribute('aria-expanded', 'false');

        // Create mobile overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';

        // Insert elements
        document.body.insertBefore(hamburger, document.body.firstChild);
        document.body.appendChild(overlay);

        // Toggle menu
        function toggleMenu() {
            const isActive = sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', isActive);

            // Update icon
            const icon = hamburger.querySelector('i');
            if (isActive) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }

            // Prevent body scroll when menu is open
            if (isActive) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }

        // Close menu
        function closeMenu() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.querySelector('i').className = 'fas fa-bars';
            document.body.style.overflow = '';
        }

        // Event listeners
        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', closeMenu);

        // Close menu when clicking a nav item (mobile)
        const navItems = sidebar.querySelectorAll('.sidebar-item, .nav-item, .sidebar a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 600) {
                    closeMenu();
                }
            });
        });

        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth > 600) {
                    closeMenu();
                    sidebar.classList.remove('active');
                }
            }, 250);
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                closeMenu();
            }
        });
    }
})();
