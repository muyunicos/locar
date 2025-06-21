(() => {
    const state = {
        hasChanges: false,
        isSaving: false,
    };

    const dom = {
        moduleWrapper: document.getElementById('module-content-wrapper'),
        saveButton: document.querySelector('#admin-save-fab button'),
        saveButtonContainer: document.getElementById('admin-save-fab'),
    };

    if (!dom.moduleWrapper || !dom.saveButton) {
        console.error("Elementos de administración no encontrados. Abortando.");
        return;
    }

    function init() {
        console.log("Admin script for 'menues' loaded and initialized.");
        setupEventListeners();
    }

    function setupEventListeners() {
        dom.moduleWrapper.addEventListener('click', handleDelegatedClick);
        dom.saveButton.addEventListener('click', handleSaveChanges);
    }

    function handleDelegatedClick(e) {
        const button = e.target.closest('.admin-btn');
        if (button) {
            e.preventDefault();
            e.stopPropagation();
            handleAdminButton(button);
            return;
        }

        const editableField = e.target.closest('.is-admin-editable');
        if (editableField) {
            handleMakeEditable(editableField);
        }
    }

    function handleAdminButton(button) {
        const targetItem = button.closest('.item, .c-container');
        if (!targetItem) return;

        const action = button.getAttribute('title');

        if (action === 'Ocultar/Mostrar') {
            targetItem.classList.toggle('is-admin-hidden');
            trackChange();
        }

        if (action === 'Eliminar') {
            if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
                targetItem.classList.add('is-admin-deleted');
                trackChange();
            }
        }
        
        if (action === 'Añadir Ítem') {
            alert('Funcionalidad para AÑADIR no implementada aún.');
        }
    }

    function handleMakeEditable(field) {
        if (field.isContentEditable) return;
        const originalContent = field.textContent.trim();
        
        field.setAttribute('contenteditable', 'true');
        field.classList.add('is-editing');
        field.focus();

        const onFinishEditing = () => {
            field.removeEventListener('blur', onFinishEditing);
            field.removeEventListener('keydown', onKeyDown);
            field.setAttribute('contenteditable', 'false');
            field.classList.remove('is-editing');
            if (field.textContent.trim() !== originalContent) {
                trackChange();
            }
        };

        const onKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                field.blur();
            }
            if (e.key === 'Escape') {
                field.textContent = originalContent;
                field.blur();
            }
        };

        field.addEventListener('blur', onFinishEditing);
        field.addEventListener('keydown', onKeyDown);
    }

    function trackChange() {
        if (!state.hasChanges) {
            console.log("Primer cambio detectado. Mostrando botón de guardar.");
            state.hasChanges = true;
            dom.saveButtonContainer.classList.remove('is-hidden');
        }
    }

    function handleSaveChanges() {
        if (state.isSaving) return;

        console.log("Guardando cambios...");
        state.isSaving = true;
        dom.saveButton.disabled = true;
        dom.saveButton.textContent = '⏳';

        const menuData = serializeMenu();
        console.log("Datos serializados para enviar al servidor:", menuData);

        setTimeout(() => {
            alert('¡Datos listos para ser enviados! Revisa la consola para ver el objeto JSON.');
            console.log("Guardado (simulado) completado.");
            state.isSaving = false;
            state.hasChanges = false;
            dom.saveButton.disabled = false;
            dom.saveButton.textContent = '💾';
            dom.saveButtonContainer.classList.add('is-hidden');
        }, 1500);
    }

    function serializeMenu() {
        const rootItems = dom.moduleWrapper.querySelector('.item-list').children;
        return Array.from(rootItems).map(node => serializeNode(node)).filter(Boolean);
    }

    function serializeNode(node) {
        if (node.classList.contains('is-admin-deleted')) {
            return null;
        }

        const originalData = JSON.parse(node.dataset.itemJson);

        const titleEl = node.querySelector('.item-titulo');
        if (titleEl) originalData.titulo = titleEl.textContent.trim();

        const descEl = node.querySelector('.item-descripcion');
        if (descEl) originalData.descripcion = descEl.textContent.trim();

        const priceEl = node.querySelector('.precio-valor');
        if (priceEl) {
            originalData.precio = parseInt(priceEl.textContent.trim().replace(/\./g, ''), 10);
        }

        if (node.classList.contains('is-admin-hidden')) {
            originalData.hidden = true;
        } else {
            delete originalData.hidden;
        }

        if (originalData.es_cat) {
            const sublist = node.querySelector('.item-list');
            if (sublist) {
                originalData.items = Array.from(sublist.children)
                    .map(subNode => serializeNode(subNode))
                    .filter(Boolean);
            }
        }
        
        return originalData;
    }

    init();
})();