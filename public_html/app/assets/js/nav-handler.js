document.addEventListener('DOMContentLoaded', () => {
    let sectionObserver = null;
    const navPanel = document.getElementById('nav-panel');
    const contentWrapper = document.getElementById('module-content-wrapper');
    const hamburgerBtn = document.getElementById('hamburger-button');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (!navPanel || !contentWrapper || !hamburgerBtn || !loadingOverlay) {
        console.error('Error crítico: Faltan uno o más elementos esenciales del DOM.');
        return;
    }

    const {
        clientId,
        clientUrl,
        version,
        publicUrl,
        isAdminUrl,
        initialContext: {
            profile_title: pageTitle
        }
    } = window.appConfig || {};

    window.addEventListener('load', () => {
        loadingOverlay.classList.remove('active');
    });

    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navPanel.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        if (navPanel.classList.contains('open')) {
            navPanel.classList.remove('open');
        }
    });

    navPanel.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link) return;

        if (link.classList.contains('is-admin')) {
            e.preventDefault();
            const currentQuery = window.location.search;
            const currentHash = window.location.hash;
            const targetUrl = isAdminUrl ? `${clientUrl}${currentQuery}${currentHash}` : `${clientUrl}/admin${currentQuery}${currentHash}`;
            window.location.href = targetUrl;
        } else if (!link.classList.contains('is-external')) {
            e.preventDefault();
            const moduleId = link.dataset.moduleId;
            if (moduleId) {
                loadModule(moduleId);
            }
        }
        navPanel.classList.remove('open');
    });

    window.observeSections = function() {
        if (sectionObserver) {
            sectionObserver.disconnect();
        }

        const options = {
            root: null,
            rootMargin: '-40% 0px -60% 0px',
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const targetTitle = entry.target.dataset.title;
                    if (targetTitle) {
                        const newHash = '#' + encodeURIComponent(targetTitle);
                        const baseUrl = window.location.pathname + window.location.search;
                        history.replaceState(null, '', baseUrl + newHash);
                    }
                }
            });
        };

        sectionObserver = new IntersectionObserver(observerCallback, options);
        const sections = document.querySelectorAll('[data-title]');
        if (sections.length > 0) {
            sections.forEach(section => sectionObserver.observe(section));
        }
    }

    window.handleScrollToHash = function() {
        const hash = window.location.hash;
        if (!hash) return;
        try {
            const targetTitle = decodeURIComponent(hash.substring(1));
            const selector = `[data-title="${targetTitle}"]`;
            const targetElement = document.querySelector(selector);
            if (targetElement) {
                const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - 90;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'instant'
                });
            }
        } catch (e) {
            console.error(`Error al procesar el hash "${hash}".`, e);
        }
    }

    window.loadModule = async function loadModule(moduleId) {
        loadingOverlay.classList.add('active');
        try {
            if (!clientId || !publicUrl) {
                throw new Error('La configuración del cliente no está disponible.');
            }

            const params = new URLSearchParams({
                id: moduleId,
                client_id: clientId,
                is_admin_url: isAdminUrl,
                url: clientUrl,
                ...(version && { version })
            });

            const apiEndpoint = `${publicUrl}/api/getModule.php?${params.toString()}`;
            const response = await fetch(apiEndpoint, { credentials: 'include' });

            if (!response.ok) {
                throw new Error(`Error en la respuesta de la red: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                await updatePageAssets(data.data);

                if (data.data.hasOwnProperty('sufijo') && pageTitle) {
                    document.title = pageTitle + (data.data.sufijo || '');
                }

                const newUrl = `${window.location.pathname}?${moduleId}`;
                history.pushState({ moduleId }, '', newUrl);

                window.handleScrollToHash();
                window.observeSections();
            } else {
                throw new Error(data.message || 'La respuesta de la API no fue exitosa.');
            }

        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            contentWrapper.innerHTML = `<div class="app-error"><p>Ocurrió un error al cargar el contenido.</p><p><small>${error.message}</small></p></div>`;
        } finally {
            setTimeout(() => loadingOverlay.classList.remove('active'), 300);
        }
    }

    async function updatePageAssets(data) {
        contentWrapper.innerHTML = data.html || '';
        document.querySelectorAll('.module-stylesheet, .module-script').forEach(el => el.remove());

        const mainStylesheet = document.querySelector('.main-stylesheet');
        if (mainStylesheet && data.main_css_url && mainStylesheet.href !== data.main_css_url) {
            mainStylesheet.href = data.main_css_url;
        }

        const loadAsset = (url, type) => {
            return new Promise((resolve, reject) => {
                const element = document.createElement(type);
                if (type === 'link') {
                    element.rel = 'stylesheet';
                    element.href = url;
                    element.className = 'module-stylesheet';
                } else {
                    element.type = 'module';
                    element.src = url;
                    element.className = 'module-script';
                }
                element.onload = resolve;
                element.onerror = () => reject(new Error(`No se pudo cargar: ${url}`));
                document.head.appendChild(element);
            });
        };

        const cssPromises = (data.css || []).map(url => loadAsset(url, 'link'));
        const jsPromises = (data.js || []).map(url => loadAsset(url, 'script'));

        await Promise.all([...cssPromises, ...jsPromises]);

        const newModuleElement = contentWrapper.querySelector('div[id*="-container-"]');
if (newModuleElement) {
           let moduleType;
    const idParts = newModuleElement.id.split('-');
    if (idParts.length >= 3 && idParts[1] === 'container') {
        moduleType = idParts[0];
    } else {
        
        moduleType = newModuleElement.dataset.type || newModuleElement.dataset.moduleId;
        console.warn("Element ID does not fully match 'tipo-container-id' pattern. Falling back to data attributes.");
    }

    if (moduleType && window.adminModuleInitializers && typeof window.adminModuleInitializers[moduleType] === 'function') {
        window.adminModuleInitializers[moduleType](newModuleElement);
    }
}}

    window.handleScrollToHash();
    window.observeSections();
});