<?php

class EventManager
{
    private array $events;
    private DateTimeZone $timezone;

    public function __construct(array $events)
    {
        $this->events = $events;
        $this->timezone = new DateTimeZone("America/Argentina/Buenos_Aires");
    }

    private function isDateInRange(array $event, DateTime $now): bool
    {
        $dateRange = $event["cuando"]["date_range"] ?? [];

        if (empty($dateRange["start"]) || empty($dateRange["end"])) {
            return true;
        }

        $startDate = DateTime::createFromFormat(
            "Y-m-d",
            $dateRange["start"],
            $this->timezone
        );
        $startDate->setTime(0, 0, 0);

        $endDate = DateTime::createFromFormat(
            "Y-m-d",
            $dateRange["end"],
            $this->timezone
        );
        $endDate->setTime(23, 59, 59);

        return $now >= $startDate && $now <= $endDate;
    }

    private function isDayActive(array $event, DateTime $now): bool
    {
        if (empty($event["cuando"]["active_on_days"])) {
            return true;
        }
        $currentDay = $now->format("N");
        return in_array($currentDay, $event["cuando"]["active_on_days"]);
    }

    private function isTimeActive(array $event, DateTime $now): bool
    {
        $timeRange = $event["cuando"]["time_range"] ?? [];

        if (empty($timeRange["start"]) || empty($timeRange["end"])) {
            return true;
        }

        $currentTime = DateTime::createFromFormat(
            "H:i:s",
            $now->format("H:i:s"),
            $this->timezone
        );
        $startTime = DateTime::createFromFormat(
            "H:i",
            $timeRange["start"],
            $this->timezone
        );
        $endTime = DateTime::createFromFormat(
            "H:i",
            $timeRange["end"],
            $this->timezone
        );

        if ($startTime > $endTime) {
            if ($currentTime >= $startTime || $currentTime <= $endTime) {
                return true;
            }
        } else {
            if ($currentTime >= $startTime && $currentTime <= $endTime) {
                return true;
            }
        }

        return false;
    }

    private function isEventActive(array $event, DateTime $now): bool
    {
        if (!isset($event["cuando"])) {
            return false;
        }
        return $this->isDateInRange($event, $now) &&
            $this->isDayActive($event, $now) &&
            $this->isTimeActive($event, $now);
    }

    public function getContext(): array
    {
        $now = new DateTime("now", $this->timezone);
        $activeEvents = [];

        foreach ($this->events as $event) {
            if ($this->isEventActive($event, $now)) {
                $activeEvents[] = $event;
            }
        }

        if (empty($activeEvents)) {
            return ["active_event" => null];
        }

        usort($activeEvents, function ($a, $b) {
            return ($b["prioridad"] ?? 0) <=> ($a["prioridad"] ?? 0);
        });

        return ["active_event" => $activeEvents[0]];
    }

    public function getEventsAgenda(\DateTime $until): array
    {
        $agenda = [];
        $now = new \DateTime("now", $this->timezone);
        $interval = new \DateInterval("P1D");
        $period = new \DatePeriod($now, $interval, $until);

        foreach ($period as $day) {
            foreach ($this->events as $event) {
                if (
                    $this->isDateInRange($event, $day) &&
                    $this->isDayActive($event, $day)
                ) {
                    $timeRange = $event["cuando"]["time_range"] ?? [];
                    if (
                        empty($timeRange["start"]) ||
                        empty($timeRange["end"])
                    ) {
                        continue;
                    }

                    $eventStartDateTime = (clone $day)->setTime(
                        (int) substr($timeRange["start"], 0, 2),
                        (int) substr($timeRange["start"], 3, 2)
                    );

                    $eventEndDateTime = (clone $day)->setTime(
                        (int) substr($timeRange["end"], 0, 2),
                        (int) substr($timeRange["end"], 3, 2)
                    );

                    if ($eventStartDateTime > $eventEndDateTime) {
                        $eventEndDateTime->add(new \DateInterval("P1D"));
                    }

                    if (
                        $eventEndDateTime > $now &&
                        $eventStartDateTime < $until
                    ) {
                        $agenda[] = [
                            "id" => $event["id"],
                            "event_details" => $event,
                            "start_iso" => $eventStartDateTime->format(
                                \DateTime::ISO8601
                            ),
                            "end_iso" => $eventEndDateTime->format(
                                \DateTime::ISO8601
                            ),
                        ];
                    }
                }
            }
        }

        usort($agenda, function ($a, $b) {
            return strtotime($a["start_iso"]) - strtotime($b["start_iso"]);
        });

        return $agenda;
    }
}
