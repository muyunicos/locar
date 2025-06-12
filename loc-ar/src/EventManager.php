<?php
class EventManager
{
    private array $manifest;
    private DateTime $now;

    public function __construct(array $manifestData)
    {
        $this->manifest = $manifestData;
        $this->now = new DateTime('now', new DateTimeZone('America/Argentina/Buenos_Aires'));
    }

    private function isEventActive(array $event): bool
    {
        if (!isset($event['when'])) return false;
        
        $conditions = $event['when'];
        $currentTime = $this->now->format('H:i');
        $currentDayOfWeek = (int)$this->now->format('N'); // 1 (Mon) to 7 (Sun)

        // Comprobar todas las condiciones. Si alguna falla, el evento no está activo.
        if (isset($conditions['date_range'])) {
            $start = new DateTime($conditions['date_range']['start']);
            $end = (new DateTime($conditions['date_range']['end']))->setTime(23, 59, 59);
            if ($this->now < $start || $this->now > $end) return false;
        }

        if (isset($conditions['days_of_week'])) {
            if (!in_array($currentDayOfWeek, $conditions['days_of_week'])) return false;
        }

        if (isset($conditions['time_range'])) {
            $start = $conditions['time_range']['start'];
            $end = $conditions['time_range']['end'];
            if ($start > $end) { // Cruza medianoche
                if ($currentTime < $start && $currentTime >= $end) return false;
            } else { // Mismo día
                if ($currentTime < $start || $currentTime >= $end) return false;
            }
        }
        
        return true; // Si pasó todas las comprobaciones, está activo.
    }

    public function getContext(): array
    {
        // 1. Empezar con los valores por defecto
        $context = [
            'skin' => $this->manifest['default_skin'] ?? 'default',
            'title' => $this->manifest['profile_data']['name'],
            'favicon' => $this->manifest['profile_data']['favicon'] ?? '/asset/icons/default.ico',
            'banner' => $this->manifest['profile_data']['banner'] ?? '/asset/banners/default.jpg',
            'module_modifications' => []
        ];

        // 2. Encontrar todos los eventos activos
        $activeEvents = array_filter($this->manifest['timed_events'] ?? [], [$this, 'isEventActive']);

        // 3. Ordenar los eventos activos por prioridad (de mayor a menor)
        usort($activeEvents, fn($a, $b) => ($b['priority'] ?? 0) <=> ($a['priority'] ?? 0));

        // 4. Aplicar las acciones de los eventos, sobreescribiendo los valores.
        // Como están ordenados, los de mayor prioridad se aplican al final.
        foreach ($activeEvents as $event) {
            $actions = $event['then'];
            if (isset($actions['set_skin'])) $context['skin'] = $actions['set_skin'];
            if (isset($actions['set_title_suffix'])) $context['title'] .= $actions['set_title_suffix'];
            if (isset($actions['set_favicon'])) $context['favicon'] = $actions['set_favicon'];
            if (isset($actions['set_banner'])) $context['banner'] = $actions['set_banner'];
            if (isset($actions['modify_module_data'])) {
                 $context['module_modifications'] = array_merge_recursive($context['module_modifications'], $actions['modify_module_data']);
            }
        }
        
        return $context;
    }
}