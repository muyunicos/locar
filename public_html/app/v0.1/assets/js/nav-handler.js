document.addEventListener('DOMContentLoaded', () => {
    const navPanel = document.getElementById('nav-panel');
    const hamburgerBtn = document.getElementById('hamburger-button');
    const config = window.appConfig || {};
    const { profile_title: baseTitle } = config.initialContext || {};
    const loadingOverlay = document.getElementById('loading-overlay');

    const mainContentWrapper = document.getElementById('module-content-wrapper'); 
    if (!hamburgerBtn || !navPanel || !mainContentWrapper) {
        console.error('Error crítico: Faltan elementos esenciales del DOM (nav-panel, hamburger-button, o module-content-wrapper).');
        return;
    }

    window.addEventListener('load', () => {
        loadingOverlay.classList.remove('active');
    });

    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (navPanel.classList.contains('open') && !navPanel.contains(e.target)) {
            navPanel.classList.remove('open');
        }
    });

    navPanel.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            handleNavLinkClick(e, link);
        }
    });

    async function handleNavLinkClick(e, linkElement) {
        if (linkElement.classList.contains('is-external')) {
            navPanel.classList.remove('open');
            return;
        }
        e.preventDefault();
        navPanel.classList.remove('open');
        const moduleId = linkElement.dataset.moduleId;
        await loadModule(moduleId);
    }

    async function loadModule(moduleId) {
        if (!config.clientId || !moduleId) {
            mainContentWrapper.innerHTML = `<div class='app-error'>Error: No se pudo determinar el cliente o el módulo.</div>`;
            return;
        }
        
        loadingOverlay.classList.add('active');

        try {
            const params = new URLSearchParams({
                client_id: config.clientId,
                id: moduleId,
                url: config.clientUrl
            });
            if (config.devId) {
                params.append('dev_branch', config.devId);
            }
            const apiUrl = `${config.publicUrl}/api/getModule.php?${params.toString()}`;

            const response = await fetch(apiUrl);
            const responseData = await response.json();
            
            if (!response.ok || !responseData.success) {
                throw new Error(responseData.message || `Error en la respuesta de la API: ${response.statusText}`);
            }
            await updatePageAssets(responseData.data);

        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            mainContentWrapper.innerHTML = `<div class='app-error'>No se pudo cargar el módulo.<br><small>${error.message}</small></div>`;
        } finally {
            setTimeout(() => {
                loadingOverlay.classList.remove('active');
            }, 500);
            
        }
    }

    function updatePageAssets(data) {
        if (data.hasOwnProperty('sufijo') && baseTitle) {
            document.title = baseTitle + (data.sufijo || '');
        }
        mainContentWrapper.innerHTML = data.html;

        document.querySelectorAll('link.module-stylesheet').forEach(link => link.remove());
        // Añadir las nuevas
        if (data.css && Array.isArray(data.css)) {
            data.css.forEach(cssUrl => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.className = 'module-stylesheet';
                link.href = cssUrl;
                document.head.appendChild(link);
            });
        }
        
        if (data.main_css_url) {
            const mainStylesheet = document.querySelector('.main-stylesheet');
            if (mainStylesheet) {
                mainStylesheet.href = data.main_css_url;
            }
        }

        document.querySelectorAll('script[data-module-script]').forEach(script => script.remove());
        if (data.js && Array.isArray(data.js)) {
            data.js.forEach(jsUrl => {
                const script = document.createElement('script');
                script.type = 'module';
                script.src = jsUrl;
                script.dataset.moduleScript = 'true';
                document.body.appendChild(script);
            });
        }

        const newModuleElement = mainContentWrapper.querySelector('[data-module-id]');
        const moduleType = data.module_type;

        if (moduleType && newModuleElement && window.adminModuleInitializers && typeof window.adminModuleInitializers[moduleType] === 'function') {
            console.log(`Ejecutando inicializador de admin para el módulo: ${moduleType}`);
            setTimeout(() => {
                window.adminModuleInitializers[moduleType](newModuleElement);
            }, 100);

        }
    }
});