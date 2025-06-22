
let dom = {};
let config = {
    publicUrl: '',
    clientUrl: ''
};


function _createCategoryElement(categoryData) {
    const hiddenClass = categoryData.ocultar ? 'is-admin-hidden' : '';
    const layoutClass = categoryData.layout ? categoryData.layout : '';
    const imagePlaceholderClass = !categoryData.imagen ? 'is-placeholder' : '';
    const imageUrl = categoryData.imagen 
        ? (categoryData.imagen.startsWith('http') ? categoryData.imagen : `//${config.clientUrl}/imagenes/${categoryData.imagen}.webp`)
        : '';
    const itemsHtml = categoryData.items ? categoryData.items.map(item => 
        (item.es_cat ? _createCategoryElement(item) : _createItemElement(item))
    ).join('') : '';

    return `
        <div class="admin-item-wrapper" data-id="${categoryData.id}" data-type="category">
            <div class="admin-controls">
                <div class="item-drag-handle">⠿</div>
                <div class="item-actions-panel">
                    <button class="action-button" data-action="toggle-options">⚙️</button>
                    <div class="options-popup">
                        <button data-action="toggle-hidden">👁️</button>
                        <button data-action="duplicate">📄</button>
                        <button data-action="add-item">➕ Ítem</button>
                        <button data-action="add-category">➕ Cat.</button>
                        <button data-action="delete" class="danger">🗑️</button>
                    </div>
                </div>
            </div>

            <div class="c-container ${layoutClass} ${hiddenClass}">
                <h3 class="c-titulo">
                    <div class="c-titulo-content">
                        <span contenteditable="true" data-property="titulo" data-placeholder="Título de categoría">${categoryData.titulo || ''}</span>
                        <small class="c-titulo-descripcion" contenteditable="true" data-property="descripcion" data-placeholder="Descripción">${categoryData.descripcion || ''}</small>
                    </div>
                    <div class="item-imagen-wrapper ${imagePlaceholderClass}" data-action="change-image">
                        <img src="${imageUrl}" alt="${categoryData.titulo || 'Imagen de categoría'}">
                        <div class="placeholder-text">Sin Imagen</div>
                    </div>
                </h3>
                <div class="item-list">
                    ${itemsHtml}
                </div>
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
        <div class="admin-item-wrapper" data-id="${itemData.id}" data-type="item">
            <div class="admin-controls">
                <div class="item-drag-handle">⠿</div>
                <div class="item-actions-panel">
                    <button class="action-button" data-action="toggle-options">⚙️</button>
                    <div class="options-popup">
                        <button data-action="toggle-hidden">👁️</button>
                        <button data-action="duplicate">📄</button>
                        <button data-action="delete" class="danger">🗑️</button>
                    </div>
                </div>
            </div>
            
            <div class="item ${hiddenClass}">
                <div class="item-imagen-wrapper ${imagePlaceholderClass}" data-action="change-image">
                    <img src="${imageUrl}" alt="${itemData.titulo || 'Imagen de item'}">
                    <div class="placeholder-text">Sin Imagen</div>
                </div>
                <div class="item-details">
                    <div class="item-info">
                        <h3 class="item-titulo" contenteditable="true" data-property="titulo" data-placeholder="Nombre del plato">${itemData.titulo || ''}</h3>
                        <p class="item-descripcion" contenteditable="true" data-property="descripcion" data-placeholder="Descripción del plato">${itemData.descripcion || ''}</p>
                    </div>
                    <div class="item-precio" contenteditable="true" data-property="precio" data-placeholder="$0.00">${itemData.precio || ''}</div>
                </div>
            </div>
        </div>
    `;
}

function init(initialConfig) {
    config = initialConfig;
    dom.menuContainer = document.getElementById('item-list-container');
    dom.saveButton = document.getElementById('fab-save-menu');

    if (!dom.menuContainer || !dom.saveButton) {
        console.error("No se encontraron los contenedores principales del DOM. Verifica los IDs 'item-list-container' y 'fab-save-menu'.");
        return;
    }
    dom.menuContainer.classList.add('admin-view');
}

function render(menuData) {
    if (!dom.menuContainer) return;
    const menuTitleEl = document.querySelector('[data-menu-property="titulo"]');
    if (menuTitleEl) menuTitleEl.textContent = menuData.titulo;
    // (Aquí iría la lógica para el logo/header del menú principal si es editable)

    if (menuData.items && menuData.items.length > 0) {
        dom.menuContainer.innerHTML = menuData.items.map(item =>
            (item.es_cat ? _createCategoryElement(item) : _createItemElement(item))
        ).join('');
    } else {
        dom.menuContainer.innerHTML = '<p class="empty-menu-notice">El menú está vacío. Puedes empezar añadiendo un ítem o categoría.</p>';
    }
}

function setSaveChangesVisible(show) {
    if (!dom.saveButton) return;
    dom.saveButton.classList.toggle('visible', show);
}

function toggleItemVisibility(id) {
    const wrapper = document.querySelector(`.admin-item-wrapper[data-id="${id}"]`);
    if (wrapper) {
        const contentElement = wrapper.querySelector('.item, .c-container');
        if (contentElement) {
            contentElement.classList.toggle('is-admin-hidden');
        }
    }
}

export const MenuView = {
    init,
    render,
    setSaveChangesVisible,
    toggleItemVisibility
};