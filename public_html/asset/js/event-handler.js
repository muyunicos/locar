document.addEventListener('DOMContentLoaded', () => {

    class EventScheduler {
        constructor() {
            // --- Elementos del DOM y datos iniciales ---
            this.body = document.body;
            this.clientId = this.body.dataset.clientId;
            this.initialContext = JSON.parse(this.body.dataset.initialContext || '{}');
            
            // --- NUEVO: Obtenemos la URL base ---
            this.baseUrl = this.body.dataset.baseUrl;

            // Seleccionamos los elementos que vamos a modificar
            this.skinStylesheets = document.querySelectorAll('.skin-stylesheet');
            this.favicon = document.getElementById('favicon');
            
            // --- Estado de la aplicación ---
            this.activeEvents = {}; // Un objeto para guardar los eventos actualmente activos
            this.timers = [];       // Guardaremos las referencias a nuestros timers
            this.currentSkin = this.initialContext.default_skin || 'default';
        }

        /**
         * Inicia el proceso: pide la agenda al servidor y la procesa.
         */
        async init() {
            if (!this.clientId) {
                console.error('Scheduler Error: Client ID no encontrado.');
                return;
            }
            
            // --- MODIFICADO: Verificamos que la baseUrl exista ---
            if (!this.baseUrl) {
                console.error('Scheduler Error: Base URL no encontrada en el body.');
                return;
            }

            try {
                // --- MODIFICADO: Usamos la URL base para la llamada a la API ---
                const response = await fetch(`${this.baseUrl}api/agenda.php?client=${this.clientId}`);
                if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
                
                const agendaData = await response.json();
                this.scheduleEvents(agendaData);

            } catch (error) {
                console.error('No se pudo obtener la agenda de eventos:', error);
            }
        }

        /**
         * Procesa la agenda recibida y programa los temporizadores.
         * @param {object} agendaData - La respuesta de nuestra API /api/agenda.php
         */
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
                        console.log(`%cINICIO EVENTO: ${event.event_details.name}`, 'color: green; font-weight: bold;');
                        this.updateCurrentState(event.event_details, 'start');
                    }, delayUntilStart);
                    this.timers.push(timer);
                }

                if (delayUntilEnd > 0) {
                    const timer = setTimeout(() => {
                        console.log(`%cFIN EVENTO: ${event.event_details.name}`, 'color: red; font-weight: bold;');
                        this.updateCurrentState(event.event_details, 'end');
                    }, delayUntilEnd);
                    this.timers.push(timer);
                }
            });
        }
        
        /**
         * Comprueba si algún evento ya debería estar activo al momento de cargar la página.
         */
        determineInitialState(serverNow, events_agenda) {
            events_agenda.forEach(event => {
                const startTime = new Date(event.start_iso).getTime();
                const endTime = new Date(event.end_iso).getTime();
                if (serverNow >= startTime && serverNow < endTime) {
                    console.log(`El evento '${event.event_details.name}' ya estaba activo al cargar la página.`);
                    this.activeEvents[event.event_details.name] = event.event_details;
                }
            });
            this.updateView();
        }

        /**
         * Modifica el estado actual añadiendo o quitando un evento.
         */
        updateCurrentState(eventDetails, type) {
            const eventName = eventDetails.name;
            if (type === 'start') {
                this.activeEvents[eventName] = eventDetails;
            } else if (type === 'end') {
                delete this.activeEvents[eventName];
            }
            this.updateView();
        }

        /**
         * Actualiza la interfaz (DOM) basándose en el estado actual de los eventos activos.
         */
        updateView() {
            const events = Object.values(this.activeEvents);
            let winningEvent = null;

            if (events.length > 0) {
                events.sort((a, b) => (b.priority || 0) - (a.priority || 0));
                winningEvent = events[0];
            }
            
            console.log("Actualizando vista. Evento ganador:", winningEvent ? winningEvent.name : 'Ninguno');

            // --- Extraemos los datos del evento ganador o usamos los valores por defecto ---
            const newSkin = winningEvent?.then?.set_skin || this.initialContext.default_skin;
            const titleSuffix = winningEvent?.then?.set_title_suffix || '';
            const newFavicon = winningEvent?.then?.set_favicon || this.initialContext.default_favicon;

            // --- Actualizamos el DOM ---
            document.title = this.initialContext.profile_title + titleSuffix;
            
            if (this.favicon) {
                // La URL del favicon ya viene absoluta desde el backend (AppKernel.php),
                // así que no necesitamos anteponer la baseUrl aquí.
                this.favicon.href = newFavicon;
            }

            if (this.currentSkin !== newSkin) {
                console.log(`Cambiando skin de '${this.currentSkin}' a '${newSkin}'`);
                this.skinStylesheets.forEach(sheet => {
                    const currentHref = sheet.getAttribute('href');
                    // Esta lógica de reemplazo sigue siendo válida porque las URLs
                    // completas generadas por el backend mantendrán la misma estructura.
                    const newHref = currentHref.replace(`/${this.currentSkin}/`, `/${newSkin}/`);
                    sheet.setAttribute('href', newHref);
                });
                this.currentSkin = newSkin;
            }
        }
    }

    // --- Iniciar la aplicación ---
    const app = new EventScheduler();
    app.init();
});