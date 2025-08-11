"use client";

import React, { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";

const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<EventInput[]>([
    { id: "1", title: "Demo Event", start: new Date().toISOString() },
  ]);
  const [currentView, setCurrentView] = useState("dayGridMonth");

  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    // Set initial view after mount
    if (calendarRef.current) {
      setCurrentView(calendarRef.current.getApi().view.type);
    }
  }, []);

  const changeView = (viewName: string) => {
    calendarRef.current?.getApi().changeView(viewName);
    setCurrentView(viewName);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt("Event title:");
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    if (title) {
      setEvents((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          title,
          start: selectInfo.startStr,
          end: selectInfo.endStr ?? undefined,
          allDay: selectInfo.allDay,
        },
      ]);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (confirm(`Delete event '${clickInfo.event.title}'?`)) {
      setEvents((prev) => prev.filter((e) => e.id !== clickInfo.event.id));
    }
  };

  return (
    <div className="w-full bg-background text-foreground rounded-lg border shadow-sm">
      {/* Custom Toolbar */}

      <div className="flex flex-col gap-3 p-4 border-b bg-background sm:flex-row sm:items-center sm:justify-between">
        {/* Left Controls */}

        <div className="flex items-center gap-2 order-2 sm:order-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => calendarRef.current?.getApi().prev()}
            className="cursor-pointer"
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => calendarRef.current?.getApi().today()}
            className="cursor-pointer"
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => calendarRef.current?.getApi().next()}
            className="cursor-pointer"
          >
            Next
          </Button>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-center order-1 sm:order-2">
          {calendarRef.current?.getApi().view?.title || "Calendar"}
        </h2>

        {/* View Switcher */}
        <div className="flex items-center gap-2 order-3">
          <Button
            variant={currentView === "dayGridMonth" ? "default" : "secondary"}
            size="sm"
            onClick={() => changeView("dayGridMonth")}
            className="cursor-pointer"
          >
            Month
          </Button>
          <Button
            variant={currentView === "timeGridWeek" ? "default" : "secondary"}
            size="sm"
            onClick={() => changeView("timeGridWeek")}
            className="cursor-pointer"
          >
            Week
          </Button>
          <Button
            variant={currentView === "timeGridDay" ? "default" : "secondary"}
            size="sm"
            onClick={() => changeView("timeGridDay")}
            className="cursor-pointer"
          >
            Day
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          selectable
          selectMirror
          select={handleDateSelect}
          events={events}
          eventClick={handleEventClick}
          editable
          dayMaxEvents={3}
          height="700px"
          viewClassNames="bg-background text-foreground transition-colors"
          dayHeaderClassNames="text-lg font-semibold text-foreground"
          allDayClassNames="bg-primary text-primary-foreground"
          eventClassNames="bg-secondary text-secondary-foreground rounded-md px-1"
          slotLabelClassNames="text-muted-foreground"
          moreLinkClassNames="text-primary hover:underline"
        />
      </div>
    </div>
  );
};

export default CalendarView;
