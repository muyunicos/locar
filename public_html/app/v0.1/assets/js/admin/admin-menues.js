(() => {
    const state = {
        hasChanges: false,
        isSaving: false,
    };

    const dom = {};

    function init() {
        dom.moduleContainer = document.querySelector('.module-container.module-menues');
        dom.saveButton = document.querySelector('#admin-save-fab button');
        dom.saveButtonContainer = document.getElementById('admin-save-fab');

        if (!dom.moduleContainer || !dom.saveButton) {
            console.error("Admin Menues: No se encontraron los elementos necesarios del DOM. El script no se activará.");
            return;
        }
        
        console.log("Admin script for 'menues' loaded and initialized.");
        setupEventListeners();
    }

    function setupEventListeners() {
        dom.moduleContainer.addEventListener('click', handleDelegatedClick);
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

        const editableField = e.target.closest('[data-editable="true"]');
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
        if (action === 'Duplicar') {
            handleDuplicateItem(targetItem);
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
            state.hasChanges = true;
            dom.saveButtonContainer.classList.remove('is-hidden');
        }
    }
    
    function handleDuplicateItem(itemToDuplicate) {
        const clonedNode = itemToDuplicate.cloneNode(true);
        
        let clonedData = JSON.parse(clonedNode.dataset.itemJson);
        
        clonedData.titulo = clonedData.titulo + " (Copia)";
        
        clonedData.id = `item_${Date.now()}`;
        
        clonedNode.dataset.itemJson = JSON.stringify(clonedData);
        
        const titleEl = clonedNode.querySelector('.item-titulo, .c-titulo-content > span');
        if (titleEl) {
            titleEl.textContent = clonedData.titulo;
        }
        
        itemToDuplicate.after(clonedNode);
        
        trackChange();
    }

    async function handleSaveChanges() {
        if (state.isSaving) return;

        state.isSaving = true;
        dom.saveButton.disabled = true;
        dom.saveButton.textContent = '⏳';

        const menuData = serializeMenu();
        const dataSourceFile = dom.moduleContainer.dataset.sourceFile;
        const dataset = document.body.dataset;
        const publicUrl = dataset.publicUrl;
        const clientUrl = dataset.clientUrl;
        const devId = dataset.devId;
        const clientId = dataset.clientId;
        const apiUrl = `${publicUrl}/api/saveMenu.php`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ menuData, dataSourceFile, client: clientId, url: clientUrl})
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Error desconocido del servidor.');
            }

            dom.saveButton.textContent = '✅';
            state.hasChanges = false;
            setTimeout(() => {
                 dom.saveButtonContainer.classList.add('is-hidden');
                 dom.saveButton.textContent = '💾';
            }, 2000);
            
            document.querySelectorAll('.is-admin-deleted').forEach(el => el.remove());

        } catch (error) {
            console.error('Error al guardar:', error);
            alert(`No se pudieron guardar los cambios: ${error.message}`);
            dom.saveButton.textContent = '❌';
             setTimeout(() => {
                 dom.saveButton.textContent = '💾';
            }, 3000);
        } finally {
            state.isSaving = false;
            dom.saveButton.disabled = false;
        }
    }

    function serializeMenu() {
        const rootItems = dom.moduleContainer.querySelector('.item-list').children;
        return Array.from(rootItems).map(node => serializeNode(node)).filter(Boolean);
    }

    function serializeNode(node) {
        if (node.classList.contains('is-admin-deleted')) {
            return null;
        }

        const originalData = JSON.parse(JSON.stringify(JSON.parse(node.dataset.itemJson)));
        
        const titleEl = node.querySelector('[data-editable="true"]');
        if (originalData.es_cat) {
             if(titleEl) originalData.titulo = titleEl.textContent.trim();
             const descEl = node.querySelector('.c-titulo-descripcion');
             if (descEl) originalData.descripcion = descEl.textContent.trim();
        } else {
             const titleItemEl = node.querySelector('.item-titulo');
             if (titleItemEl) originalData.titulo = titleItemEl.textContent.trim();

             const descItemEl = node.querySelector('.item-descripcion');
             if (descItemEl) originalData.descripcion = descItemEl.textContent.trim();
        }

        const priceEl = node.querySelector('.precio-valor');
        if (priceEl) {
            originalData.precio = parseInt(priceEl.textContent.trim().replace(/\./g, '').replace(/,/g, ''), 10);
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


    window.adminModuleInitializers = window.adminModuleInitializers || {};
    window.adminModuleInitializers.menues = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();