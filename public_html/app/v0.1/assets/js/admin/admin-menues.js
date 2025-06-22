(() => {

    let menuActual = null; 
    let hayCambiosSinGuardar = false;
    let estaGuardando = false;
    const dom = {}; 

    function init() {
        dom.menuContainer = document.getElementById('menu-container');
        dom.saveFab = document.getElementById('admin-save-fab');
        
        if (!dom.menuContainer || !dom.saveFab) {
            console.error("Admin Menues: Elementos del DOM necesarios no encontrados.");
            return;
        }

        try {
            const initialJson = dom.menuContainer.dataset.initialJson;
            if (!initialJson) throw new Error("El atributo 'data-initial-json' no fue encontrado.");
            menuActual = JSON.parse(initialJson);
        } catch (error) {
            console.error("Error fatal al cargar o parsear el JSON inicial:", error);
            dom.menuContainer.innerHTML = `<p style="color: red;">Error: No se pudieron cargar los datos del menú.</p>`;
            return;
        }

        renderizarMenu();
        setupEventListeners();
        console.log("Admin script para 'menues' cargado y operando en modo 'estado centralizado'.");
    }

    function setupEventListeners() {
        dom.menuContainer.addEventListener('click', handleDelegatedClick);
        dom.menuContainer.addEventListener('blur', handleFieldEdit, true);
        dom.saveFab.querySelector('button').addEventListener('click', guardarCambios);
        window.addEventListener('beforeunload', (e) => {
            if (hayCambiosSinGuardar) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    function renderizarMenu() {
        if (!menuActual || !dom.menuContainer) return;
        
        const fragment = document.createDocumentFragment();
        if (menuActual.categories) {
            menuActual.categories.forEach(categoria => {
                fragment.appendChild(crearElementoCategoria(categoria));
            });
        }

        dom.menuContainer.innerHTML = '';
        const header = document.querySelector('.menues-title, .menu-header-image-container')?.cloneNode(true);
        const footer = document.querySelector('.menu-footer')?.cloneNode(true);

        if(header) dom.menuContainer.appendChild(header);
        const itemListWrapper = document.createElement('div');
        itemListWrapper.className = 'item-list-wrapper';
        itemListWrapper.appendChild(fragment);
        dom.menuContainer.appendChild(itemListWrapper);
        if(footer) dom.menuContainer.appendChild(footer);
    }

    function crearElementoCategoria(categoria) {
        const categoriaEl = document.createElement('div');
        categoriaEl.className = `menu-category ${categoria.hidden ? 'is-admin-hidden' : ''}`;
        categoriaEl.dataset.id = categoria.id;

        let itemsHtml = '';
        if (categoria.items && categoria.items.length > 0) {
            itemsHtml = categoria.items.map(crearHtmlItem).join('');
        }

        categoriaEl.innerHTML = `
            <div class="category-header">
                <h3 class="category-title" data-property="title" contenteditable="true">${categoria.title}</h3>
                <div class="admin-controls">
                    <button class="admin-btn" data-action="toggle-hidden" title="Ocultar/Mostrar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                    <button class="admin-btn" data-action="add-item" title="Añadir Ítem"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></button>
                    <button class="admin-btn" data-action="reorder" title="Reordenar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></button>
                    <button class="admin-btn" data-action="manage" title="Gestionar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2 3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg></button>
                    <button class="admin-btn admin-btn-delete" data-action="delete" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
                </div>
            </div>
            <div class="item-list">
                ${itemsHtml}
            </div>
        `;
        return categoriaEl;
    }

    function crearHtmlItem(item) {
        return `
            <div class="menu-item ${item.hidden ? 'is-admin-hidden' : ''}" data-id="${item.id}">
                <div class="item-details">
                    <h4 class="menu-item-title" data-property="title" contenteditable="true">${item.title}</h4>
                    <p class="menu-item-description" data-property="description" contenteditable="true">${item.description || ''}</p>
                </div>
                <div class="item-price-container">
                    <span class="menu-item-price" data-property="price" contenteditable="true">${item.price}</span>
                </div>
                <div class="admin-controls">
                    <button class="admin-btn" data-action="toggle-hidden" title="Ocultar/Mostrar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                    <button class="admin-btn" data-action="duplicate" title="Duplicar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                    <button class="admin-btn" data-action="reorder" title="Reordenar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></button>
                    <button class="admin-btn" data-action="manage" title="Gestionar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2 3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg></button>
                    <button class="admin-btn admin-btn-delete" data-action="delete" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
                </div>
            </div>
        `;
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
                if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
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
            case 'manage':
                handleManage(id);
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
        const newValue = field.textContent.trim();

        const itemData = findItemEnMenu(id);
        if (itemData && itemData[property] !== newValue) {
            itemData[property] = newValue;
            setEstadoCambios(true);
        }
    }


    function handleToggleHidden(id) {
        const itemData = findItemEnMenu(id);
        if (itemData) {
            itemData.hidden = !itemData.hidden;
            setEstadoCambios(true);
            renderizarMenu();
        }
    }
    
    function handleDelete(id) {
        let found = false;
        menuActual.categories.forEach((cat, catIndex) => {
            if (cat.id == id) {
                menuActual.categories.splice(catIndex, 1);
                found = true;
                return;
            }
            if (cat.items) {
                const itemIndex = cat.items.findIndex(item => item.id == id);
                if (itemIndex > -1) {
                    cat.items.splice(itemIndex, 1);
                    found = true;
                }
            }
        });
        
        if (found) {
            setEstadoCambios(true);
            renderizarMenu();
        }
    }
    
    function handleDuplicate(id) {
        const { item: originalItem, parent: parentCategory, index: originalIndex } = findItemEnMenu(id, true);

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
        const category = findItemEnMenu(categoryId);
        if (category && category.es_cat) {
            if (!category.items) {
                category.items = [];
            }
            const newItem = {
                id: generarIdUnico(),
                title: 'Nuevo Ítem',
                description: 'Descripción del nuevo ítem.',
                price: '0',
                hidden: false,
                es_cat: false
            };
            category.items.push(newItem);
            setEstadoCambios(true);
            renderizarMenu();
        } else {
            console.error("No se pudo añadir el ítem: no se encontró la categoría con id", categoryId);
        }
    }
    
    function handleReorder(id) {
        alert(`FUNCIONALIDAD PENDIENTE: Reordenar el elemento con id ${id}.`);
    }
    
    function handleManage(id) {
        alert(`FUNCIONALIDAD PENDIENTE: Gestionar el elemento con id ${id}.`);
    }


    async function guardarCambios() {
        if (estaGuardando) return;
        estaGuardando = true;
        setEstadoCambios(false, { isSaving: true });

        const dataSourceFile = dom.menuContainer.dataset.sourceFile;
        const publicUrl = document.body.dataset.publicUrl;
        const clientId = document.body.dataset.clientId;
        const apiUrl = `${publicUrl}/app/v0.1/api/saveMenu.php`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ menuData: menuActual, dataSource: dataSourceFile, client: clientId })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Error del servidor.');
            
            menuActual = result.savedData;
            setEstadoCambios(false, { success: true });
            renderizarMenu();

        } catch (error) {
            console.error('Error al guardar:', error);
            setEstadoCambios(true, { error: true, message: error.message });
        } finally {
            estaGuardando = false;
        }
    }


    function findItemEnMenu(id, returnContext = false) {
        for (const categoria of menuActual.categories) {
            if (categoria.id == id) {
                return returnContext ? { item: categoria, parent: menuActual, index: menuActual.categories.findIndex(c => c.id == id) } : categoria;
            }
            if (categoria.items) {
                const itemIndex = categoria.items.findIndex(item => item.id == id);
                if (itemIndex > -1) {
                    const item = categoria.items[itemIndex];
                    return returnContext ? { item: item, parent: categoria, index: itemIndex } : item;
                }
            }
        }
        return returnContext ? { item: null, parent: null, index: -1 } : null;
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
            setTimeout(() => { dom.saveFab.classList.add('is-hidden'); button.textContent = '💾'; }, 2000);
            return;
        }
        if (options.error) {
            button.textContent = '❌';
            button.disabled = false;
            alert(`No se pudieron guardar los cambios: ${options.message}`);
             setTimeout(() => { button.textContent = '💾'; }, 3000);
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();