let dom = {};

let config = {
    publicUrl: '',
    clientUrl: ''
};

function _createCategoryElement(categoryData) {
    const hiddenClass = categoryData.ocultar ? 'is-admin-hidden' : '';
    const itemsHtml = categoryData.items ? categoryData.items.map(item => 
        (item.es_cat ? _createCategoryElement(item) : _createItemElement(item))
    ).join('') : '';
    const imagePlaceholderClass = !categoryData.imagen ? 'is-placeholder' : '';
    const imageUrl = categoryData.imagen 
        ? (categoryData.imagen.startsWith('http') ? categoryData.imagen : `//${config.clientUrl}/imagenes/${categoryData.imagen}`)
        : '';
    return `
        <div class="admin-menu-category ${hiddenClass}" data-id="${categoryData.id}" data-type="category">
            <div class="item-header">
                <div class="item-drag-handle">⠿</div>
                
                <div class="item-image-container ${imagePlaceholderClass}" data-action="change-image">
                    <img src="${imageUrl}" alt="${categoryData.titulo || 'Imagen de categoría'}">
                    <div class="placeholder-text">Sin Imagen</div>
                </div>

                <div class="item-content">
                    <h3 contenteditable="true" data-property="titulo" data-placeholder="Título de categoría">${categoryData.titulo || ''}</h3>
                    <p contenteditable="true" data-property="descripcion" data-placeholder="Descripción de categoría">${categoryData.descripcion || ''}</p>
                </div>
                <div class="item-actions-panel">
                    <button class="action-button" data-action="toggle-options">⚙️</button>
                    <div class="options-popup">
                        <button data-action="toggle-hidden">👁️ Ocultar/Mostrar</button>
                        <button data-action="duplicate">📄 Duplicar</button>
                        <button data-action="add-item">➕ Añadir Ítem</button>
                        <button data-action="add-category">➕ Añadir Categoría</button>
                        <button data-action="delete" class="danger">🗑️ Eliminar</button>
                    </div>
                </div>
            </div>
            <div class="category-items-container">
                ${itemsHtml}
            </div>
        </div>
    `;
}

function _createItemElement(itemData) {
    const hiddenClass = itemData.ocultar ? 'is-admin-hidden' : '';
    const imagePlaceholderClass = !itemData.imagen ? 'is-placeholder' : '';
    const imageUrl = itemData.imagen 
        ? (itemData.imagen.startsWith('http') ? itemData.imagen : `//${config.clientUrl}/imagenes/${itemData.imagen}`)
        : '';
    return `
        <div class="admin-menu-item ${hiddenClass}" data-id="${itemData.id}" data-type="item">
            <div class="item-header">
                <div class="item-drag-handle">⠿</div>
                <div class="item-image-container ${imagePlaceholderClass}" data-action="change-image">
                    <img src="${imageUrl}" alt="${itemData.titulo || 'Imagen de item'}">
                    <div class="placeholder-text">Sin Imagen</div>
                </div>
                <div class="item-content">
                    <h4 contenteditable="true" data-property="titulo" data-placeholder="Nombre del plato">${itemData.titulo || ''}</h4>
                    <p contenteditable="true" data-property="descripcion" data-placeholder="Descripción del plato">${itemData.descripcion || ''}</p>
                </div>
                <div class="item-price" contenteditable="true" data-property="precio" data-placeholder="$0.00">${itemData.precio || ''}</div>
                <div class="item-actions-panel">
                    <button class="action-button" data-action="toggle-options">⚙️</button>
                    <div class="options-popup">
                        <button data-action="toggle-hidden">👁️ Ocultar/Mostrar</button>
                        <button data-action="duplicate">📄 Duplicar</button>
                        <button data-action="delete" class="danger">🗑️ Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function init(initialConfig) {
    config = initialConfig;
    dom.menuContainer = document.getElementById('item-list-container');
    dom.saveButton = document.getElementById('admin-save-fab');
    if (!dom.menuContainer || !dom.saveButton) {
        console.error("No se encontraron los contenedores principales del DOM.");
    }
}

function render(menuData) {
    if (!dom.menuContainer) return;
    
    const menuTitleEl = document.querySelector('[data-menu-property="titulo"]');
    const menuLogoImgEl = document.querySelector('#menu-logo-img');
    const menuLogoContainer = document.querySelector('#menu-logo');

    if (menuTitleEl) menuTitleEl.textContent = menuData.titulo;
    if (menuLogoImgEl) {
        if(menuData.logo) {
            menuLogoImgEl.src = menuData.logo.startsWith('http') ? menuData.logo : `${config.publicUrl}/assets/images/${menuData.logo}`;
            menuLogoContainer.classList.remove('is-placeholder');
        } else {
            menuLogoImgEl.src = '';
            menuLogoContainer.classList.add('is-placeholder');
        }
    }

    if (menuData.items && menuData.items.length > 0) {
        dom.menuContainer.innerHTML = menuData.items.map(_createItemElement).join('');
    } else {
        dom.menuContainer.innerHTML = '<p class="empty-menu-notice">El menú está vacío. Puedes empezar añadiendo un ítem o una categoría.</p>';
    }
}

function setSaveChangesVisible(show) {
    if (!dom.saveButton) return;
    dom.saveButton.classList.toggle('visible', show);
}

function updateItemProperty(id, property, value) {
    const element = dom.menuContainer.querySelector(`[data-id="${id}"] [data-property="${property}"]`);
    if(element) {
        element.textContent = value;
    }
}

function toggleItemVisibility(id) {
    const element = dom.menuContainer.querySelector(`[data-id="${id}"]`);
    if (element) {
        element.classList.toggle('is-admin-hidden');
    }
}

export const MenuView = {
    init,
    render,
    setSaveChangesVisible,
    updateItemProperty,
    toggleItemVisibility
};