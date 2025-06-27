// Objeto global para gestionar el modal de imágenes
const ImageManager = {
    modalElement: null,
    galleryElement: null,
    feedbackElement: null,
    currentItemId: null,
    clientId: null, // Se necesitará el ID del cliente

    // Inicializa el manager: carga el HTML del modal y lo añade al DOM
    async init(clientId) {
        this.clientId = clientId;
        try {
            const response = await fetch('assets/js/admin/menues/templates/image-manager-modal.html');
            if (!response.ok) throw new Error('No se pudo cargar la plantilla del modal.');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            
            // Guardamos referencias a los elementos del modal
            this.modalElement = document.getElementById('image-manager-modal');
            this.galleryElement = document.getElementById('image-gallery');
            this.feedbackElement = document.getElementById('upload-feedback');

            // Configuramos los eventos para cerrar el modal
            this.modalElement.querySelector('#modal-close-btn').addEventListener('click', () => this.closeModal());
            this.modalElement.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.closeModal();
                }
            });

        } catch (error) {
            console.error('Error inicializando ImageManager:', error);
        }
    },

    // Abre el modal y carga las imágenes
    async openModal(itemId) {
        this.currentItemId = itemId;
        this.feedbackElement.textContent = ''; // Limpiar feedback anterior
        this.modalElement.style.display = 'flex';
        await this.loadImages();
    },

    closeModal() {
        this.modalElement.style.display = 'none';
        this.galleryElement.innerHTML = ''; // Limpiamos la galería al cerrar
    },

    // Carga las imágenes desde la API y las muestra en el mosaico
    async loadImages() {
        this.galleryElement.innerHTML = '<p>Cargando imágenes...</p>';
        try {
            // Llamada al nuevo endpoint que crearemos
            const response = await fetch(`../../api/listImages.php?clientId=${this.clientId}`);
            const images = await response.json();

            this.galleryElement.innerHTML = ''; // Limpiamos el mensaje de "cargando"
            
            // 1. Añadimos el botón para subir nuevas imágenes
            const uploadTile = this._createUploadTile();
            this.galleryElement.appendChild(uploadTile);

            // 2. Añadimos las imágenes existentes
            images.forEach(imageName => {
                const tile = this._createImageTile(imageName);
                this.galleryElement.appendChild(tile);
            });

        } catch (error) {
            this.galleryElement.innerHTML = '<p>No se pudieron cargar las imágenes.</p>';
            console.error('Error cargando imágenes:', error);
        }
    },

    _createImageTile(imageName) {
        const tile = document.createElement('div');
        tile.className = 'image-tile';
        tile.style.backgroundImage = `url(imagenes/${this.clientId}/${imageName})`;
        tile.dataset.imageName = imageName;

        tile.addEventListener('click', () => {
            this.selectImage(imageName);
        });
        return tile;
    },

    _createUploadTile() {
        const tile = document.createElement('div');
        tile.className = 'image-tile upload-tile';
        tile.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Subir Nueva</span>
        `;
        
        // Al hacer clic, se simula un clic en un input de tipo file
        tile.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/png, image/jpeg, image/gif, image/webp';
            fileInput.onchange = (e) => this.uploadImage(e.target.files[0]);
            fileInput.click();
        });

        return tile;
    },

    // Función llamada cuando un usuario selecciona una imagen del mosaico
    selectImage(imageName) {
        // Llama a una función en MenuState para actualizar el modelo de datos
        menuState.updateItemImage(this.currentItemId, imageName);
        this.closeModal();
    },

    // Sube el archivo al nuevo endpoint de la API
    async uploadImage(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('clientId', this.clientId);

        this.feedbackElement.textContent = 'Subiendo...';

        try {
            const response = await fetch('../../api/uploadImage.php', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                this.feedbackElement.textContent = '¡Subida con éxito!';
                // Una vez subida, la seleccionamos automáticamente
                this.selectImage(result.fileName);
            } else {
                throw new Error(result.error || 'Error desconocido al subir la imagen.');
            }
        } catch (error) {
            this.feedbackElement.textContent = `Error: ${error.message}`;
            console.error('Error al subir imagen:', error);
        }
    }
};