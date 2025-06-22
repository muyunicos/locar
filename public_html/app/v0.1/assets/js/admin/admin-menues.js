(() => {
    let menuActual = null;
    let hayCambiosSinGuardar = false;
    let estaGuardando = false;
    const dom = {};

    function init() {
        dom.menuContainer = document.getElementById('menu-container');
        dom.itemListContainer = document.getElementById('item-list-container');
        dom.saveFab = document.getElementById('admin-save-fab');

        if (!dom.menuContainer || !dom.itemListContainer || !dom.saveFab) {
            console.error("Admin Menues: Faltan elementos del DOM.");
            return;
        }

        if (!dom.menuContainer.dataset.initialJson) {
            return;
        }

        try {
            menuActual = JSON.parse(dom.menuContainer.dataset.initialJson);
        } catch (error) {
            console.error("Error fatal al cargar o parsear el JSON inicial:", error);
            dom.itemListContainer.innerHTML = `<p class='app-error'>Error: No se pudieron cargar los datos del menú.</p>`;
            return;
        }

        renderizarMenu();
        setupEventListeners();
        console.log("Admin script para 'menues' cargado y operando en modo 'estado centralizado'.");
    }

    function setupEventListeners() {
        dom.itemListContainer.addEventListener('click', handleDelegatedClick);
        dom.itemListContainer.addEventListener('blur', handleFieldEdit, true);
        dom.saveFab.querySelector('button').addEventListener('click', guardarCambios);
        window.addEventListener('beforeunload', (e) => {
            if (hayCambiosSinGuardar) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    function renderizarMenu() {
        if (!menuActual || !dom.itemListContainer) return;
        dom.itemListContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        if (menuActual.items && menuActual.items.length > 0) {
            menuActual.items.forEach(item => {
                fragment.appendChild(
                    item.es_cat ? crearElementoCategoria(item) : crearElementoItem(item)
                );
            });
        }
        dom.itemListContainer.appendChild(fragment);
    }

    function crearElementoCategoria(categoria) {
        const categoriaEl = document.createElement('div');
        const isHidden = categoria.ocultar;
        categoriaEl.className = `c-container ${categoria.layout || ''} ${isHidden ? 'is-admin-hidden' : ''}`;
        categoriaEl.dataset.id = categoria.id;

        let itemsHtml = '';
        if (categoria.items && categoria.items.length > 0) {
            itemsHtml = categoria.items.map(subItem =>
                (subItem.es_cat ? crearElementoCategoria(subItem) : crearElementoItem(subItem)).outerHTML
            ).join('');
        }

        const imagenHtml = categoria.imagen ? `<img src="${buildImageUrl(categoria.imagen)}" alt="${categoria.titulo}" />` : '';

        categoriaEl.innerHTML = `
            <h3 class="c-titulo">
                <div class="c-titulo-content">
                    <span contenteditable="true" data-property="titulo">${categoria.titulo}</span>
                    ${categoria.descripcion ? `<small class="c-titulo-descripcion" contenteditable="true" data-property="descripcion">${categoria.descripcion}</small>` : ''}
                </div>
                ${imagenHtml}
                <div class="admin-controls">
                    <button class="admin-btn" data-action="toggle-hidden" title="Ocultar/Mostrar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                    <button class="admin-btn" data-action="add-item" title="Añadir Ítem"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></button>
                    <button class="admin-btn" data-action="reorder" title="Reordenar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></button>
                    <button class="admin-btn admin-btn-delete" data-action="delete" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
                </div>
            </h3>
            <div class="item-list">${itemsHtml}</div>`;
        return categoriaEl;
    }

    function crearElementoItem(item) {
        const itemEl = document.createElement('div');
        const isHidden = item.ocultar;
        itemEl.className = `item ${isHidden ? 'is-admin-hidden' : ''}`;
        itemEl.dataset.id = item.id;

        const imagenHtml = item.imagen ? `
            <div class="item-imagen-wrapper">
                <img src="${buildImageUrl(item.imagen)}" alt="${item.titulo}" />
            </div>` : '';

        const precioOriginalHtml = item.original_price ? `
            <span class="precio-original">
                <span class="precio-simbolo">$</span>
                <span class="precio-valor">${new Intl.NumberFormat('es-AR').format(item.original_price)}</span>
                <span class="precio-decimales">,-</span>
            </span>` : '';

        itemEl.innerHTML = `
            ${imagenHtml}
            <div class="item-details">
                <div class="item-info">
                    <h3 class="item-titulo" contenteditable="true" data-property="titulo">${item.titulo}</h3>
                    <p class="item-descripcion" contenteditable="true" data-property="descripcion">${item.descripcion || ''}</p>
                </div>
                <div class="item-precio">
                    ${precioOriginalHtml}
                    <span class="precio-final">
                        <span class="precio-simbolo">$</span>
                        <span class="precio-valor" contenteditable="true" data-property="price">${new Intl.NumberFormat('es-AR').format(item.precio)}</span>
                        <span class="precio-decimales">,-</span>
                    </span>
                </div>
            </div>
            <div class="admin-controls">
                <button class="admin-btn" data-action="toggle-hidden" title="Ocultar/Mostrar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                <button class="admin-btn" data-action="duplicate" title="Duplicar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                <button class="admin-btn" data-action="reorder" title="Reordenar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></button>
                <button class="admin-btn admin-btn-delete" data-action="delete" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
            </div>`;
        return itemEl;
    }

    function handleDelegatedClick(e) {
        const button = e.target.closest('.admin-btn');
        if (!button) return;
        e.preventDefault();
        e.stopPropagation();
        const action = button.dataset.action;
        const container = button.closest('[data-id]');
        if (!action || !container) return;
        const id = container.dataset.id;
        switch (action) {
            case 'toggle-hidden':
                handleToggleHidden(id);
                break;
            case 'delete':
                if (confirm('¿Estás seguro?')) {
                    handleDelete(id);
                }
                break;
            case 'duplicate':
                handleDuplicate(id);
                break;
            case 'add-item':
                handleAddItem(id);
                break;
            case 'reorder':
                handleReorder(id);
                break;
        }
    }

    function handleFieldEdit(e) {
        const field = e.target;
        if (!field.isContentEditable) return;
        const container = field.closest('[data-id]');
        if (!container) return;
        const id = container.dataset.id;
        const property = field.dataset.property;
        let newValue = field.textContent.trim();
        const {
            item: itemData
        } = findItemEnMenu(id, true);
        if (property === 'price') {
            newValue = parseFloat(newValue.replace(/\./g, '').replace(',', '.')) || 0;
        }
        if (itemData && itemData[property] !== newValue) {
            itemData[property] = newValue;
            setEstadoCambios(true);
        }
    }

    function handleToggleHidden(id) {
        const {
            item
        } = findItemEnMenu(id, true);
        if (item) {
            const isHidden = item.ocultar;
            item.ocultar = !isHidden;
            setEstadoCambios(true);
            renderizarMenu();
        }
    }

    function handleDelete(id) {
        const {
            parent,
            index
        } = findItemEnMenu(id, true);
        if (parent && index > -1) {
            parent.items.splice(index, 1);
            setEstadoCambios(true);
            renderizarMenu();
        }
    }

    function handleDuplicate(id) {
        const {
            item: originalItem,
            parent: parentCategory,
            index: originalIndex
        } = findItemEnMenu(id, true);
        if (originalItem && parentCategory) {
            const newItem = JSON.parse(JSON.stringify(originalItem));
            newItem.id = generarIdUnico();
            newItem.title = `${newItem.title} (Copia)`;
            parentCategory.items.splice(originalIndex + 1, 0, newItem);
            setEstadoCambios(true);
            renderizarMenu();
        }
    }

    function handleAddItem(categoryId) {
        const {
            item: category
        } = findItemEnMenu(categoryId, true);
        if (category && category.es_cat) {
            if (!category.items) {
                category.items = [];
            }
            const newItem = {
                id: generarIdUnico(),
                title: 'Nuevo Ítem',
                description: 'Descripción',
                price: 0,
                es_cat: false
            };
            category.items.push(newItem);
            setEstadoCambios(true);
            renderizarMenu();
        }
    }

    function handleReorder(id) {
        alert(`FUNCIONALIDAD PENDIENTE: Reordenar el elemento con id ${id}.`);
    }

    async function guardarCambios() {
        if (estaGuardando) return;
        estaGuardando = true;
        setEstadoCambios(false, {
            isSaving: true
        });

        const dataSourceFile = dom.menuContainer.dataset.sourceFile;
        const publicUrl = document.body.dataset.publicUrl;
        const clientId = document.body.dataset.clientId;
        const clientUrl = document.body.dataset.clientUrl;
        const devId = document.body.dataset.devId;
        const apiUrl = `${publicUrl}/api/saveMenu.php`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    menuData: menuActual,
                    dataSource: dataSourceFile,
                    client: clientId,
                    url: clientUrl,
                    dev: devId
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Error del servidor.');
            }

            menuActual = result.data.savedData;
            setEstadoCambios(false, {
                success: true
            });
            renderizarMenu();
        } catch (error) {
            console.error('Error al guardar:', error);
            setEstadoCambios(true, {
                error: true,
                message: error.message
            });
        } finally {
            estaGuardando = false;
        }
    }

    function buildImageUrl(imageName) {
        if (!imageName) return '';
        const clientUrl = document.body.dataset.clientUrl || '';
        if (imageName.startsWith('http') || imageName.startsWith('/')) return imageName;
        if (imageName.indexOf('.') === -1) imageName += '.webp';
        return `${clientUrl.endsWith('/') ? clientUrl : clientUrl + '/'}imagenes/${imageName}`;
    }

    function findItemEnMenu(id, returnContext = false) {
        function search(items, parent) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.id == id) {
                    return returnContext ? {
                        item: item,
                        parent: parent,
                        index: i
                    } : item;
                }
                if (item.es_cat && Array.isArray(item.items)) {
                    const found = search(item.items, item);
                    if (found) return found;
                }
            }
            return null;
        }
        const result = search(menuActual.items, menuActual);
        return result || (returnContext ? {
            item: null,
            parent: null,
            index: -1
        } : null);
    }

    function generarIdUnico() {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    function setEstadoCambios(huboCambios, options = {}) {
        hayCambiosSinGuardar = huboCambios;
        const button = dom.saveFab.querySelector('button');
        if (!button) return;
        if (options.isSaving) {
            button.textContent = '⏳';
            button.disabled = true;
            dom.saveFab.classList.remove('is-hidden');
            return;
        }
        if (options.success) {
            button.textContent = '✅';
            button.disabled = true;
            setTimeout(() => {
                dom.saveFab.classList.add('is-hidden');
                button.textContent = '💾';
            }, 2000);
            return;
        }
        if (options.error) {
            button.textContent = '❌';
            button.disabled = false;
            alert(`No se pudieron guardar los cambios: ${options.message}`);
            setTimeout(() => {
                button.textContent = '💾';
            }, 3000);
            return;
        }
        if (hayCambiosSinGuardar) {
            button.textContent = '💾';
            button.disabled = false;
            dom.saveFab.classList.remove('is-hidden');
        } else {
            dom.saveFab.classList.add('is-hidden');
        }
    }

    window.adminModuleInitializers = window.adminModuleInitializers || {};
    window.adminModuleInitializers.menues = init;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();