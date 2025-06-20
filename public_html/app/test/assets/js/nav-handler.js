    document.addEventListener('DOMContentLoaded', () => {
        const navPanel = document.getElementById('nav-panel');
        const hamburgerBtn = document.getElementById('hamburger-button');
        const appContainer = document.getElementById('module-content-wrapper');
        const clientId = document.body.dataset.clientId;
        const baseUrl = document.body.dataset.baseUrl;
        const prod = document.body.dataset.prod;
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

                const response = await fetch(`${baseUrl}${prod}api/getModule.php?client=${clientId}&id=${moduleId}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error en la respuesta de la API: ${response.statusText}`);
                }

                const data = await response.json();
                const moduleStylesheet = document.getElementById('module-stylesheet');
                if (moduleStylesheet && data.hasOwnProperty('css_url')) {
                    moduleStylesheet.href = data.css_url || '';
                }
                appContainer.innerHTML = data.html;
            } catch (error) {
                console.error('Error al cargar el módulo:', error);
                appContainer.innerHTML = `<div class='app-error'>No se pudo cargar el módulo.<br><small>${error.message}</small></div>`;
            }
        });
    });