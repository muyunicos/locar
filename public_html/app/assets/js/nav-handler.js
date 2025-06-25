document.addEventListener('DOMContentLoaded', () => {
    const navPanel = document.getElementById('nav-panel');
    const contentWrapper = document.getElementById('module-content-wrapper');
    const hamburgerBtn = document.getElementById('hamburger-button');
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!navPanel || !contentWrapper || !hamburgerBtn || !loadingOverlay) {
        console.error('Error crítico: Faltan uno o más elementos esenciales del DOM (nav-panel, module-content-wrapper, hamburger-button, o loading-overlay).');
        return;
    }

    const { clientId, clientUrl, version, publicUrl, isAdminUrl } = window.appConfig || {};

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

        if (link && !link.classList.contains('is-external')) {
            e.preventDefault();
            const moduleId = link.dataset.moduleId;
            if (moduleId) {
                navPanel.classList.remove('open');
                loadModule(moduleId);
            }
        } else if (link) {
            navPanel.classList.remove('open');
        }
    });

    async function loadModule(moduleId) {
        loadingOverlay.classList.add('active');
        try {
            

            if (!clientId || !publicUrl) {
                throw new Error('La configuración del cliente (clientId, publicUrl) no está disponible en window.appConfig.');
            }

            const params = new URLSearchParams({
                id: moduleId,
                client_id: clientId,
                is_admin_url: isAdminUrl,
                url: clientUrl
            });
            if (version) {
                params.append('version', version);
            }

            const apiEndpoint = `${publicUrl}/api/getModule.php?${params.toString()}`;

            const response = await fetch(apiEndpoint, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Error en la respuesta de la red: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                updatePageAssets(data.data);
            } else {
                throw new Error(data.message || 'La respuesta de la API no fue exitosa o no contenía datos.');
            }

        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            contentWrapper.innerHTML = `<div class="app-error"><p>Ocurrió un error al cargar el contenido.</p><p><small>${error.message}</small></p></div>`;
        } finally {
            setTimeout(() => {
                loadingOverlay.classList.remove('active');
            }, 300);
        }
    }


    function updatePageAssets(data) {
        contentWrapper.innerHTML = data.html || '';
        document.querySelectorAll('.module-stylesheet, .module-script').forEach(el => el.remove());
        (data.css || []).forEach(url => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.className = 'module-stylesheet';
            document.head.appendChild(link);
        });

        const mainStylesheet = document.querySelector('.main-stylesheet');
        if (mainStylesheet && data.main_css_url && mainStylesheet.href !== data.main_css_url) {
            mainStylesheet.href = data.main_css_url;
        }
        
        const scriptPromises = (data.js || []).map(scriptUrl => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.type = 'module';
                script.src = scriptUrl;
                script.className = 'module-script';
                script.onload = resolve;
                script.onerror = () => reject(new Error(`No se pudo cargar el script: ${scriptUrl}`)); 
                document.body.appendChild(script);
            });
        });

        

        Promise.all(scriptPromises)
            .then(() => {
                const newModuleElement = contentWrapper.querySelector('[data-module-id]');
                if (newModuleElement) {
                    const moduleType = newModuleElement.dataset.type || newModuleElement.dataset.moduleId;
                    if (window.adminModuleInitializers && typeof window.adminModuleInitializers[moduleType] === 'function') {
                        setTimeout(() => {
                            console.log(`Ejecutando inicializador para el módulo: ${moduleType}`);
                            window.adminModuleInitializers[moduleType](newModuleElement);
                        }, 0);
                    }
                }
            })
            .catch(error => {
                console.error("Error durante la carga de los scripts del módulo:", error);
                contentWrapper.innerHTML += `<div class="app-error"><p><small>Error al inicializar el módulo: ${error.message}</small></p></div>`;
            });
    }
});
