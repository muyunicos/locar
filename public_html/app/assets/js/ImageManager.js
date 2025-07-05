const ImageManager = {
    config: {},
    currentItemId: null,
    cropper: null,

    async init() {
        this.config = window.appConfig || {};
        if (!this.config.publicUrl || !this.config.clientId) {
            console.error('ImageManager Error: La configuración global (appConfig) no está disponible.');
        }
    },

    async openModal(itemId) {
        this.currentItemId = itemId;
        const modal = document.getElementById('image-manager-modal');
        if (!modal) {
            console.error("No se pudo encontrar el elemento del modal: #image-manager-modal");
            return;
        }

        this._setupEventListeners(modal);
        this._showGalleryView();
        modal.style.display = 'flex';
        await this.loadImages();
    },
    
    _setupEventListeners(modal) {
        modal.querySelector('#modal-close-btn').onclick = () => this.closeModal();
        modal.onclick = (e) => {
            if (e.target.id === 'image-manager-modal') this.closeModal();
        };
        document.getElementById('upload-cropped-btn').onclick = () => this._handleCropAndUpload();
        document.getElementById('cancel-crop-btn').onclick = () => this._showGalleryView();

        const watermarkSelect = document.getElementById('watermark-select');
        const watermarkPreview = document.getElementById('watermark-preview-overlay');
        
        watermarkSelect.onchange = (e) => {
            const selectedWatermarkFile = e.target.value;
            if (selectedWatermarkFile) {
                watermarkPreview.src = `${this.config.clientUrl}/imagenes/${selectedWatermarkFile}`;
                watermarkPreview.style.display = 'block';
            } else {
                watermarkPreview.style.display = 'none';
            }
        };
    },

    closeModal() {
        const modal = document.getElementById('image-manager-modal');
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        if (modal) modal.style.display = 'none';
    },

    // --- MANEJO DE VISTAS DENTRO DEL MODAL ---

    _showGalleryView() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        document.getElementById('image-editor').style.display = 'none';
        document.getElementById('upload-feedback').style.display = 'none';
        document.getElementById('image-gallery').style.display = 'flex';
        document.getElementById('modal-title').textContent = 'Seleccionar o Subir Imagen';
        document.getElementById('watermark-preview-overlay').style.display = 'none';
    },

    // --- ¡FUNCIÓN CLAVE CORREGIDA! ---
    _showEditorView(imageSrc) {
        const previewElement = document.getElementById('image-preview');
        if (!previewElement) return;
        
        document.getElementById('image-gallery').style.display = 'none';
        document.getElementById('image-editor').style.display = 'block';
        previewElement.src = imageSrc;
        document.getElementById('modal-title').textContent = 'Encuadrar y Recortar Imagen';

        if (this.cropper) this.cropper.destroy();

        this.cropper = new Cropper(previewElement, {
            viewMode: 1, dragMode: 'move', aspectRatio: 1, autoCrop: true,
            autoCropArea: 1, background: false, guides: false, center: false,
            highlight: false, cropBoxMovable: false, cropBoxResizable: false,
            toggleDragModeOnDblclick: false, responsive: false, checkOrientation: false,

            // El evento 'ready' se dispara una vez que el cropper está listo.
            ready: () => {
                this._syncWatermarkOverlay();
            },
            // El evento 'crop' se dispara cada vez que la imagen se mueve.
            crop: () => {
                this._syncWatermarkOverlay();
            }
        });
    },

    /**
     * ¡NUEVA FUNCIÓN AUXILIAR!
     * Sincroniza la previsualización de la marca de agua con el recuadro de recorte de Cropper.
     */
    _syncWatermarkOverlay() {
    if (!this.cropper) return;

    const watermarkPreview = document.getElementById('watermark-preview-overlay');
    // El contenedor "ancla" que nosotros definimos.
    const cropContainer = document.getElementById('crop-container');
    // El elemento visual que Cropper.js genera y mueve.
    const cropBox = this.cropper.cropper.querySelector('.cropper-crop-box');

    if (watermarkPreview && cropContainer && cropBox) {
        // 1. Obtenemos las coordenadas y dimensiones de ambos elementos en la página.
        const containerRect = cropContainer.getBoundingClientRect();
        const cropBoxRect = cropBox.getBoundingClientRect();

        // 2. Calculamos la posición RELATIVA del recuadro de recorte DENTRO de nuestro contenedor.
        const top = cropBoxRect.top - containerRect.top;
        const left = cropBoxRect.left - containerRect.left;

        // 3. Aplicamos los estilos calculados a nuestra previsualización.
        // Ahora usamos 'top' y 'left' en lugar de 'transform'.
        watermarkPreview.style.top = `${top}px`;
        watermarkPreview.style.left = `${left}px`;
        watermarkPreview.style.width = `${cropBoxRect.width}px`;
        watermarkPreview.style.height = `${cropBoxRect.height}px`;
    }
},
    async loadImages() {
        const galleryElement = document.getElementById('image-gallery');
        galleryElement.innerHTML = '<p>Cargando...</p>';
        try {
            const params = new URLSearchParams({ action: 'list', client_id: this.config.clientId, url: this.config.clientUrl, version: this.config.version });
            const response = await fetch(`${this.config.publicUrl}/api/image.php?${params.toString()}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            galleryElement.innerHTML = '';
            galleryElement.appendChild(this._createUploadTile());

            const images = result.data.images || [];
            const normalImages = images.filter(img => !img.startsWith('watermark-'));
            const watermarkImages = images.filter(img => img.startsWith('watermark-'));

            if (normalImages.length > 0) {
                normalImages.forEach(imgName => galleryElement.appendChild(this._createImageTile(imgName)));
            } else {
                galleryElement.insertAdjacentHTML('beforeend', '<p>No hay imágenes. ¡Sube la primera!</p>');
            }
            this._populateWatermarks(watermarkImages);
        } catch (error) {
            galleryElement.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    },

    _populateWatermarks(watermarks) {
        const watermarkSelect = document.getElementById('watermark-select');
        const watermarkContainer = document.getElementById('watermark-options');
        if (!watermarkSelect || !watermarkContainer) return;

        watermarkSelect.innerHTML = '<option value="">Ninguna</option>';
        if (watermarks.length > 0) {
            watermarks.forEach(fullName => {
                const cleanName = fullName.replace('watermark-', '').replace(/\.webp$/i, '');
                const option = document.createElement('option');
                option.value = fullName;
                option.textContent = cleanName;
                watermarkSelect.appendChild(option);
            });
            watermarkContainer.style.display = 'block';
        } else {
            watermarkContainer.style.display = 'none';
        }
    },

    _handleFileSelect(files) {
        const file = files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => this._showEditorView(event.target.result);
        reader.readAsDataURL(file);
    },

    _handleCropAndUpload() {
        if (!this.cropper) return;
        const feedbackElement = document.getElementById('upload-feedback');
        feedbackElement.textContent = 'Procesando...';
        feedbackElement.className = 'form-message';
        feedbackElement.style.display = 'block';
        
        this.cropper.getCroppedCanvas({ width: 800, height: 800, imageSmoothingQuality: 'high' })
        .toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'cropped.webp');
            formData.append('client_id', this.config.clientId);
            formData.append('url', this.config.clientUrl);
            formData.append('version', this.config.version);
            const selectedWatermark = document.getElementById('watermark-select').value;
            if (selectedWatermark) formData.append('watermark', selectedWatermark);

            try {
                const response = await fetch(`${this.config.publicUrl}/api/image.php?action=upload`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!result.success) throw new Error(result.message);

                feedbackElement.textContent = '¡Imagen subida y guardada!';
                feedbackElement.classList.add('success');
                setTimeout(async () => {
                    this._showGalleryView();
                    await this.loadImages();
                }, 1500);
            } catch (error) {
                feedbackElement.textContent = `Error: ${error.message}`;
                feedbackElement.classList.add('error');
            }
        }, 'image/webp', 0.9);
    },
    
       _createImageTile(imageName) {
        const tile = document.createElement('div');
        tile.className = 'image-tile';
        tile.style.backgroundImage = `url(${this.config.clientUrl}/imagenes/${imageName}?t=${new Date().getTime()})`;
        tile.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('imageSelected', { detail: { itemId: this.currentItemId, imageName } }));
            this.closeModal();
        });
        return tile;
    },

    _createUploadTile() {
        const tile = document.createElement('div');
        tile.className = 'image-tile upload-tile';
        tile.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Subir Nueva</span>`;
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