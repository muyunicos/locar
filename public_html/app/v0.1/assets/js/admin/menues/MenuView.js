/**
 * MenuView.js
 * * Se encarga de renderizar el menú en el DOM y de manejar las interacciones visuales
 * que no implican una modificación directa del estado, como la creación de elementos.
 * La modificación del estado se delega a través de eventos que admin-menues.js escucha.
 */
const MenuView = {
    // Contenedor principal donde se renderizará el menú.
    container: null,
    // Callback para notificar cuando la vista ha sido renderizada.
    onRender: null,

    /**
     * Inicializa la vista, obteniendo la referencia al contenedor del menú.
     * @param {string} containerId - El ID del elemento contenedor del menú.
     * @param {function} onRenderCallback - Callback a ejecutar después de renderizar.
     */
    init(containerId, onRenderCallback) {
        this.container = document.getElementById(containerId);
        this.onRender = onRenderCallback;
        if (!this.container) {
            console.error(`Error: Contenededor con id "${containerId}" no encontrado.`);
        }
    },

    /**
     * Renderiza el menú completo a partir de los datos proporcionados.
     * Limpia el contenedor y construye la lista de ítems y categorías.
     * @param {object} menuData - El objeto completo del menú con su configuración e ítems.
     */
    render(menuData) {
        if (!this.container) return;

        // Limpiamos la vista anterior antes de volver a renderizar.
        this.container.innerHTML = '';

        // Creamos un fragmento de documento para mejorar el rendimiento.
        const fragment = document.createDocumentFragment();

        // Iteramos sobre los ítems de nivel superior y los renderizamos.
        menuData.items.forEach(item => {
            const element = item.es_cat
                ? this._createCategoryElement(item, menuData.config)
                : this._createItemElement(item, menuData.config);
            fragment.appendChild(element);
        });

        this.container.appendChild(fragment);

        // Notificamos que el renderizado ha finalizado.
        if (this.onRender) {
            this.onRender();
        }
    },

    /**
     * Crea el elemento DOM para una categoría.
     * @param {object} category - El objeto de la categoría.
     * @param {object} config - La configuración del menú.
     * @returns {HTMLElement} El elemento de la categoría.
     * @private
     */
    _createCategoryElement(category, config) {
        const categoryElement = document.createElement('div');
        categoryElement.className = `item-list-category layout-${config.layout || 'default'}`;
        categoryElement.dataset.id = category.id;
        if (category.ocultar) {
            categoryElement.classList.add('item-hidden');
        }

        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = category.titulo;
        categoryTitle.contentEditable = true;
        categoryTitle.dataset.editableProperty = 'titulo';
        
        // Contenedor para alinear título y controles
        const titleContainer = document.createElement('div');
        titleContainer.className = 'category-title-container';
        
        titleContainer.appendChild(this._createDragHandle());
        titleContainer.appendChild(categoryTitle);
        titleContainer.appendChild(this._createAdminControls(category.id));

        categoryElement.appendChild(titleContainer);

        // Contenedor para los ítems dentro de la categoría
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'item-list';
        itemsContainer.dataset.parentId = category.id; // Para el drag and drop

        if (category.items && category.items.length > 0) {
            category.items.forEach(item => {
                const itemElement = item.es_cat
                    ? this._createCategoryElement(item, config) // Soporte para categorías anidadas
                    : this._createItemElement(item, config);
                itemsContainer.appendChild(itemElement);
            });
        }
        
        categoryElement.appendChild(itemsContainer);

        return categoryElement;
    },

    /**
     * Crea el elemento DOM para un ítem individual del menú.
     * @param {object} item - El objeto del ítem.
     * @param {object} config - La configuración del menú.
     * @returns {HTMLElement} El elemento del ítem.
     * @private
     */
    _createItemElement(item, config) {
        const itemElement = document.createElement('div');
        itemElement.className = `item layout-${config.layout || 'default'}`;
        itemElement.dataset.id = item.id;

        if (item.ocultar) {
            itemElement.classList.add('item-hidden');
        }

        // Estructura interna del ítem, replicando menues.html
        let innerHTML = '';

        if (item.imagen_url) {
            innerHTML += `<div class="item-image"><img src="${item.imagen_url}" alt="${item.titulo}"></div>`;
        }

        innerHTML += `
            <div class="item-details">
                <div class="item-info">
                    <h3 class="item-title" contenteditable="true" data-editable-property="titulo">${item.titulo}</h3>
                    <p class="item-description" contenteditable="true" data-editable-property="descripcion">${item.descripcion || ''}</p>
                </div>
                <div class="item-precio">
                    <span contenteditable="true" data-editable-property="precio">${item.precio}</span>
                </div>
            </div>`;
        
        itemElement.innerHTML = innerHTML;

        // Añadimos los controles administrativos al principio del elemento
        const adminControlsContainer = document.createElement('div');
        adminControlsContainer.className = 'admin-controls-container';
        adminControlsContainer.appendChild(this._createDragHandle());
        adminControlsContainer.appendChild(this._createAdminControls(item.id));
        
        // Insertamos el contenedor de controles y el contenido del ítem
        const detailsContainer = itemElement.querySelector('.item-details');
        detailsContainer.prepend(adminControlsContainer);

        return itemElement;
    },

    /**
     * Crea el 'handle' (icono para arrastrar) para el drag and drop.
     * @returns {HTMLElement} El elemento del handle.
     * @private
     */
    _createDragHandle() {
        const handle = document.createElement('div');
        handle.className = 'drag-handle';
        handle.innerHTML = '&#9776;'; // Icono de hamburguesa
        handle.title = 'Arrastrar para reordenar';
        return handle;
    },
    
    /**
     * Crea los botones de control para un ítem (duplicar, ocultar, borrar).
     * @param {string} itemId - El ID del ítem.
     * @returns {HTMLElement} El contenedor de los botones de control.
     * @private
     */
    _createAdminControls(itemId) {
        const controls = document.createElement('div');
        controls.className = 'item-controls';

        controls.innerHTML = `
            <button class="control-btn duplicate-item" data-id="${itemId}" title="Duplicar">&#128420;</button>
            <button class="control-btn toggle-visibility" data-id="${itemId}" title="Ocultar/Mostrar">&#128065;</button>
            <button class="control-btn delete-item" data-id="${itemId}" title="Eliminar">&#128465;</button>
        `;
        return controls;
    }
};

export default MenuView;