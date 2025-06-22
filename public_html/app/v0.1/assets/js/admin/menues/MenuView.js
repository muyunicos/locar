let dom = {};

let config = {
    publicUrl: '',
    clientUrl: ''
};

function init(initialConfig) {
    config = initialConfig;
    dom.menuContainer = document.getElementById('item-list-container');
    dom.saveButton = document.getElementById('admin-save-fab');
    if (!dom.menuContainer || !dom.saveButton) {
        console.error("No se encontraron los contenedores principales del DOM.");
    }
}

function buildImageUrl(imageName) {
    if (!imageName) {
        return '';
    }
    return `${config.clientUrl}/imagenes/${imageName}.webp`;
}


function _createCategoryElement(categoryData) {
    const hiddenClass = categoryData.ocultar ? 'is-admin-hidden' : '';
    // Recursivamente renderiza los ítems dentro de la categoría
    const itemsHtml = categoryData.items ? categoryData.items.map(item => 
        (item.es_cat ? _createCategoryElement(item) : _createItemElement(item))
    ).join('') : '';
    
    // La imagen de la categoría usa 'imagen' como propiedad en los datos JSON
    const hasImage = !!categoryData.imagen;
    const imageUrl = hasImage ? buildImageUrl(categoryData.imagen) : '';
    const imagePlaceholderClass = !hasImage ? 'is-placeholder' : '';

    return `
        <div class="admin-menu-category ${hiddenClass}" data-id="${categoryData.id}" data-type="category">
            <div class="item-header">
                <div class="item-drag-handle">⠿</div>
                
                <div class="item-image-container ${imagePlaceholderClass}" data-action="change-image">
                    ${hasImage ? `<img src="${imageUrl}" alt="${categoryData.titulo || 'Imagen de categoría'}">` : ''}
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
    const hasImage = !!itemData.imagen;
    const imageUrl = hasImage ? buildImageUrl(itemData.imagen) : '';
    const imagePlaceholderClass = !hasImage ? 'is-placeholder' : '';

    return `
        <div class="admin-menu-item ${hiddenClass}" data-id="${itemData.id}" data-type="item">
            <div class="item-header">
                <div class="item-drag-handle">⠿</div>
                <div class="item-image-container ${imagePlaceholderClass}" data-action="change-image">
                    ${hasImage ? `<img src="${imageUrl}" alt="${itemData.titulo || 'Imagen de item'}">` : ''}
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

function render(menuData) {
    if (!dom.menuContainer) return;
    
    // Actualizar el título principal del menú
    const menuTitleEl = document.querySelector('.menues-title');
    if (menuTitleEl) {
        menuTitleEl.textContent = menuData.titulo;
    }

    // Actualizar la imagen principal del menú
    const menuHeaderImageContainer = document.querySelector('.menu-header-image-container');
    if (menuHeaderImageContainer) {
        let menuImageEl = menuHeaderImageContainer.querySelector('img');
        const hasImage = !!menuData.imagen; // La propiedad es 'imagen' en el JSON de menú

        if (hasImage) {
            const imageUrl = buildImageUrl(menuData.imagen);
            if (!menuImageEl) { // Si no existe la imagen, crearla
                menuImageEl = document.createElement('img');
                menuHeaderImageContainer.innerHTML = ''; // Limpiar el contenido existente (ej. título)
                menuHeaderImageContainer.appendChild(menuImageEl);
            }
            menuImageEl.src = imageUrl;
            menuImageEl.alt = menuData.titulo || 'Imagen del menú';
            menuHeaderImageContainer.style.display = 'block'; // Asegurar que el contenedor sea visible
        } else {
            // Si no hay imagen, ocultar el contenedor de la imagen y mostrar el título
            if (menuImageEl) {
                menuImageEl.remove(); // Eliminar la imagen si existe
            }
            menuHeaderImageContainer.style.display = 'none'; // Ocultar el contenedor de la imagen
        }
    }


    if (menuData.items && menuData.items.length > 0) {
        // Mapea los ítems de nivel superior, que pueden ser categorías o ítems
        dom.menuContainer.innerHTML = menuData.items.map(item => {
            return item.es_cat ? _createCategoryElement(item) : _createItemElement(item);
        }).join('');
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