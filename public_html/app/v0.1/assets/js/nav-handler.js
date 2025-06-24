document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM. Se mantienen intactas.
    const navPanel = document.getElementById('nav-panel');
    const contentWrapper = document.getElementById('module-content-wrapper');
    const hamburger = document.getElementById('hamburger-button');

    if (!navPanel || !contentWrapper || !hamburger) {
        console.error('Error: Faltan elementos de navegación esenciales.');
        return;
    }

    // Lógica para el botón de hamburguesa. Se mantiene intacta.
    hamburger.addEventListener('click', () => {
        navPanel.classList.toggle('is-open');
    });

    // Lógica para los clics en los enlaces de navegación.
    navPanel.addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (navLink && !navLink.classList.contains('is-external')) {
            e.preventDefault();
            const moduleId = navLink.dataset.moduleId;
            if (moduleId) {
                loadModule(moduleId);
                // Funcionalidad restaurada: cerrar el panel después del clic.
                navPanel.classList.remove('is-open');
            }
        }
    });

    async function loadModule(moduleId) {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        try {
            const { clientId, clientUrl, devId, publicUrl } = window.appConfig;
            const params = new URLSearchParams({
                id: moduleId,
                client_id: clientId,
                url: clientUrl
            });
            if (devId) {
                params.append('dev_branch', devId);
            }
            
            // === INICIO DE LA CORRECCIÓN FINAL ===
            // Como nos confirmaste que publicUrl es la base de la API,
            // esta es la forma correcta y definitiva de construir la URL.
            const apiEndpoint = `${publicUrl}/getModule.php?${params.toString()}`;
            // === FIN DE LA CORRECCIÓN FINAL ===

            const response = await fetch(apiEndpoint, {
                credentials: 'include' // Correcto para enviar cookies de sesión.
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success && data.data) {
                updatePageAssets(data.data);
            } else {
                throw new Error(data.message || 'La respuesta de la API no fue exitosa.');
            }

        } catch (error) {
            console.error('Error en loadModule:', error);
            contentWrapper.innerHTML = `<div class="app-error"><p>Ocurrió un error al cargar el contenido.</p><p><i>${error.message}</i></p></div>`;
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    function updatePageAssets(data) {
        contentWrapper.innerHTML = data.html;

        document.querySelectorAll('.module-stylesheet, .module-script').forEach(el => el.remove());
        
        (data.css || []).forEach(url => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.className = 'module-stylesheet';
            document.head.appendChild(link);
        });

        (data.js || []).forEach(scriptUrl => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = scriptUrl;
            script.className = 'module-script';
            script.onload = () => {
                const newModuleElement = contentWrapper.querySelector('[data-module-id]');
                if (newModuleElement) {
                    const moduleType = newModuleElement.dataset.type || newModuleElement.dataset.moduleId;
                    if (window.adminModuleInitializers && window.adminModuleInitializers[moduleType]) {
                        // Correcto: se usa setTimeout para evitar condiciones de carrera.
                        setTimeout(() => {
                            window.adminModuleInitializers[moduleType](newModuleElement);
                        }, 0);
                    }
                }
            };
            document.body.appendChild(script);
        });

        // Correcto: lógica para actualizar el skin principal si el módulo lo solicita.
        const mainStylesheet = document.querySelector('.main-stylesheet');
        if (mainStylesheet && data.main_css_url && mainStylesheet.href !== data.main_css_url) {
            mainStylesheet.href = data.main_css_url;
        }
    }
});