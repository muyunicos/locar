document.addEventListener('DOMContentLoaded', () => {
    const navPanel = document.getElementById('nav-panel');
    const contentWrapper = document.getElementById('module-content-wrapper');
    const hamburgerButton = document.getElementById('hamburger-button');
    const dataset = document.body.dataset;
    const publicUrl = dataset.publicUrl;
    const devId = dataset.devId;
    const clientId = dataset.clientId;

    if (!navPanel || !contentWrapper || !hamburgerButton) {
        console.error('Elementos de navegación principales no encontrados.');
        return;
    }

    hamburgerButton.addEventListener('click', () => {
        navPanel.classList.toggle('open');
    });

    navPanel.addEventListener('click', handleNavLinkClick);

    const initialModuleId = contentWrapper.querySelector('[data-module-id]')?.dataset.moduleId;
    if (initialModuleId) {
        updateActiveLink(initialModuleId);
    }
    
    function handleNavLinkClick(e) {
        const link = e.target.closest('.nav-link');
        if (!link || link.classList.contains('is-external')) return;
        
        e.preventDefault();
        const moduleId = link.dataset.moduleId;
        
        if (moduleId) {
            loadModule(moduleId);
            navPanel.classList.remove('open');
        }
    }

    function updateActiveLink(moduleId) {
        navPanel.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.moduleId === moduleId) {
                link.classList.add('active');
            }
        });
    }

    async function loadModule(moduleId) {
        contentWrapper.classList.add('loading');

        try {
            const response = await fetch(`${publicUrl}/api/getModule.php?id=${moduleId}&client=${clientId}&dev=${devId}`);
            
            if (!response.ok) {
                throw new Error(`Error de red: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.html);
            } else {
                contentWrapper.innerHTML = result.html;
                
                const moduleStylesheet = document.getElementById('module-stylesheet');
                if (moduleStylesheet) {
                    moduleStylesheet.href = result.css_url || '';
                }
                
                const moduleType = result.module_type;
                const newModuleElement = contentWrapper.querySelector('.module-container');
                
                if (moduleType && newModuleElement && window.adminModuleInitializers && window.adminModuleInitializers[moduleType]) {
                    window.adminModuleInitializers[moduleType](newModuleElement);
                }
                
                updateActiveLink(moduleId);
            }
        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            contentWrapper.innerHTML = `<p class="app-error">Error al cargar el módulo. Por favor, intente de nuevo.</p>`;
        } finally {
            contentWrapper.classList.remove('loading');
        }
    }
});