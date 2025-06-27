const MenuView = (function() {
    let menuContainer = null;
    let itemListContainer = null;
    let config = {}; 

    function init(mainContainer) {
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
    

    function _createActionsPanel(itemData) {
        const visibilityText = itemData.ocultar ? 'Mostrar' : 'Ocultar';
        const visibilityIcon = itemData.ocultar ? _getIcon('visibility-off') : _getIcon('visibility-on');

        return `
            <div class="item-actions-panel">
                <button class="options-trigger" title="Más opciones">
                    ${_getIcon('options')}
                </button>
                <div class="options-popup">
                    <button data-action="toggle-visibility" title="${visibilityText} ítem">${visibilityIcon} ${visibilityText}</button>
                    <button data-action="duplicate" title="Duplicar ítem">
                        ${_getIcon('duplicate')} Duplicar
                    </button>
                    <button data-action="delete" class="danger" title="Eliminar ítem">
                        ${_getIcon('delete')} Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    function _createImageElement(item) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'item-imagen-wrapper';
        imageWrapper.addEventListener('click', () => {
            ImageManager.openModal(item.id); 
        });

        if (item.imagen && item.imagen.trim() !== '') {
            const img = document.createElement('img');
            const timestamp = new Date().getTime();
            img.src = `${config.clientUrl}/imagenes/${item.imagen}.webp?t=${timestamp}`;
            img.alt = item.titulo;
            img.onerror = function() {
                imageWrapper.innerHTML = '';
                imageWrapper.appendChild(_createImagePlaceholder());
            }.bind(this);
            imageWrapper.appendChild(img);
        } else {
            imageWrapper.appendChild(_createImagePlaceholder());
        }

        return imageWrapper;
    }

    function _createImagePlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'item-image-placeholder';
        placeholder.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Añadir imagen</span>
        `;
        return placeholder;
    }

    function _createPriceElement(itemData) {
        const formatConfig = { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 };
        const formattedPrice = itemData.precio ? new Intl.NumberFormat('es-AR', formatConfig).format(itemData.precio) : '0,00';
        
        return `
            <div class="item-precio">
                <span class="precio-final">$<span contenteditable="true" data-editable-property="precio">${formattedPrice}</span></span>
            </div>
        `;
    }


    function _createDragHandle() {
        return `
            <div class="item-drag-handle" title="Reordenar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg>
            </div>
        `;
    }

   // Reemplaza esta función en /public_html/app/assets/js/admin/menues/MenuView.js

function _createItemElement(itemData) {
    const itemElement = document.createElement('div');
    itemElement.className = `item is-admin-item ${itemData.ocultar ? 'is-admin-hidden' : ''}`;
    itemElement.dataset.id = itemData.id;
    itemElement.dataset.type = 'item';
    itemElement.setAttribute('draggable', 'true');

    // 1. Creamos el manejador de arrastre (drag handle)
    const dragHandle = _createDragHandle();
    itemElement.insertAdjacentHTML('beforeend', dragHandle);

    // 2. Creamos el elemento de la imagen y lo AÑADIMOS como un nodo
    const imageElement = _createImageElement(itemData);
    itemElement.appendChild(imageElement);

    // 3. Creamos el resto del HTML (detalles, precio, etc.)
    const otherDetailsHtml = `
        <div class="item-details">
            <div class="item-info">
                <h3 class="item-titulo" contenteditable="true" data-editable-property="titulo" data-placeholder="Título del ítem">${itemData.titulo || ''}</h3>
                <p class="item-descripcion" contenteditable="true" data-editable-property="descripcion" data-placeholder="Descripción (opcional)">${itemData.descripcion || ''}</p>
            </div>
            ${_createPriceElement(itemData)}
        </div>
        ${_createActionsPanel(itemData)}
    `;
    itemElement.insertAdjacentHTML('beforeend', otherDetailsHtml);

    return itemElement;
}

// Ahora, reemplaza también la función para crear categorías

function _createCategoryElement(itemData) {
    const categoryElement = document.createElement('div');
    const layoutClass = itemData.layout ? ` ${itemData.layout}` : '';
    categoryElement.className = `c-container is-admin-item${layoutClass} ${itemData.ocultar ? 'is-admin-hidden' : ''}`;
    categoryElement.dataset.id = itemData.id;
    categoryElement.dataset.type = 'category';
    categoryElement.setAttribute('draggable', 'true');
    if (itemData.titulo) {
         categoryElement.dataset.title = itemData.titulo.replace(/ /g, '_');
    }

    // --- Construcción del Header de la Categoría ---
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    
    // Añadimos el drag handle y el contenido del título
    const headerContent = `
        ${_createDragHandle()}
        <h3 class="c-titulo">
            <div class="c-titulo-content">
                <span contenteditable="true" data-editable-property="titulo" data-placeholder="Título de categoría">${itemData.titulo || ''}</span>
                <small class="c-titulo-descripcion" contenteditable="true" data-editable-property="descripcion" data-placeholder="Descripción (opcional)">${itemData.descripcion || ''}</small>
            </div>
        </h3>
        ${_createActionsPanel(itemData)}
    `;
    categoryHeader.innerHTML = headerContent;

    // Si la categoría tiene imagen, la creamos y la insertamos en el lugar correcto
    if (itemData.imagen) {
        const imageElement = _createImageElement(itemData);
        const titleElement = categoryHeader.querySelector('.c-titulo');
        titleElement.appendChild(imageElement);
    }
    
    categoryElement.appendChild(categoryHeader);
    
    // --- Construcción de la lista de sub-ítems (sin cambios aquí) ---
    const sublist = document.createElement('div');
    sublist.className = 'item-list';

    if (itemData.items) {
        itemData.items.forEach(subItemData => {
            const subElement = (subItemData.es_cat || subItemData.type === 'category') 
                ? _createCategoryElement(subItemData) 
                : _createItemElement(subItemData);
            if (subElement) sublist.appendChild(subElement);
        });
    }
    
    categoryElement.appendChild(sublist);
    
    return categoryElement;
}

    function render(menuData) {
        if (!itemListContainer || !menuContainer) {
            console.error("MenuView no inicializado correctamente. Falta el contenedor.");
            return;
        }
        const titleElement = menuContainer.querySelector('.menues-title');
        if (titleElement) {
            titleElement.textContent = menuData.titulo || 'Menú';
            titleElement.setAttribute('contenteditable', 'true');
            titleElement.dataset.editableMenuProperty = 'titulo';
        }
        itemListContainer.innerHTML = '';
        const items = menuData.items || [];
        items.forEach(itemData => {
            const isCategory = itemData.es_cat || itemData.type === 'category';
            const element = isCategory ? _createCategoryElement(itemData) : _createItemElement(itemData);
            if(element) itemListContainer.appendChild(element);
        });
    }

    return {
        init,
        render
    };
})();

export default MenuView;