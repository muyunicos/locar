document.addEventListener('DOMContentLoaded', () => {
    const navPanel = document.getElementById('nav-panel');
    const hamburgerBtn = document.getElementById('hamburger-button');
    const appContainer = document.getElementById('module-content-wrapper');
    const dataset = document.body.dataset;
    const publicUrl = dataset.publicUrl;
    const clientUrl = dataset.clientUrl;
    const devId = dataset.devId;
    const clientId = dataset.clientId;
    const initialContext = JSON.parse(dataset.initialContext || '{}');
    const baseTitle = initialContext.profile_title || 'Revel';

    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (navPanel.classList.contains('open') && !navPanel.contains(e.target)) {
            navPanel.classList.remove('open');
        }
    });

    navPanel.addEventListener('click', async (e) => {
        const link = e.target.closest('.nav-link');
        if (!link) return;

        if (link.classList.contains('is-external')) {
            navPanel.classList.remove('open');
            return;
        }

        e.preventDefault();
        navPanel.classList.remove('open');
        const moduleId = link.dataset.moduleId;
        
        if (!clientId || !moduleId) {
            appContainer.innerHTML = `<div class='app-error'>Error: No se pudo determinar el cliente o el módulo.</div>`;
            return;
        }

        appContainer.innerHTML = `<h2>Cargando...</h2>`;
        
        try {
            let apiUrl = `${publicUrl}/api/getModule.php?client=${clientId}&id=${moduleId}&url=${clientUrl}`;
            if (devId) {
                apiUrl += `&dev=${devId}`;
            }

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error en la respuesta de la API: ${response.statusText}`);
            }

            const data = await response.json();

            const moduleStylesheet = document.getElementById('module-stylesheet');
            if (data.hasOwnProperty('sufijo') && baseTitle) {
                document.title = baseTitle + (data.sufijo || '');
            }
            if (moduleStylesheet && data.hasOwnProperty('css_url')) {
                moduleStylesheet.href = data.css_url || '';
            }
            const mainStylesheet = document.getElementById('main-stylesheet');
            if (mainStylesheet && data.main_skin_override === true && data.main_css_url) {
                mainStylesheet.href = data.main_css_url;
            }

            appContainer.innerHTML = data.html;

            if (data.module_type && window.adminModuleInitializers && typeof window.adminModuleInitializers[data.module_type] === 'function') {
                console.log(`Re-initializing admin script for module type: ${data.module_type}`);
                window.adminModuleInitializers[data.module_type]();
            }

        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            appContainer.innerHTML = `<div class='app-error'>No se pudo cargar el módulo.<br><small>${error.message}</small></div>`;
        }
    });
});