document.addEventListener('DOMContentLoaded', () => {
    const navPanel = document.getElementById('nav-panel');
    const hamburgerBtn = document.getElementById('hamburger-button');
    const mainContentWrapper = document.getElementById('module-content-wrapper'); 
    
    const { publicUrl, clientUrl, devId, clientId, initialContext } = document.body.dataset;
    const { profile_title: baseTitle } = JSON.parse(initialContext || '{}');

    if (!hamburgerBtn || !navPanel || !mainContentWrapper) {
        console.error('Error crítico: Faltan elementos esenciales del DOM (nav-panel, hamburger-button, o module-content-wrapper).');
        return;
    }

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
        if (!clientId || !moduleId) {
            mainContentWrapper.innerHTML = `<div class='app-error'>Error: No se pudo determinar el cliente o el módulo.</div>`;
            return;
        }

        mainContentWrapper.innerHTML = `<h2>Cargando...</h2>`;
        document.body.classList.add('is-loading-module');

        try {
            const params = new URLSearchParams({
                client: clientId,
                id: moduleId,
                url: clientUrl
            });
            if (devId) {
                params.append('dev', devId);
            }
            const apiUrl = `${publicUrl}/api/getModule.php?${params.toString()}`;

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error en la respuesta de la API: ${response.statusText}`);
            }

            const moduleData = await response.json();

            updatePageContent(moduleData);

        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            mainContentWrapper.innerHTML = `<div class='app-error'>No se pudo cargar el módulo.<br><small>${error.message}</small></div>`;
        } finally {
            document.body.classList.remove('is-loading-module');
        }
    }

    function updatePageContent(moduleData) {
        if (moduleData.hasOwnProperty('sufijo') && baseTitle) {
            document.title = baseTitle + (moduleData.sufijo || '');
        }

        const moduleStylesheet = document.getElementById('module-stylesheet');
        if (moduleStylesheet && moduleData.hasOwnProperty('css_url')) {
            moduleStylesheet.href = moduleData.css_url || '';
        }
        
        const mainStylesheet = document.getElementById('main-stylesheet');
        if (mainStylesheet && moduleData.main_skin_override === true && moduleData.main_css_url) {
            mainStylesheet.href = moduleData.main_css_url;
        }

        mainContentWrapper.innerHTML = moduleData.html;

        const moduleType = moduleData.tipo;
        if (moduleType && window.adminModuleInitializers && typeof window.adminModuleInitializers[moduleType] === 'function') {
            console.log(`Ejecutando inicializador de admin para el módulo: ${moduleType}`);
            window.adminModuleInitializers[moduleType]();
        }
    }
});