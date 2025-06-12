<?php

class EventManager
{
    private array $events;
    private DateTimeZone $timezone;

    public function __construct(array $events)
    {
        $this->events = $events;
        $this->timezone = new DateTimeZone('America/Argentina/Buenos_Aires');
    }

    private function isDateInRange(array $event, DateTime $now): bool
    {
        if (empty($event['start_date']) || empty($event['end_date'])) {
            return true; // No date range specified
        }

        $startDate = DateTime::createFromFormat('Y-m-d', $event['start_date'], $this->timezone);
        $startDate->setTime(0, 0, 0);

        $endDate = DateTime::createFromFormat('Y-m-d', $event['end_date'], $this->timezone);
        $endDate->setTime(23, 59, 59);

        return $now >= $startDate && $now <= $endDate;
    }

    private function isDayActive(array $event, DateTime $now): bool
    {
        if (empty($event['active_on_days'])) {
            return true; // Active on all days
        }
        $currentDay = $now->format('N'); // 1 (for Monday) through 7 (for Sunday)
        return in_array($currentDay, $event['active_on_days']);
    }

    private function isTimeActive(array $event, DateTime $now): bool
    {
        if (empty($event['start_time']) || empty($event['end_time'])) {
            return true; // No time range specified
        }

        $startTime = DateTime::createFromFormat('H:i', $event['start_time'], $this->timezone);
        $endTime = DateTime::createFromFormat('H:i', $event['end_time'], $this->timezone);

        // Handle overnight events
        if ($startTime > $endTime) {
            // Event crosses midnight
            // Example: 22:00 to 02:00
            // Active if current time is >= 22:00 OR <= 02:00
            if ($now >= $startTime || $now <= $endTime) {
                return true;
            }
        } else {
            // Normal same-day event
            if ($now >= $startTime && $now <= $endTime) {
                return true;
            }
        }

        return false;
    }


    private function isEventActive(array $event, DateTime $now): bool
    {
        return $this->isDateInRange($event, $now) &&
               $this->isDayActive($event, $now) &&
               $this->isTimeActive($event, $now);
    }

    public function getContext(): array
    {
        $now = new DateTime('now', $this->timezone);
        $activeEvents = [];

        foreach ($this->events as $event) {
            if ($this->isEventActive($event, $now)) {
                $activeEvents[] = $event;
            }
        }

        if (empty($activeEvents)) {
            return ['active_event' => null];
        }

        // Sort by priority (higher is better)
        usort($activeEvents, function ($a, $b) {
            return ($b['priority'] ?? 0) <=> ($a['priority'] ?? 0);
        });

        return ['active_event' => $activeEvents[0]];
    }

    /**
     * Calcula una agenda de todas las instancias de eventos que ocurrirán
     * desde ahora hasta un punto futuro determinado.
     *
     * @param DateTime $until La fecha y hora hasta la cual buscar eventos.
     * @return array Una lista de eventos con sus tiempos de inicio y fin exactos.
     */
    public function getEventsAgenda(\DateTime $until): array
    {
        $agenda = [];
        $now = new \DateTime('now', $this->timezone);
        $interval = new \DateInterval('P1D'); // Intervalo de 1 día para iterar
        $period = new \DatePeriod($now, $interval, $until);

        // Iteramos por cada día en el rango solicitado
        foreach ($period as $day) {
            foreach ($this->events as $event) {
                // Comprobamos si el evento es válido para este día en particular
                // (Ignoramos la hora por ahora, solo nos importa la fecha y el día de la semana)
                if ($this->isDateInRange($event, $day) && $this->isDayActive($event, $day)) {
                    
                    if (empty($event['start_time']) || empty($event['end_time'])) {
                        continue; // El evento no está basado en tiempo, lo ignoramos para la agenda
                    }

                    // Construimos las fechas de inicio y fin exactas para ESE día
                    $eventStartDateTime = (clone $day)->setTime(
                        (int)substr($event['start_time'], 0, 2),
                        (int)substr($event['start_time'], 3, 2)
                    );

                    $eventEndDateTime = (clone $day)->setTime(
                        (int)substr($event['end_time'], 0, 2),
                        (int)substr($event['end_time'], 3, 2)
                    );
                    
                    // Si el horario cruza la medianoche, sumamos un día a la fecha de finalización
                    if ($eventStartDateTime > $eventEndDateTime) {
                        $eventEndDateTime->add(new \DateInterval('P1D'));
                    }

                    // Solo añadimos el evento a la agenda si su fin es en el futuro
                    // y su inicio está dentro de nuestra ventana de búsqueda.
                    if ($eventEndDateTime > $now && $eventStartDateTime < $until) {
                        $agenda[] = [
                            'id' => $event['id'],
                            'event_details' => $event,
                            // Devolvemos los tiempos en formato ISO 8601, que es universal para JavaScript
                            'start_iso' => $eventStartDateTime->format(\DateTime::ISO8601),
                            'end_iso' => $eventEndDateTime->format(\DateTime::ISO8601),
                        ];
                    }
                }
            }
        }
        
        // Ordenamos la agenda por fecha de inicio
        usort($agenda, function ($a, $b) {
            return strtotime($a['start_iso']) - strtotime($b['start_iso']);
        });

        return $agenda;
    }
}