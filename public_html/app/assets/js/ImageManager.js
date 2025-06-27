const ImageManager = {
    config: {},
    modalElement: null,
    galleryElement: null,
    editorElement: null,
    previewElement: null,
    feedbackElement: null,
    cropper: null,
    currentItemId: null,

    async init() {
        this.config = window.appConfig || {};
        if (!this.config.publicUrl || !this.config.clientId) {
            console.error('ImageManager Error: La configuración global (appConfig) no está disponible.');
            return;
        }

        this.modalElement = document.getElementById('image-manager-modal');
        this.galleryElement = document.getElementById('image-gallery');
        this.editorElement = document.getElementById('image-editor');
        this.previewElement = document.getElementById('image-preview');
        this.feedbackElement = document.getElementById('upload-feedback');

        this._setupEventListeners();
    },

    _setupEventListeners() {
        this.modalElement.querySelector('#modal-close-btn').addEventListener('click', () => this.closeModal());
        this.modalElement.addEventListener('click', (e) => {
            if (e.target.id === 'image-manager-modal') this.closeModal();
        });
        document.getElementById('upload-cropped-btn').addEventListener('click', () => this._handleCropAndUpload());
        document.getElementById('cancel-crop-btn').addEventListener('click', () => this._showGalleryView());
    },

    async openModal(itemId) {
        if (!this.modalElement) {
            console.error("ImageManager no fue inicializado correctamente.");
            return;
        }
        this.currentItemId = itemId;
        this._showGalleryView();
        this.modalElement.style.display = 'flex';
        await this.loadImages();
    },

    closeModal() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.modalElement.style.display = 'none';
    },

    _showGalleryView() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.editorElement.style.display = 'none';
        this.feedbackElement.style.display = 'none';
        
        // ¡ESTA ES LA LÍNEA QUE FALTABA!
        // Vuelve a mostrar la galería de imágenes.
        this.galleryElement.style.display = 'flex'; // O 'grid', según tu CSS
        
        document.getElementById('modal-title').textContent = 'Seleccionar o Subir Imagen';
    },

    _showEditorView(imageSrc) {
        this.galleryElement.style.display = 'none';
        this.editorElement.style.display = 'block';
        this.previewElement.src = imageSrc;
        document.getElementById('modal-title').textContent = 'Encuadrar y Recortar Imagen';

        this.cropper = new Cropper(this.previewElement, {
            viewMode: 2,
            dragMode: 'move',
            aspectRatio: 1,
            autoCrop: true,
            autoCropArea: 1,
            background: false,
            guides: false,
            center: false,
            highlight: false,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
        });
    },

    async loadImages() {
        this.galleryElement.innerHTML = '<p>Cargando imágenes...</p>';
        try {
            const params = new URLSearchParams({
                action: 'list',
                client_id: this.config.clientId,
                url: this.config.clientUrl,
                version: this.config.version
            });
            const apiUrl = `${this.config.publicUrl}/api/image.php?${params.toString()}`;
            const response = await fetch(apiUrl);
            const result = await response.json();

            if (!result.success) throw new Error(result.message);

            this.galleryElement.innerHTML = '';
            this.galleryElement.appendChild(this._createUploadTile());

            const webpImages = result.data.images.filter(img => img.toLowerCase().endsWith('.webp'));
            if (webpImages.length > 0) {
                webpImages.forEach(imgName => this.galleryElement.appendChild(this._createImageTile(imgName)));
            } else {
                this.galleryElement.insertAdjacentHTML('beforeend', '<p>No hay imágenes .webp. ¡Sube la primera!</p>');
            }
        } catch (error) {
            this.galleryElement.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    },

    _handleFileSelect(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Por favor, selecciona un archivo de imagen válido (JPG, PNG, GIF, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => this._showEditorView(event.target.result);
        reader.readAsDataURL(file);
    },

    _handleCropAndUpload() {
        if (!this.cropper) return;

        this.feedbackElement.textContent = 'Procesando imagen...';
        this.feedbackElement.className = 'form-message';
        this.feedbackElement.style.display = 'block';

        this.cropper.getCroppedCanvas({
            width: 600,
            height: 600,
            imageSmoothingQuality: 'high'
        }).toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'cropped.webp');
            formData.append('client_id', this.config.clientId);
            formData.append('url', this.config.clientUrl);
            formData.append('version', this.config.version);

            try {
                const uploadUrl = `${this.config.publicUrl}/api/image.php?action=upload`;
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    this.feedbackElement.textContent = '¡Imagen subida y guardada!';
                    this.feedbackElement.classList.add('success');
                    setTimeout(async () => {
                        this._showGalleryView();
                        await this.loadImages();
                    }, 1500);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                this.feedbackElement.textContent = `Error: ${error.message}`;
                this.feedbackElement.classList.add('error');
            }
        }, 'image/webp', 0.8);
    },

    _createImageTile(imageName) {
        const tile = document.createElement('div');
        tile.className = 'image-tile';
        //?t=${new Date().getTime()})`;
        tile.style.backgroundImage = `url(${this.config.clientUrl}/imagenes/${imageName}`;
        tile.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('imageSelected', {
                detail: {
                    itemId: this.currentItemId,
                    imageName: imageName
                }
            }));
            this.closeModal();
        });
        return tile;
    },


    _createUploadTile() {
        const tile = document.createElement('div');
        tile.className = 'image-tile upload-tile';
        tile.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Subir Nueva</span>`;
        tile.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/png, image/jpeg, image/gif, image/webp';
            fileInput.onchange = (e) => this._handleFileSelect(e.target.files);
            fileInput.click();
        });
        return tile;
    },
};

export default ImageManager;