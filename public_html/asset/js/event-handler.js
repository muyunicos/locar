document.addEventListener('DOMContentLoaded', () => {

    class EventScheduler {
        constructor() {
            // --- Elementos del DOM y datos iniciales ---
            this.body = document.body;
            this.clientId = this.body.dataset.clientId;
            this.initialContext = JSON.parse(this.body.dataset.initialContext || '{}');

            this.skinStylesheet = document.getElementById('skin-stylesheet');
            this.favicon = document.getElementById('favicon');
            
            // --- Estado de la aplicación ---
            this.activeEvents = {}; // Un objeto para guardar los eventos actualmente activos
            this.timers = [];       // Guardaremos las referencias a nuestros timers
            
            // --- Información del Manifiesto (se cargará después) ---
            this.profileTitle = '';
            this.defaultSkin = 'default';
            this.defaultFavicon = 'asset/favicon/default.png';
        }

        /**
         * Inicia el proceso: pide la agenda al servidor y la procesa.
         */
        async init() {
            if (!this.clientId) {
                console.error('Scheduler Error: Client ID no encontrado.');
                return;
            }

            try {
                const response = await fetch(`/api/agenda.php?client=${this.clientId}`);
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

            // Primero, determinamos el estado inicial correcto
            this.determineInitialState(serverNow, events_agenda);

            events_agenda.forEach(event => {
                const startTime = new Date(event.start_iso).getTime();
                const endTime = new Date(event.end_iso).getTime();

                // Calculamos el tiempo restante (delay) desde AHORA hasta que el evento empiece/termine
                const delayUntilStart = startTime - serverNow;
                const delayUntilEnd = endTime - serverNow;
                
                // Programamos el inicio del evento solo si es en el futuro
                if (delayUntilStart > 0) {
                    const timer = setTimeout(() => {
                        console.log(`%cINICIO EVENTO: ${event.id}`, 'color: green; font-weight: bold;');
                        this.updateCurrentState(event.id, event.event_details, 'start');
                    }, delayUntilStart);
                    this.timers.push(timer);
                }

                // Programamos el fin del evento solo si es en el futuro
                if (delayUntilEnd > 0) {
                    const timer = setTimeout(() => {
                        console.log(`%cFIN EVENTO: ${event.id}`, 'color: red; font-weight: bold;');
                        this.updateCurrentState(event.id, event.event_details, 'end');
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
                    console.log(`El evento '${event.id}' ya estaba activo al cargar la página.`);
                    this.activeEvents[event.id] = event.event_details;
                }
            });
            this.updateView(); // Actualizamos la vista con el estado inicial correcto.
        }

        /**
         * Modifica el estado actual añadiendo o quitando un evento.
         * @param {string} eventId - El ID del evento.
         * @param {object} eventDetails - Los detalles completos del evento.
         * @param {'start'|'end'} type - Si el evento está empezando o terminando.
         */
        updateCurrentState(eventId, eventDetails, type) {
            if (type === 'start') {
                this.activeEvents[eventId] = eventDetails;
            } else if (type === 'end') {
                delete this.activeEvents[eventId];
            }
            this.updateView();
        }

        /**
         * Actualiza la interfaz (DOM) basándose en el estado actual de los eventos activos.
         * Se encarga de la lógica de prioridad.
         */
        updateView() {
            const events = Object.values(this.activeEvents);
            let winningEvent = null;

            if (events.length > 0) {
                // Ordenamos por prioridad para encontrar el evento "ganador"
                events.sort((a, b) => (b.priority || 0) - (a.priority || 0));
                winningEvent = events[0];
            }
            
            console.log("Actualizando vista. Evento ganador:", winningEvent ? winningEvent.id : 'Ninguno');

            // --- Actualizar Apariencia (título, skin, favicon) ---
            const skin = winningEvent?.skin || this.initialContext.default_skin || 'default';
            const title = winningEvent?.title_modifier || this.initialContext.profile_title || document.title;
            const faviconFile = winningEvent?.favicon_modifier || this.initialContext.default_favicon || 'default.png';

            document.title = title;
            this.favicon.href = `/asset/favicon/${faviconFile}`;
            this.skinStylesheet.href = `/asset/css/skin/${skin}.css`;
            
            // --- Actualizar Vista de Módulos (ej: menú del catálogo) ---
            this.updateMenuView(winningEvent);
        }

        /**
         * Muestra u oculta los ítems del menú según el evento activo.
         * @param {object|null} winningEvent - El evento de mayor prioridad activo.
         */
        updateMenuView(winningEvent) {
            const productos = document.querySelectorAll('.producto[data-menu]');
            let menuActivo = 'default'; // Menú por defecto

            if (winningEvent?.data_modifiers?.catalog?.show_menu) {
                menuActivo = winningEvent.data_modifiers.catalog.show_menu;
            }

            productos.forEach(producto => {
                producto.style.display = (producto.dataset.menu === menuActivo) ? 'block' : 'none';
            });
        }
    }

    // --- Iniciar la aplicación ---
    const app = new EventScheduler();
    app.init();
});