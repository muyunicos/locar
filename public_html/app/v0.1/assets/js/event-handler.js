document.addEventListener('DOMContentLoaded', () => {

    class EventScheduler {
        constructor() {
            this.body = document.body;
            this.clientId = this.body.dataset.clientId;
            this.initialContext = JSON.parse(this.body.dataset.initialContext || '{}');
            this.publicUrl = this.body.dataset.publicUrl;
            this.url = this.body.dataset.clientUrl;
            this.devId = this.body.dataset.devId;
            this.skinStylesheets = document.querySelectorAll('.skin-stylesheet');
            this.favicon = document.getElementById('favicon');
            this.activeEvents = {};
            this.timers = [];
            this.currentSkin = this.initialContext.default_skin || 'default';
            this.serverLoadedEventId = this.body.dataset.activeEventId || null;
            this.isInitialUpdate = true;
        }

        async init() {
            if (!this.clientId) {
                console.error('Scheduler Error: Client ID no encontrado.');
                return;
            }
            
            if (!this.publicUrl) {
                console.error('Scheduler Error: Base URL no encontrada en el body.');
                return;
            }

            try {
                let apiUrl = `${this.publicUrl}/api/agenda.php?client=${this.clientId}&url=${this.url}`;
                if (this.devId) {
                    apiUrl += `&dev=${this.devId}`;
                }
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
                
                const agendaData = await response.json();
                this.scheduleEvents(agendaData);

            } catch (error) {
                console.error('No se pudo obtener la agenda de eventos:', error);
            }
        }


        scheduleEvents(agendaData) {
            const { server_time_iso, events_agenda } = agendaData;
            const serverNow = new Date(server_time_iso).getTime();
            
            console.log(`Agenda recibida. Hora del servidor: ${server_time_iso}`);
            console.log(`Se encontraron ${events_agenda.length} eventos futuros.`);

            this.determineInitialState(serverNow, events_agenda);

            events_agenda.forEach(event => {
                const startTime = new Date(event.start_iso).getTime();
                const endTime = new Date(event.end_iso).getTime();

                const delayUntilStart = startTime - serverNow;
                const delayUntilEnd = endTime - serverNow;
                
                if (delayUntilStart > 0) {
                    const timer = setTimeout(() => {
                        console.log(`%cINICIO EVENTO: ${event.event_details.nombre}`, 'color: green; font-weight: bold;');
                        this.updateCurrentState(event.event_details, 'start');
                    }, delayUntilStart);
                    this.timers.push(timer);
                }

                if (delayUntilEnd > 0) {
                    const timer = setTimeout(() => {
                        console.log(`%cFIN EVENTO: ${event.event_details.nombre}`, 'color: red; font-weight: bold;');
                        this.updateCurrentState(event.event_details, 'end');
                    }, delayUntilEnd);
                    this.timers.push(timer);
                }
            });
        }
        
        determineInitialState(serverNow, events_agenda) {
            events_agenda.forEach(event => {
                const startTime = new Date(event.start_iso).getTime();
                const endTime = new Date(event.end_iso).getTime();
                if (serverNow >= startTime && serverNow < endTime) {
                    console.log(`El evento '${event.event_details.nombre}' ya estaba activo al cargar la página.`);
                    this.activeEvents[event.event_details.nombre] = event.event_details;
                }
            });
            this.updateView();
        }

        updateCurrentState(eventDetails, type) {
            const eventName = eventDetails.nombre;
            if (type === 'start') {
                this.activeEvents[eventName] = eventDetails;
            } else if (type === 'end') {
                delete this.activeEvents[eventName];
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

            if (this.isInitialUpdate && winningEvent && winningEvent.id == this.serverLoadedEventId) {
                console.log(`El estado del evento '${winningEvent.nombre}' ya fue cargado por el servidor. Omitiendo actualización inicial.`);
                this.isInitialUpdate = false;
                return;
            }

            this.isInitialUpdate = false;

            console.log("Actualizando vista. Evento ganador:", winningEvent ? winningEvent.nombre : 'Ninguno');

            const newSkin = winningEvent?.cambios?.skin || this.initialContext.default_skin;
            
            const faviconPath = winningEvent?.cambios?.favicon || this.initialContext.default_favicon;
            const newSuffix = winningEvent?.cambios?.sufijo;

            if (newSuffix) {
                document.title = this.initialContext.profile_title + newSuffix;
            }
            
            if (this.favicon && faviconPath) {
                if (faviconPath.startsWith('http')) {
                    this.favicon.href = faviconPath;
                } else if (faviconPath.startsWith('/')) {
                    this.favicon.href = `${this.publicUrl}${faviconPath}`;
                } else {
                    const clientUrlWithSlash = this.url.endsWith('/') ? this.url : this.url + '/';
                    this.favicon.href = `${clientUrlWithSlash}imagenes/${faviconPath}`;
                }
            }

            if (this.currentSkin !== newSkin) {
                console.log(`Cambiando skin de '${this.currentSkin}' a '${newSkin}'`);
                this.skinStylesheets.forEach(sheet => {
                    const currentHref = sheet.getAttribute('href');
                    if (currentHref) {
                        const newHref = currentHref.replace(`/${this.currentSkin}/`, `/${newSkin}/`);
                        sheet.setAttribute('href', newHref);
                    }
                });
                this.currentSkin = newSkin;
            }
        }

        destroy() {
            console.log('Limpiando todos los timers programados.');
            this.timers.forEach(timer => clearTimeout(timer));
            this.timers = [];
        }
    }

    const app = new EventScheduler();
    app.init();
});