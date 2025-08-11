"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DateSelectArg,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core/index.js";
import { format } from "date-fns";

type CategoryValue = "todo" | "in-progress" | "review" | "completed";

const categories: { label: string; value: CategoryValue; color: string }[] = [
  { label: "To Do", value: "todo", color: "bg-blue-500" },
  { label: "In Progress", value: "in-progress", color: "bg-yellow-500" },
  { label: "Review", value: "review", color: "bg-purple-500" },
  { label: "Completed", value: "completed", color: "bg-green-500" },
];

const timeFilters = [
  { label: "Tasks within 1 week", value: "1w" },
  { label: "Tasks within 2 weeks", value: "2w" },
  { label: "Tasks within 3 weeks", value: "3w" },
];

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [events, setEvents] = useState<EventInput[]>([]);

  const updateEvents = (newEvents: EventInput[]) => {
    setEvents(newEvents);
    localStorage.setItem("calendarEvents", JSON.stringify(newEvents));
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState("");
  const [category, setCategory] = useState<CategoryValue | "">("");
  const [filters, setFilters] = useState<CategoryValue[]>([]);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("");

  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [isToday, setIsToday] = useState(true);

  // Load events from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("calendarEvents");
    if (stored) {
      updateEvents(JSON.parse(stored));
    }
  }, []);

  // Save events to localStorage on change
  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      const matchesCategory =
        filters.length === 0 || filters.includes(e.extendedProps?.category);

      const matchesSearch =
        search.trim() === "" ||
        e?.title?.toLowerCase().includes(search.toLowerCase());

      const matchesTime = (() => {
        if (!timeFilter) return true;
        const endDate = new Date((e.end ?? e.start) as string | number | Date);
        const diffDays =
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (timeFilter === "1w") return diffDays <= 7;
        if (timeFilter === "2w") return diffDays <= 14;
        if (timeFilter === "3w") return diffDays <= 21;
        return true;
      })();

      return matchesCategory && matchesSearch && matchesTime;
    });
  }, [events, filters, search, timeFilter]);

  const handleDateSelect = (info: DateSelectArg) => {
    setSelectedDates({ start: info.startStr, end: info.endStr });
    setTaskName("");
    setCategory("");
    setEditingEventId(null);
    setModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedDates({
      start: event.startStr,
      end: event.endStr,
    });
    setTaskName(event.title);
    setCategory(event.extendedProps.category);
    setEditingEventId(event.id);
    setModalOpen(true);
  };

  const handleEventResizeOrDrop = (changeInfo: EventChangeArg) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === changeInfo.event.id
          ? {
              ...ev,
              start: changeInfo.event.startStr,
              end: changeInfo.event.endStr,
            }
          : ev
      )
    );
  };

  const saveTask = () => {
    if (!taskName || !category || !selectedDates) return;

    if (editingEventId) {
      // Update existing event
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEventId
            ? {
                ...e,
                title: taskName,
                start: selectedDates.start,
                end: selectedDates.end,
                classNames:
                  categories.find((c) => c.value === category)?.color || "",
                extendedProps: { category },
              }
            : e
        )
      );
    } else {
      // Add new event
      setEvents((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          title: taskName,
          start: selectedDates.start,
          end: selectedDates.end,
          display: "block",
          classNames: categories.find((c) => c.value === category)?.color || "",
          extendedProps: { category },
        },
      ]);
    }
    setModalOpen(false);
  };

  const deleteTask = () => {
    if (!editingEventId) return;
    setEvents((prev) => prev.filter((e) => e.id !== editingEventId));
    setModalOpen(false);
  };

  // Toolbar controls
  const goToPrev = () => {
    calendarRef.current?.getApi().prev();
    updateTodayState();
  };
  const goToNext = () => {
    calendarRef.current?.getApi().next();
    updateTodayState();
  };
  const goToToday = () => {
    calendarRef.current?.getApi().today();
    updateTodayState();
  };
  const changeView = (view: string) => {
    calendarRef.current?.getApi().changeView(view);
    setCurrentView(view);
    updateTodayState();
  };

  const updateTodayState = () => {
    const cal = calendarRef.current?.getApi();
    if (!cal) return;
    const today = new Date();
    const currentStart = cal.view.currentStart;
    setIsToday(
      today.getFullYear() === currentStart.getFullYear() &&
        today.getMonth() === currentStart.getMonth() &&
        today.getDate() === currentStart.getDate()
    );
  };
  // Map category to color class
  const categoryColors: Record<string, string> = {
    todo: "bg-blue-500 text-white",
    "in-progress": "bg-yellow-500 text-black",
    review: "bg-purple-500 text-white",
    completed: "bg-green-500 text-white",
  };

  // Customize event rendering
  const renderEventContent = (eventInfo: EventContentArg) => {
    const cat = eventInfo.event.extendedProps.category;
    const colorClass = categoryColors[cat] || "bg-gray-400 text-black";

    const start = eventInfo.event.start
      ? format(eventInfo.event.start, "MMM d, yyyy h:mm a")
      : "";
    const end = eventInfo.event.end
      ? format(eventInfo.event.end, "MMM d, yyyy h:mm a")
      : "";
    return (
      <div
        className={`px-1 py-0.5 rounded text-xs ${colorClass}`}
        style={{ whiteSpace: "normal" }}
      >
        <div className="font-semibold">{eventInfo.event.title}</div>
        <div className="font-semibold">
          {start && (
            <div className="text-[10px] font-medium">
              {start} {end ? `– ${end}` : ""}
            </div>
          )}
        </div>

        <div className="opacity-80">{cat ? cat.replace("-", " ") : ""}</div>
      </div>
    );
  };

  const resetFilters = () => {
    setSearch("");
    setFilters([]);
    setTimeFilter("");
  };

  useEffect(() => {
    updateTodayState();
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Filter & Search Panel */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        {categories.map((cat) => (
          <label key={cat.value} className="flex items-center gap-2">
            <Checkbox
              checked={filters.includes(cat.value)}
              onCheckedChange={(checked) => {
                setFilters((prev) =>
                  checked
                    ? [...prev, cat.value]
                    : prev.filter((f) => f !== cat.value)
                );
              }}
            />
            <span>{cat.label}</span>
          </label>
        ))}

        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Time filter" />
          </SelectTrigger>
          <SelectContent>
            {timeFilters.map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={resetFilters}>Reset filters</Button>
      </div>

      <div className="flex justify-between">
        <h1 className="text-2xl">{calendarRef.current?.getApi().view.title}</h1>
        {/* Custom Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={goToPrev} variant="outline">
            Prev
          </Button>
          <Button onClick={goToToday} variant={isToday ? "default" : "outline"}>
            Today
          </Button>
          <Button onClick={goToNext} variant="outline">
            Next
          </Button>
          <div className="ml-4 flex gap-2">
            <Button
              onClick={() => changeView("dayGridMonth")}
              variant={currentView === "dayGridMonth" ? "default" : "outline"}
            >
              Month
            </Button>
            <Button
              onClick={() => changeView("timeGridWeek")}
              variant={currentView === "timeGridWeek" ? "default" : "outline"}
            >
              Week
            </Button>
            <Button
              onClick={() => changeView("timeGridDay")}
              variant={currentView === "timeGridDay" ? "default" : "outline"}
            >
              Day
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={false}
        initialView="dayGridMonth"
        selectable
        editable
        eventResizableFromStart
        selectMirror
        events={filteredEvents}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventResizeOrDrop}
        eventResize={handleEventResizeOrDrop}
        height="700px"
        eventContent={renderEventContent}
        datesSet={(arg) => {
          setCurrentView(arg.view.type);
          updateTodayState();
        }}
        dayHeaderClassNames={"bg-primary text-primary-foreground"}
      />

      {/* Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEventId ? "Edit Task" : "New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
            <Select
              value={category}
              onValueChange={(v: CategoryValue) => setCategory(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-between">
              <Button onClick={saveTask}>
                {editingEventId ? "Update Task" : "Save Task"}
              </Button>
              {editingEventId && (
                <Button variant="destructive" onClick={deleteTask}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
