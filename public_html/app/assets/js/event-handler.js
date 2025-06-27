document.addEventListener('DOMContentLoaded', () => {

    class EventScheduler {
        constructor() {
            const config = window.appConfig || {};
            this.clientId = config.clientId;
            this.initialContext = config.initialContext || {};
            this.publicUrl = config.publicUrl;
            this.clientUrl = config.clientUrl;
            this.version = config.version;
            
            this.skinStylesheets = document.querySelectorAll('.main-stylesheet');
            this.favicon = document.getElementById('favicon');
            
            this.activeEvents = {};
            this.pendingEvents = [];
            this.ticker = null;
            
            this.currentSkin = this.initialContext.default_skin || 'default';
            this.serverLoadedEventId = config.activeEventId || null;
            this.isInitialUpdate = true;
        }

        async init() {
            if (!this.clientId || !this.publicUrl) {
                console.error('Scheduler Error: Configuración de cliente no encontrada.');
                return;
            }

            try {
                let apiUrl = `${this.publicUrl}/api/agenda.php?client_id=${this.clientId}&url=${encodeURIComponent(this.clientUrl)}`;
                if (this.version) apiUrl += `&version=${this.version}`;

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(`API Error: ${response.statusText}. Details: ${errorBody.message || JSON.stringify(errorBody)}`);
                }
                
                const agendaData = await response.json();

                if (agendaData.success && agendaData.data) {
                    this.scheduleEvents(agendaData.data);
                    this.updateView();
                    this.initializeRealtimeUpdates();
                } else {
                    console.error('Error en la respuesta de la API de agenda:', agendaData.message);
                }

            } catch (error) {
                console.error('No se pudo obtener la agenda de eventos:', error);
            }
        }
        
        initializeRealtimeUpdates() {
            if (!this.publicUrl) {
                console.error("No se puede inicializar SSE: publicUrl no está definido.");
                return;
            }

            const uniqueModuleIds = [];

            document.querySelectorAll('div[id*="-container-"]').forEach(element => {
                const fullId = element.id;
                const parts = fullId.split('-');
                if (parts.length >= 3) { 
                    const yyy = parts[parts.length - 1];
                    uniqueModuleIds.push(yyy);
                }
            });

            const modulesToWatch = uniqueModuleIds.length > 0 ? encodeURIComponent(JSON.stringify([...new Set(uniqueModuleIds)])) : '';

            const eventSource = new EventSource(
                    `${this.publicUrl}/api/events.php?client_id=${this.clientId}&url=${encodeURIComponent(this.clientUrl)}&watch_modules=${modulesToWatch}`
                );
            eventSource.addEventListener('watching_files', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.files) {
                        console.log('%cArchivos en vigilancia por el servidor:', 'color: #1e90ff; font-weight: bold;', data.files.map(f => f.split('/').pop()));
                    }
                } catch (e) {
                    console.error('Error al procesar la lista de archivos vigilados:', e);
                }
            });
            eventSource.addEventListener('menu_update', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Notificación de actualización recibida para el menú:', data.menu_id);

                    const contentWrapper = document.getElementById('module-content-wrapper');
                    const currentModuleElement = contentWrapper.querySelector(`div[id="menues-container-${data.menu_id}"]`);

                    if (currentModuleElement) {
                        console.log('El menú actualizado está visible. Recargando contenido...');
                        
                        if (window.loadModule) {
                            window.loadModule(data.menu_id);
                        }
                    }

                } catch (e) {
                    console.error('Error al procesar el evento de actualización del menú:', e);
                }
            });

            eventSource.onopen = () => console.log("Conexión de eventos en tiempo real establecida.");
            eventSource.onerror = () => console.error("Se perdió la conexión de eventos en tiempo real.");
        }
        
        scheduleEvents(agenda) {
            this.destroy();
            const now = new Date(agenda.server_time_iso);
            
            console.log(`Servidor reporta la hora: ${now.toLocaleTimeString()}. Procesando ${agenda.events_agenda.length} eventos programados.`);

            this.pendingEvents = (agenda.events_agenda || []).map(scheduledEvent => ({
                details: scheduledEvent.event_details,
                startTime: new Date(scheduledEvent.start_iso),
                endTime: new Date(scheduledEvent.end_iso),
            }));
            
            this.checkEvents(); 

            this.ticker = setInterval(() => this.checkEvents(), 1000);
        }

        checkEvents() {
            const now = new Date();
            let stateHasChanged = false;

            this.pendingEvents.forEach(event => {
                const shouldBeActive = now >= event.startTime && now < event.endTime;
                const isCurrentlyActive = !!this.activeEvents[event.details.id];

                if (shouldBeActive && !isCurrentlyActive) {
                    console.log(`%cINICIANDO EVENTO: ${event.details.nombre}`, 'color: green; font-weight: bold;');
                    this.activeEvents[event.details.id] = event.details;
                    stateHasChanged = true;
                } else if (!shouldBeActive && isCurrentlyActive) {
                    console.log(`%cFINALIZANDO EVENTO: ${event.details.nombre}`, 'color: red; font-weight: bold;');
                    delete this.activeEvents[event.details.id];
                    stateHasChanged = true;
                }
            });

            if (stateHasChanged) {
                this.updateView();
            }
        }
        
        updateView() {
            const events = Object.values(this.activeEvents);
            let winningEvent = null;

            if (events.length > 0) {
                events.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
                winningEvent = events[0];
            }

            if (this.isInitialUpdate && winningEvent && winningEvent.id == this.serverLoadedEventId) {
                console.log(`El estado del evento '${winningEvent.nombre}' ya fue cargado por el servidor.`);
                this.currentSkin = winningEvent.cambios?.skin || this.currentSkin;
                this.isInitialUpdate = false;
                return;
            }

            this.isInitialUpdate = false;
            console.log("Actualizando vista. Evento ganador:", winningEvent ? winningEvent.nombre : 'Ninguno (estado por defecto)');

            const newSkin = winningEvent?.cambios?.skin || this.initialContext.default_skin || 'default';
            if (this.currentSkin !== newSkin) {
                console.log(`Cambiando skin de '${this.currentSkin}' a '${newSkin}'`);
                this.skinStylesheets.forEach(sheet => {
                    const currentHref = sheet.getAttribute('href');
                    if (currentHref) {
                        const newHref = currentHref.replace(`/${this.currentSkin}/`, `/${newSkin}/`);
                        if (currentHref !== newHref) {
                            sheet.setAttribute('href', newHref);
                        }
                    }
                });
                this.currentSkin = newSkin;
            }
            
            const faviconPath = winningEvent?.cambios?.favicon || this.initialContext.default_favicon;
            if (this.favicon && faviconPath) {
                let finalFaviconUrl = faviconPath.startsWith('http') ? faviconPath : (faviconPath.startsWith('/') ? `${this.publicUrl}${faviconPath}` : `${this.clientUrl.replace(/\/$/, '')}/imagenes/${faviconPath}`);
                this.favicon.href = finalFaviconUrl;
            }

            const newSuffix = winningEvent?.cambios?.sufijo;
            document.title = this.initialContext.profile_title + (newSuffix || '');
        }

        destroy() {
            if (this.ticker) {
                clearInterval(this.ticker);
                this.ticker = null;
                console.log("Ticker de eventos detenido.");
            }
        }
    }

    const app = new EventScheduler();
    app.init();
});