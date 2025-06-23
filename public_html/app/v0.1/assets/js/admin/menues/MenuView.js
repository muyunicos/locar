const MenuView = (function() {
    let container = null;
    let menuContainer = null;
    let config = {};

    function init(mainContainer) {
        menuContainer = mainContainer;
        container = menuContainer.querySelector('#item-list-container');
        config = window.locarConfig || {};
    }

    function render(menuData) {
        if (!container || !menuContainer) return;

        const titleElement = menuContainer.querySelector('.menues-title');
        if (titleElement) {
            titleElement.textContent = menuData.titulo || '';
            titleElement.setAttribute('contenteditable', 'true');
            titleElement.dataset.editableMenuProperty = 'titulo';
        }
        
        container.innerHTML = '';
        const items = menuData.items || [];
        items.forEach(itemData => {
            const element = itemData.type === 'category' ? _createCategoryElement(itemData) : _createItemElement(itemData);
            if(element) container.appendChild(element);
        });
    }

    function _createItemElement(itemData) {
        const itemElement = document.createElement('div');
        itemElement.className = `item ${itemData.hidden ? 'is-hidden' : ''}`;
        itemElement.dataset.id = itemData.id;
        itemElement.dataset.type = 'item';
        itemElement.setAttribute('draggable', 'true');

        const imageUrl = itemData.imagen ? (itemData.imagen.startsWith('http') ? itemData.imagen : `${config.clientUrl}/imagenes/${itemData.imagen}.webp`) : '';
        const hasImage = !!imageUrl;

        itemElement.innerHTML = `
            <div class="item-content ${hasImage ? 'has-image' : ''}">
                ${hasImage ? `<img src="${imageUrl}" alt="${itemData.titulo || ''}" class="item-image">` : ''}
                <div class="item-text">
                    <div class="item-header">
                        <span class="item-title" contenteditable="true" data-editable-property="titulo">${itemData.titulo || ''}</span>
                        <span class="item-price" contenteditable="true" data-editable-property="precio">${itemData.precio || ''}</span>
                    </div>
                    <p class="item-description" contenteditable="true" data-editable-property="descripcion">${itemData.descripcion || ''}</p>
                </div>
            </div>
            <div class="item-drag-handle" title="Arrastrar para reordenar">
                <i class="fas fa-grip-vertical"></i>
            </div>
        `;
        return itemElement;
    }

    function _createCategoryElement(itemData) {
        const categoryElement = document.createElement('div');
        categoryElement.className = `c-container ${itemData.hidden ? 'is-hidden' : ''}`;
        categoryElement.dataset.id = itemData.id;
        categoryElement.dataset.type = 'category';
        categoryElement.setAttribute('draggable', 'true');
        
        const sublist = document.createElement('div');
        sublist.className = 'item-list';

        if (itemData.items) {
            itemData.items.forEach(subItemData => {
                const subElement = subItemData.type === 'category' ? _createCategoryElement(subItemData) : _createItemElement(subItemData);
                if(subElement) sublist.appendChild(subElement);
            });
        }
        
        const imageUrl = itemData.imagen ? (itemData.imagen.startsWith('http') ? itemData.imagen : `${config.clientUrl}/imagenes/${itemData.imagen}.webp`) : '';
        const hasImage = !!imageUrl;

        categoryElement.innerHTML = `
            <div class="category-header">
                <div class="item-content ${hasImage ? 'has-image' : ''}">
                    ${hasImage ? `<img src="${imageUrl}" alt="${itemData.titulo || ''}" class="item-image">` : ''}
                    <div class="item-text">
                        <span class="item-title" contenteditable="true" data-editable-property="titulo">${itemData.titulo || ''}</span>
                        <p class="item-description" contenteditable="true" data-editable-property="descripcion">${itemData.descripcion || ''}</p>
                    </div>
                </div>
                <div class="item-drag-handle" title="Arrastrar para reordenar">
                    <i class="fas fa-grip-vertical"></i>
                </div>
            </div>
        `;
        categoryElement.appendChild(sublist);

        return categoryElement;
    }

    return {
        init,
        render
    };
})();

export default MenuView;