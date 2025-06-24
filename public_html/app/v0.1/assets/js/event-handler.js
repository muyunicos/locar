document.addEventListener('DOMContentLoaded', () => {

    class EventScheduler {
        constructor() {
            const config = window.appConfig || {};
            this.clientId = config.clientId;
            this.initialContext = config.initialContext || {};
            this.publicUrl = config.publicUrl;
            this.clientUrl = config.clientUrl;
            this.devId = config.devId;
            
            this.body = document.body;
            // **AJUSTE CLAVE:** Usamos el selector '.main-stylesheet' que coincide con tu plantilla main.html
            this.skinStylesheets = document.querySelectorAll('.main-stylesheet');
            this.favicon = document.getElementById('favicon');
            
            this.activeEvents = {};
            this.timers = []; 
            
            this.currentSkin = this.initialContext.default_skin || 'default';
            this.serverLoadedEventId = config.activeEventId || null;
            this.isInitialUpdate = true;
        }

        async init() {
            if (!this.clientId || !this.publicUrl) {
                console.error('Scheduler Error: Client ID o Public URL no encontrados en appConfig.');
                return;
            }

            try {
                let apiUrl = `${this.publicUrl}/api/agenda.php?client_id=${this.clientId}&url=${encodeURIComponent(this.clientUrl)}`;
                if (this.devId) {
                    apiUrl += `&dev_branch=${this.devId}`;
                }

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(`API Error: ${response.statusText}. Details: ${errorBody.message || JSON.stringify(errorBody)}`);
                }
                
                const agendaData = await response.json();

                if (agendaData.success && agendaData.data) {
                    if (agendaData.server_logs && Array.isArray(agendaData.server_logs)) {
                        console.groupCollapsed("PHP Server-Side Logs (API Agenda)");
                        agendaData.server_logs.forEach(log => console.log(log));
                        console.groupEnd();
                    }
                    this.scheduleEvents(agendaData.data);
                    
                    // Sincronizar la vista inmediatamente después de programar para procesar el estado inicial.
                    this.updateView();

                } else {
                    console.error('Error en la respuesta de la API de agenda:', agendaData.message);
                }

            } catch (error) {
                console.error('No se pudo obtener la agenda de eventos:', error);
            }
        }

        scheduleEvents(agenda) {
            this.destroy();

            const now = new Date(agenda.server_time_iso);
            const events = agenda.events_agenda || [];

            console.log(`Servidor reporta la hora: ${now.toLocaleTimeString()}. Se programarán ${events.length} cambios de estado.`);

            events.forEach(scheduledEvent => {
                const event = scheduledEvent.event_details;
                const startTime = new Date(scheduledEvent.start_iso);
                const endTime = new Date(scheduledEvent.end_iso);

                // Lógica para manejar eventos ya activos vs. futuros.
                if (startTime <= now && endTime > now) {
                    // Evento ya activo: añadir al estado y solo programar su final.
                    console.log(`Evento '${event.nombre}' ya está ACTIVO. Añadiendo al estado.`);
                    this.activeEvents[event.id] = event;
                    
                    const delay = endTime.getTime() - now.getTime();
                    console.log(`Evento '${event.nombre}' programado para FINALIZAR en ${Math.round(delay/1000)}s.`);
                    const timerId = setTimeout(() => {
                        console.log(`%cFINALIZANDO EVENTO: ${event.nombre}`, 'color: red; font-weight: bold;');
                        this.manageEventState(event, 'remove');
                    }, delay);
                    this.timers.push(timerId);

                } else if (startTime > now) {
                    // Evento futuro: programar inicio y final.
                    const startDelay = startTime.getTime() - now.getTime();
                    console.log(`Evento '${event.nombre}' programado para INICIAR en ${Math.round(startDelay/1000)}s.`);
                    const startTimerId = setTimeout(() => {
                        console.log(`%cINICIANDO EVENTO: ${event.nombre}`, 'color: green; font-weight: bold;');
                        this.manageEventState(event, 'add');
                    }, startDelay);
                    this.timers.push(startTimerId);

                    const endDelay = endTime.getTime() - now.getTime();
                    console.log(`Evento '${event.nombre}' programado para FINALIZAR en ${Math.round(endDelay/1000)}s.`);
                    const endTimerId = setTimeout(() => {
                        console.log(`%cFINALIZANDO EVENTO: ${event.nombre}`, 'color: red; font-weight: bold;');
                        this.manageEventState(event, 'remove');
                    }, endDelay);
                    this.timers.push(endTimerId);
                }
            });
        }
        
        manageEventState(event, action) {
            if (action === 'add') {
                this.activeEvents[event.id] = event;
            } else if (action === 'remove') {
                delete this.activeEvents[event.id];
            }
            this.updateView();
        }

        updateView() {
            const events = Object.values(this.activeEvents);
            let winningEvent = null;

            if (events.length > 0) {
                events.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
                winningEvent = events[0];
            }

            // Sincronizar el estado del skin en la carga inicial.
            if (this.isInitialUpdate && winningEvent && winningEvent.id == this.serverLoadedEventId) {
                console.log(`El estado del evento '${winningEvent.nombre}' ya fue cargado por el servidor. Omitiendo actualización visual.`);
                // Sincronizamos el estado del skin actual. ¡Esto es crucial!
                this.currentSkin = winningEvent.cambios?.skin || this.currentSkin;
                this.isInitialUpdate = false;
                return;
            }
            this.isInitialUpdate = false;

            console.log("Actualizando vista. Evento ganador:", winningEvent ? winningEvent.nombre : 'Ninguno (estado por defecto)');

            const newSkin = winningEvent?.cambios?.skin || this.initialContext.default_skin || 'default';
            const faviconPath = winningEvent?.cambios?.favicon || this.initialContext.default_favicon;
            const newSuffix = winningEvent?.cambios?.sufijo;

            if (newSuffix) {
                document.title = this.initialContext.profile_title + newSuffix;
            } else {
                document.title = this.initialContext.profile_title;
            }
            
            if (this.favicon && faviconPath) {
                let finalFaviconUrl = '';
                if (faviconPath.startsWith('http')) {
                    finalFaviconUrl = faviconPath;
                } else if (faviconPath.startsWith('/')) {
                    finalFaviconUrl = `${this.publicUrl}${faviconPath}`;
                } else {
                    const clientUrlWithSlash = this.clientUrl.endsWith('/') ? this.clientUrl : this.clientUrl + '/';
                    finalFaviconUrl = `${clientUrlWithSlash}imagenes/${faviconPath}`;
                }
                this.favicon.href = finalFaviconUrl;
            }

            if (this.currentSkin !== newSkin) {
                console.log(`Cambiando skin de '${this.currentSkin}' a '${newSkin}'`);
                this.skinStylesheets.forEach(sheet => {
                    const currentHref = sheet.getAttribute('href');
                    if (currentHref) {
                        // Esta lógica reemplaza la parte del path que contiene el nombre del skin
                        const newHref = currentHref.replace(`/${this.currentSkin}/`, `/${newSkin}/`);
                        if (currentHref !== newHref) {
                            sheet.setAttribute('href', newHref);
                            console.log(`Stylesheet actualizado a: ${newHref}`);
                        }
                    }
                });
                this.currentSkin = newSkin;
            }
        }

        destroy() {
            if(this.timers.length > 0) {
                console.log(`Limpiando ${this.timers.length} timers programados.`);
                this.timers.forEach(timer => clearTimeout(timer));
                this.timers = [];
            }
        }
    }

    const app = new EventScheduler();
    app.init();
});