// Colour theme: "light", "dark" or "auto" (follow the OS). The choice is kept in localStorage and mirrored on <html>:
// data-bs-theme drives Bootstrap's colours, data-theme-pref lets CSS show the matching icon / checkmark in the header.
(() => {
    const storageKey = 'theme';
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const getPreference = () => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored === 'light' || stored === 'dark' ? stored : 'auto';
        } catch {
            return 'auto';
        }
    };

    const apply = preference => {
        const resolved = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference;
        document.documentElement.setAttribute('data-bs-theme', resolved);
        document.documentElement.setAttribute('data-theme-pref', preference);
    };

    apply(getPreference());

    media.addEventListener('change', () => apply(getPreference()));

    document.addEventListener('click', e => {
        const option = e.target instanceof Element ? e.target.closest('[data-theme-value]') : null;
        if (!option) {
            return;
        }

        const preference = option.getAttribute('data-theme-value');
        try {
            localStorage.setItem(storageKey, preference);
        } catch {
            // Storage unavailable (e.g. private mode); the theme still applies for this page view.
        }
        apply(preference);
    });
})();
