// Inline sub-forms (e.g. "new category") live inside the transaction form. Pressing Enter in them should
// trigger their own Blazor handler, not submit the surrounding form, so block the browser's implicit submit.
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target instanceof Element && e.target.closest('[data-no-implicit-submit]')) {
        e.preventDefault();
    }
}, true);

// Keyboard shortcuts for the header's quick-add menu: N = new expense, I = new income.
// They are off while typing and while a form is on screen, so they can't throw away unsaved input.
const quickAddShortcuts = { n: 'transactions/new?type=expense', i: 'transactions/new?type=income' };

document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) {
        return;
    }

    const target = e.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]')) {
        return;
    }

    if (document.querySelector('main form')) {
        return;
    }

    // Autofill fires keydown events without a key.
    const url = typeof e.key === 'string' ? quickAddShortcuts[e.key.toLowerCase()] : undefined;
    if (url) {
        e.preventDefault();
        Blazor.navigateTo(url);
    }
});

// Collapse the mobile header menu once a page link in it has been followed.
document.addEventListener('click', e => {
    const link = e.target instanceof Element ? e.target.closest('.navbar-collapse .nav-link') : null;
    const menu = link?.closest('.navbar-collapse.show');
    if (menu) {
        bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
    }
});
