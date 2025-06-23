const MenuView = (function() {
    let menuContainer = null;
    let itemListContainer = null;
    let config = {}; 

    function init(mainContainer) {
        menuContainer = mainContainer;
        itemListContainer = menuContainer.querySelector('#item-list-container');
        config = window.locarConfig || {};
    }

    function _createImageElement(itemData) {
        if (!itemData.imagen) return '';
        const imageUrl = itemData.imagen.startsWith('http') 
            ? itemData.imagen 
            : `${config.clientUrl}/imagenes/${itemData.imagen}.webp`;

        return `
            <div class="item-imagen-wrapper">
                <img src="${imageUrl}" alt="${itemData.titulo || ''}" loading="lazy" />
            </div>
        `;
    }

    function _createPriceElement(itemData) {
        let originalPriceHtml = '';
        if (itemData.original_price) {
            originalPriceHtml = `<span class="precio-original">$${new Intl.NumberFormat('es-AR').format(itemData.original_price)}</span>`;
        }
        
        return `
            <div class="item-precio">
                ${originalPriceHtml}
                <span class="precio-final">$<span contenteditable="true" data-editable-property="precio">${itemData.precio ? new Intl.NumberFormat('es-AR').format(itemData.precio) : '0'}</span></span>
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

    function _createItemElement(itemData) {
        const itemElement = document.createElement('div');
        itemElement.className = `item ${itemData.ocultar ? 'is-admin-hidden' : ''}`;
        itemElement.dataset.id = itemData.id;
        itemElement.dataset.type = 'item';
        itemElement.setAttribute('draggable', 'true');

        itemElement.innerHTML = `
            ${_createImageElement(itemData)}
            <div class="item-details">
                <div class="item-info">
                    <h3 class="item-titulo" contenteditable="true" data-editable-property="titulo">${itemData.titulo || ''}</h3>
                    <p class="item-descripcion" contenteditable="true" data-editable-property="descripcion">${itemData.descripcion || ''}</p>
                </div>
                ${_createPriceElement(itemData)}
            </div>
            ${_createDragHandle()}
        `;
        return itemElement;
    }

    function _createCategoryElement(itemData) {
        const categoryElement = document.createElement('div');
        const layoutClass = itemData.layout ? ` ${itemData.layout}` : '';
        categoryElement.className = `c-container${layoutClass} ${itemData.ocultar ? 'is-admin-hidden' : ''}`;
        categoryElement.dataset.id = itemData.id;
        categoryElement.dataset.type = 'category';
        categoryElement.setAttribute('draggable', 'true');

        const headerHtml = `
            <h3 class="c-titulo">
                <div class="c-titulo-content">
                    <span contenteditable="true" data-editable-property="titulo">${itemData.titulo || ''}</span>
                    <small class="c-titulo-descripcion" contenteditable="true" data-editable-property="descripcion">${itemData.descripcion || ''}</small>
                </div>
                ${itemData.imagen ? _createImageElement(itemData) : ''}
            </h3>
        `;
        
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
        
        categoryElement.innerHTML = headerHtml;
        categoryElement.appendChild(sublist);
        
        const headerElement = categoryElement.querySelector('.c-titulo');
        headerElement.style.position = 'relative'; 
        headerElement.insertAdjacentHTML('beforeend', _createDragHandle());

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