let dom = {};
let config = { publicUrl: '', clientUrl: '' };

function init(initialConfig) {
    config = initialConfig;
    dom.menuContainer = document.getElementById('item-list-container');
    dom.saveButtonFab = config.saveButtonFab;
    if (!dom.menuContainer || !dom.saveButtonFab) {
        console.error("FATAL: No se encontraron #item-list-container o admin-save-fab.");
        return;
    }
    dom.saveButtonFab.classList.add('is-hidden');
    dom.menuContainer.classList.add('admin-view');
}

function setSaveChangesVisible(isVisible) {
    if (dom.saveButtonFab) {
        if (isVisible) {
            dom.saveButtonFab.classList.remove('is-hidden');
        } else {
            dom.saveButtonFab.classList.add('is-hidden');
        }
    }
}

function formatPrice(price) {
    if (price === null || price === undefined || price === '') return '';
    let numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return '';
    return Math.round(numericPrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function _createCategoryElement(categoryData) {
    const hiddenClass = categoryData.ocultar ? 'is-admin-hidden' : '';
    const layoutClass = categoryData.layout ? categoryData.layout : '';
    const itemsHtml = categoryData.items ? categoryData.items.map(item =>
        (item.es_cat ? _createCategoryElement(item) : _createItemElement(item))
    ).join('') : '';

    const imagePlaceholderClass = !categoryData.imagen ? 'is-placeholder' : '';
    const imageUrl = categoryData.imagen 
        ? (categoryData.imagen.startsWith('http') ? categoryData.imagen : `${config.clientUrl}/imagenes/${categoryData.imagen}.webp`)
        : '';
    
    const imageHtml = `
        <div class="item-imagen-wrapper ${imagePlaceholderClass}" data-action="change-image">
            <img src="${imageUrl}" alt="${categoryData.titulo || 'Imagen de categoría'}">
            <div class="placeholder-text">Sin Imagen</div>
        </div>
    `;

    return `
        <div class="c-container ${layoutClass} ${hiddenClass}" data-id="${categoryData.id}" data-type="category" draggable="true">
            <h3 class="c-titulo">
                <div class="c-titulo-content">
                    <span contenteditable="true" data-property="titulo" data-placeholder="Título de categoría">${categoryData.titulo || ''}</span>
                    <small class="c-titulo-descripcion" contenteditable="true" data-property="descripcion" data-placeholder="Descripción">${categoryData.descripcion || ''}</small>
                </div>
                ${imageHtml}
            </h3>
            <div class="item-list">
                ${itemsHtml}
            </div>
            <div class="item-drag-handle" title="Arrastrar para reordenar">⠿</div>
        </div>
    `;
}

function _createItemElement(itemData) {
    const hiddenClass = itemData.ocultar ? 'is-admin-hidden' : '';
    const imagePlaceholderClass = !itemData.imagen ? 'is-placeholder' : '';
    const imageUrl = itemData.imagen ? (itemData.imagen.startsWith('http') ? itemData.imagen : `${config.clientUrl}/imagenes/${itemData.imagen}.webp`) : '';
    const formattedPrice = formatPrice(itemData.precio);
    const priceDisplayHtml = formattedPrice ? `<span class="precio-final"><span class="precio-simbolo">$</span><span class="precio-valor">${formattedPrice}</span><span class="precio-decimales">,-</span></span>` : '';

    return `
        <div class="item ${hiddenClass}" data-id="${itemData.id}" data-type="item" draggable="true">
            <div class="item-imagen-wrapper ${imagePlaceholderClass}" data-action="change-image">
                <img src="${imageUrl}" alt="${itemData.titulo || 'Imagen de item'}">
                <div class="placeholder-text">Sin Imagen</div>
            </div>
            <div class="item-details">
                <div class="item-info">
                    <h3 class="item-titulo" contenteditable="true" data-property="titulo" data-placeholder="Nombre del plato">${itemData.titulo || ''}</h3>
                    <p class="item-descripcion" contenteditable="true" data-property="descripcion" data-placeholder="Descripción del plato">${itemData.descripcion || ''}</p>
                </div>
                <div class="item-price" data-action="edit-price" title="Clic para editar precio" data-price="${itemData.precio || 0}">
                    ${priceDisplayHtml}
                </div>
            </div>
            <div class="item-drag-handle" title="Arrastrar para reordenar">⠿</div>
        </div>
    `;
}

function render(menuData) {
    if (!dom.menuContainer) return;
    if (menuData && menuData.items && menuData.items.length > 0) {
        dom.menuContainer.innerHTML = menuData.items.map(item =>
            (item.es_cat ? _createCategoryElement(item) : _createItemElement(item))
        ).join('');
    } else {
        dom.menuContainer.innerHTML = '<p class="empty-menu-notice">El menú está vacío.</p>';
    }
}

export const MenuView = { 
    init, 
    render,
    setSaveChangesVisible
};