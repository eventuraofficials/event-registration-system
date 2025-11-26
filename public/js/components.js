/**
 * COMPONENT SYSTEM
 * ================
 *
 * Lightweight component loader for plain HTML/CSS/JS
 * Makes UI modular, reusable, and 10x cleaner!
 *
 * Usage:
 *   Components.render('Header', { title: 'Dashboard' })
 *   Components.renderAll()
 */

const Components = {
    /**
     * Component registry
     */
    registry: {},

    /**
     * Register a component
     */
    register(name, component) {
        this.registry[name] = component;
    },

    /**
     * Render a component with props
     */
    render(name, props = {}) {
        const component = this.registry[name];
        if (!component) {
            console.error(`Component "${name}" not found`);
            return '';
        }
        return component(props);
    },

    /**
     * Auto-render all components in the page
     * Finds elements with data-component attribute
     */
    renderAll() {
        const elements = document.querySelectorAll('[data-component]');
        elements.forEach(el => {
            const componentName = el.getAttribute('data-component');
            const props = this.parseProps(el);
            const html = this.render(componentName, props);
            el.innerHTML = html;
        });
    },

    /**
     * Parse props from data attributes
     */
    parseProps(element) {
        const props = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && attr.name !== 'data-component') {
                const propName = attr.name.replace('data-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                props[propName] = attr.value;
            }
        });
        return props;
    },

    /**
     * Mount component to element
     */
    mount(selector, componentName, props = {}) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = this.render(componentName, props);
        }
    }
};

// Auto-render on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Components.renderAll());
} else {
    Components.renderAll();
}

// Export for use in other scripts
window.Components = Components;
