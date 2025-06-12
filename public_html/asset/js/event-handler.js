(function() {
    const config = window.EVENT_CONFIG;
    if (!config || !config.rules) return;

    function getActiveContext() {
        const context = { ...config.defaults };
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Sun=0 -> Sun=7

        const activeEvents = config.rules.filter(event => {
            if (!event.when) return false;
            const cond = event.when;
            if (cond.date_range) {
                if (now < new Date(cond.date_range.start) || now > new Date(cond.date_range.end + "T23:59:59")) return false;
            }
            if (cond.days_of_week) {
                if (!cond.days_of_week.includes(currentDay)) return false;
            }
            if (cond.time_range) {
                if (cond.time_range.start > cond.time_range.end) {
                    if (currentTime < cond.time_range.start && currentTime >= cond.time_range.end) return false;
                } else {
                    if (currentTime < cond.time_range.start || currentTime >= cond.time_range.end) return false;
                }
            }
            return true;
        });

        activeEvents.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        activeEvents.forEach(event => {
            const actions = event.then;
            if (actions.set_skin) context.skin = actions.set_skin;
            if (actions.set_title_suffix) context.title += actions.set_title_suffix;
            if (actions.set_favicon) context.favicon = actions.set_favicon;
            // Otras acciones visuales se pueden añadir aquí (ej. banner)
        });
        
        return context;
    }

    function applyContext(context) {
        // Actualizar Título
        document.getElementById('page-title').innerText = context.title;

        // Actualizar Favicon
        document.getElementById('page-favicon').href = context.favicon;

        // Actualizar Estilos
        const currentSkin = document.querySelector('.stylesheet').href.match(/\/skins\/(.*?)\//)[1];
        if (currentSkin !== context.skin) {
            console.log(`Cambiando skin a: ${context.skin}`);
            document.querySelectorAll('.stylesheet').forEach(sheet => {
                const newHref = sheet.href.replace(/\/skins\/[a-zA-Z0-9_-]+\//, `/skins/${context.skin}/`);
                sheet.href = newHref;
            });
        }
        // Nota: aplicar cambios de datos como descuentos en vivo requeriría una llamada a una API
        // para re-renderizar el módulo, lo cual es más complejo. Por ahora, nos centramos en cambios visuales.
    }

    setInterval(() => {
        const newContext = getActiveContext();
        applyContext(newContext);
    }, 30000); // Comprobar cada 30 segundos

})();
