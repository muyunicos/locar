const MenuView = (function() {
    let menuContainer = null;
    let itemListContainer = null;
    let config = {};
    let onImageClickCallback = null;

    function init(mainContainer, options = {}) {
        menuContainer = mainContainer;
        itemListContainer = menuContainer.querySelector('#item-list-container');
        config = window.appConfig || {};
    }

    function _getIcon(iconName) {
        const icons = {
            'visibility-on': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
            'visibility-off': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>',
            'options': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
            'duplicate': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
            'delete': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
        };
        return icons[iconName] || '';
    }

    function _createDragHandle() {
        return `<div class="item-drag-handle" title="Reordenar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></div>`;
    }

    function _createActionsPanel(itemData) {
        const panel = document.createElement('div');
        panel.className = 'item-actions-panel';

        const visibilityText = itemData.ocultar ? 'Mostrar' : 'Ocultar';
        const visibilityIcon = itemData.ocultar ? _getIcon('visibility-off') : _getIcon('visibility-on');

        let popupButtonsHTML = `
            <button data-action="toggle-visibility" title="${visibilityText} ítem">${visibilityIcon} ${visibilityText}</button>
            <button data-action="duplicate" title="Duplicar ítem">${_getIcon('duplicate')} Duplicar</button>
            <button data-action="delete" class="danger" title="Eliminar ítem">${_getIcon('delete')} Eliminar</button>
        `;

        // Si el elemento es una categoría, añadimos los botones de creación.
        if (itemData.es_cat) {
            popupButtonsHTML += `
                <div class="popup-divider"></div>
                <button data-action="create-item" data-parent-id="${itemData.id}">+ Añadir Ítem</button>
                <button data-action="create-category" data-parent-id="${itemData.id}">+ Añadir Categoría</button>
            `;
        }

        panel.innerHTML = `
            <button class="options-trigger" title="Más opciones">${_getIcon('options')}</button>
            <div class="options-popup">${popupButtonsHTML}</div>
        `;
        return panel;
    }

    function _createImageElement(item) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'item-imagen-wrapper';
       
        if (item.imagen && item.imagen.trim() !== '') {
            const img = document.createElement('img');
            img.src = `${config.clientUrl}/imagenes/${item.imagen}.webp`;
            img.alt = item.titulo || 'Imagen de ítem';
            img.onerror = function() {
                imageWrapper.innerHTML = '';
                imageWrapper.appendChild(_createImagePlaceholder());
            };
            imageWrapper.appendChild(img);
        } else {
            imageWrapper.appendChild(_createImagePlaceholder());
        }
        return imageWrapper;
    }
    
    function _createImagePlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'item-image-placeholder';
        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span>Añadir</span>`;
        return placeholder;
    }

    function _createPriceElement(itemData) {
    const formattedPrice = Math.round(itemData.precio || 0);
    return `
        <div class="item-precio">
            <span class="precio-final">
                $
                <span 
                    contenteditable="true" 
                    data-editable-property="precio" 
                    inputmode="numeric" 
                    pattern="[0-9]*"
                >
                    ${formattedPrice}
                </span>
            </span>
        </div>
    `;
}

    // --- FUNCIONES DE CONSTRUCCIÓN DE ESTRUCTURA ---
    
    function _createItemElement(itemData) {
        const itemElement = document.createElement('div');
        itemElement.className = `item is-admin-item ${itemData.ocultar ? 'is-admin-hidden' : ''}`;
        itemElement.dataset.id = itemData.id;
        itemElement.dataset.type = 'item';
        
        const contentWrapper = `
            ${_createDragHandle()}
            ${_createImageElement(itemData).outerHTML}
            <div class="item-details">
                <div class="item-info">
                    <h3 class="item-titulo" contenteditable="true" data-editable-property="titulo">${itemData.titulo || ''}</h3>
                    <p class="item-descripcion" contenteditable="true" data-editable-property="descripcion">${itemData.descripcion || ''}</p>
                </div>
                ${_createPriceElement(itemData)}
            </div>
            ${_createActionsPanel(itemData).outerHTML}
        `;
        itemElement.innerHTML = contentWrapper;
        return itemElement;
    }

    function _createCategoryElement(itemData) {
        const categoryElement = document.createElement('div');
        categoryElement.className = `c-container is-admin-item ${itemData.layout || ''} ${itemData.ocultar ? 'is-admin-hidden' : ''}`;
        categoryElement.dataset.id = itemData.id;
        categoryElement.dataset.type = 'category';

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        
        const h3 = document.createElement('h3');
        h3.className = 'c-titulo';
        const titleContent = `<div class="c-titulo-content"><span contenteditable="true" data-editable-property="titulo">${itemData.titulo || ''}</span><small contenteditable="true" data-editable-property="descripcion">${itemData.descripcion || ''}</small></div>`;
        h3.innerHTML = titleContent;
        if (itemData.imagen) h3.appendChild(_createImageElement(itemData));

        categoryHeader.innerHTML = _createDragHandle();
        categoryHeader.appendChild(h3);
        categoryHeader.appendChild(_createActionsPanel(itemData));

        const sublist = document.createElement('div');
        sublist.className = 'item-list';
        if (itemData.items && itemData.items.length > 0) {
            itemData.items.forEach(subItem => {
                const subElement = (subItem.es_cat) ? _createCategoryElement(subItem) : _createItemElement(subItem);
                sublist.appendChild(subElement);
            });
        }
        
        categoryElement.appendChild(categoryHeader);
        categoryElement.appendChild(sublist);

        return categoryElement;
    }

    function render(menuData) {
        if (!itemListContainer || !menuContainer) return;

        const titleElement = menuContainer.querySelector('.menues-title');
        if (titleElement) titleElement.textContent = menuData.titulo || 'Menú';

        itemListContainer.innerHTML = '';
        const items = menuData.items || [];
        items.forEach(itemData => {
            const element = (itemData.es_cat) ? _createCategoryElement(itemData) : _createItemElement(itemData);
            itemListContainer.appendChild(element);
        });
    }

    return { init, render };
})();

export default MenuView;