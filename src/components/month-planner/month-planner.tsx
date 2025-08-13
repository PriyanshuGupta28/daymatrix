"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  buildMonthGrid,
  TaskCategory,
  TaskItem,
  clampHours,
  daysBetweenInclusive,
  iso,
} from "./types-and-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TodoBoard from "./TodoBoard";

interface FiltersState {
  categories: Set<TaskCategory>;
  timeWindowWeeks: 0 | 1 | 2 | 3;
  search: string;
}

const CATEGORIES: TaskCategory[] = [
  "To Do",
  "In Progress",
  "Review",
  "Completed",
];

function useMonthRects() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rects, setRects] = useState<DOMRect[]>([]);

  const measure = () => {
    if (!containerRef.current) return;
    const cells =
      containerRef.current.querySelectorAll<HTMLElement>("[data-cell-index]");
    const list: DOMRect[] = [];
    cells.forEach((el) => list.push(el.getBoundingClientRect()));
    setRects(list);
  };

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { containerRef, rects, measure };
}
const LOCAL_STORAGE_KEY = "monthTaskPlannerTasks";
export default function MonthPlanner() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const days = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Selection for creating new task
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<TaskCategory>("To Do");
  const [draftHours, setDraftHours] = useState<number>(24);

  const refs = useRef<Record<string, HTMLDivElement | null>>(null);

  const [filters, setFilters] = useState<FiltersState>({
    categories: new Set<TaskCategory>(),
    timeWindowWeeks: 0,
    search: "",
  });

  const { containerRef, rects } = useMonthRects();
  const isDraggingCreate = dragStartIdx !== null && dragEndIdx !== null;

  const filteredTasks = useMemo(() => {
    const term = filters.search.trim().toLowerCase()[0];
    const endLimit = filters.timeWindowWeeks
      ? addDays(new Date(), filters.timeWindowWeeks * 7)
      : null;

    return tasks.filter((t) => {
      if (filters.categories.size && !filters.categories.has(t.category))
        return false;
      if (term && !t.name.toLowerCase()[0].includes(term)) return false;
      if (endLimit) {
        const tStart = parseISO(t.start);
        const tEnd = parseISO(t.end);
        const interval = { start: new Date(), end: endLimit };
        const overlaps =
          isWithinInterval(tStart, interval) ||
          isWithinInterval(tEnd, interval) ||
          (isBefore(interval.start, tStart) && isAfter(interval.end, tEnd));
        if (!overlaps) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // handle quota exceeded or errors silently
    }
  }, [tasks]);

  const resetDraft = () => {
    setDraftName("");
    setDraftCategory("To Do");
    setDraftHours(24);
  };

  const startDragCreate = (idx: number) => (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragStartIdx(idx);
    setDragEndIdx(idx);
  };

  const onMoveCreate = (e: React.PointerEvent) => {
    if (dragStartIdx === null) return;
    // find cell by pointer
    const x = e.clientX;
    const y = e.clientY;
    let hoverIdx = null as number | null;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        hoverIdx = i;
        break;
      }
    }
    if (hoverIdx !== null) setDragEndIdx(hoverIdx);
  };

  const endDragCreate = () => {
    if (dragStartIdx === null || dragEndIdx === null) return;
    setShowDialog(true);
  };

  const onConfirmDialog = () => {
    if (editTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editTaskId
            ? {
                ...t,
                name: draftName || "Untitled Task",
                category: draftCategory,
                dailyHours: clampHours(draftHours),
              }
            : t
        )
      );
      setShowDialog(false);
      setEditTaskId(null);
      resetDraft();
      toast("Task updated", {
        description: draftName || "Untitled Task",
      });
      return;
    }
    if (dragStartIdx === null || dragEndIdx === null) return;
    const a = Math.min(dragStartIdx, dragEndIdx);
    const b = Math.max(dragStartIdx, dragEndIdx);
    const startISO = days[a].iso;
    const endISO = days[b].iso;
    const newTask: TaskItem = {
      id: Math.random().toString(36).slice(2),
      name: draftName || "Untitled Task",
      category: draftCategory,
      start: startISO,
      end: endISO,
      dailyHours: clampHours(draftHours),
    };
    setTasks((prev) => [...prev, newTask]);
    setShowDialog(false);
    setDragStartIdx(null);
    setDragEndIdx(null);
    resetDraft();
    toast("Task created", {
      description: `${newTask.name} • ${daysBetweenInclusive(
        newTask.start,
        newTask.end
      )} day(s)`,
    });
  };
  const onDeleteTask = () => {
    if (!editTaskId) return;
    setTasks((prev) => prev.filter((t) => t.id !== editTaskId));
    toast("Task deleted", {});
    setShowDialog(false);
    setEditTaskId(null);
    setDragStartIdx(null);
    setDragEndIdx(null);
    resetDraft();
  };
  // Move & Resize interactions
  const activeResizeRef = useRef<{
    taskId: string;
    side: "left" | "right";
  } | null>(null);
  const activeDragTaskRef = useRef<{
    taskId: string;
    anchorStartIso: string;
    pointerStartIdx: number;
    moved: boolean;
  } | null>(null);

  const onPointerMoveGlobal = (e: PointerEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    // Hit-test day index
    let idx: number | null = null;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        idx = i;
        break;
      }
    }
    if (idx === null) return;

    // Resize
    if (activeResizeRef.current) {
      const { taskId, side } = activeResizeRef.current;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const targetIso = days[idx!].iso;
          if (side === "left") {
            const newStart = targetIso <= t.end ? targetIso : t.end; // clamp
            return { ...t, start: newStart };
          } else {
            const newEnd = targetIso >= t.start ? targetIso : t.start;
            return { ...t, end: newEnd };
          }
        })
      );
      return;
    }

    // Drag move
    if (activeDragTaskRef.current) {
      const { taskId, anchorStartIso, pointerStartIdx } =
        activeDragTaskRef.current;
      activeDragTaskRef.current.moved = true;
      const delta = idx - pointerStartIdx;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const daysLen = daysBetweenInclusive(t.start, t.end);
          const newStartDate = addDays(parseISO(anchorStartIso), delta);
          const newStartIso = iso(newStartDate);
          const newEndIso = iso(addDays(newStartDate, daysLen - 1));
          return { ...t, start: newStartIso, end: newEndIso };
        })
      );
    }
  };

  const onPointerUpGlobal = () => {
    if (activeDragTaskRef.current) {
      const ref = activeDragTaskRef.current;
      if (!ref.moved) {
        const t = tasks.find((x) => x.id === ref.taskId);
        if (t) {
          setEditTaskId(t.id);
          setDraftName(t.name);
          setDraftCategory(t.category);
          setDraftHours(t.dailyHours);
          setShowDialog(true);
        }
      }
    }
    activeResizeRef.current = null;
    activeDragTaskRef.current = null;
  };

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMoveGlobal);
    window.addEventListener("pointerup", onPointerUpGlobal);
    return () => {
      window.removeEventListener("pointermove", onPointerMoveGlobal);
      window.removeEventListener("pointerup", onPointerUpGlobal);
    };
  }, [rects]);

  const startResize =
    (taskId: string, side: "left" | "right") => (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      activeResizeRef.current = { taskId, side };
    };

  const startDragTask =
    (task: TaskItem, pointerIdx: number) => (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      activeDragTaskRef.current = {
        taskId: task.id,
        anchorStartIso: task.start,
        pointerStartIdx: pointerIdx,
        moved: false,
      };
    };

  const startEdit = (task: TaskItem) => {
    setEditTaskId(task.id);
    setDraftName(task.name);
    setDraftCategory(task.category);
    setDraftHours(task.dailyHours);
    setShowDialog(true);
  };
  // Render helpers
  const goPrevMonth = () =>
    setCurrentMonth((m) => addDays(startOfMonthSafe(m), -1));
  const goNextMonth = () =>
    setCurrentMonth((m) => addDays(endOfMonthSafe(m), 1));
  const goToday = () => setCurrentMonth(new Date());

  function startOfMonthSafe(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function endOfMonthSafe(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  const weeksLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const isIdxInSelection = (idx: number) => {
    if (dragStartIdx === null || dragEndIdx === null) return false;
    const a = Math.min(dragStartIdx, dragEndIdx);
    const b = Math.max(dragStartIdx, dragEndIdx);
    return idx >= a && idx <= b;
  };

  const toggleCategory = (c: TaskCategory) => {
    setFilters((f) => {
      const next = new Set(f.categories);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return { ...f, categories: next };
    });
  };

  const resetFilters = () => {
    setFilters({ categories: new Set(), timeWindowWeeks: 0, search: "" });
  };

  // Map of taskId -> laneIndex (same for all days it spans)
  const taskLaneMap: Record<string, number> = {};

  // Sort tasks across all days by start time, then longest first
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const daysA =
      (new Date(a.end).getTime() - new Date(a.start).getTime()) /
      (1000 * 60 * 60 * 24);
    const daysB =
      (new Date(b.end).getTime() - new Date(b.start).getTime()) /
      (1000 * 60 * 60 * 24);

    // Sort longest first
    if (daysB !== daysA) return daysB - daysA;

    // If same duration, sort by start time
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  // Lane end times (for overlap detection)
  const laneEndTimes: Date[] = [];

  sortedTasks.forEach((task) => {
    let laneIndex = 0;
    while (
      laneIndex < laneEndTimes.length &&
      new Date(task.start) < laneEndTimes[laneIndex]
    ) {
      laneIndex++;
    }

    // Assign lane index to this task
    taskLaneMap[task.id] = laneIndex;

    // Update or add lane end time
    if (laneIndex === laneEndTimes.length) {
      laneEndTimes.push(new Date(task.end));
    } else {
      laneEndTimes[laneIndex] = new Date(task.end);
    }
  });
  // Utility: checks if two tasks overlap in any day
  // Process tasks with global lane assignment
  const processedTasks = useMemo(() => {
    // Sort tasks by start date and duration
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      const durA = differenceInDays(parseISO(a.end), parseISO(a.start));
      const durB = differenceInDays(parseISO(b.end), parseISO(b.start));
      if (durB !== durA) return durB - durA;
      return parseISO(a.start).getTime() - parseISO(b.start).getTime();
    });

    // Global lanes for consistent positioning
    const globalLanes: TaskItem[][] = [];
    const taskLaneMap = new Map();

    filteredTasks.forEach((task) => {
      const taskStart = parseISO(task.start);
      const taskEnd = parseISO(task.end);

      // Find first available lane
      let laneIndex = 0;
      let foundLane = false;

      while (laneIndex < globalLanes.length) {
        const canUseLane = !globalLanes[laneIndex].some((existing) => {
          const existingStart = parseISO(existing.start);
          const existingEnd = parseISO(existing.end);

          // Check for overlap
          return !(
            taskEnd < existingStart ||
            taskStart > existingEnd ||
            (taskEnd.getTime() === taskStart.getTime() &&
              existingEnd.getTime() === existingStart.getTime())
          );
        });

        if (canUseLane) {
          foundLane = true;
          break;
        }
        laneIndex++;
      }

      // Create new lane if needed
      if (!foundLane) {
        globalLanes.push([]);
      }

      // Add task to lane
      globalLanes[laneIndex].push(task);
      taskLaneMap.set(task.id, laneIndex);
    });

    return { taskLaneMap, totalLanes: globalLanes.length };
  }, [filteredTasks]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: { [key: string]: TaskItem[] } = {};

    filteredTasks.forEach((task) => {
      const taskStart = parseISO(task.start);
      const taskEnd = parseISO(task.end);

      days.forEach((day) => {
        if (
          (isSameDay(day.date, taskStart) || isAfter(day.date, taskStart)) &&
          (isSameDay(day.date, taskEnd) || isBefore(day.date, taskEnd))
        ) {
          if (!grouped[day.iso]) {
            grouped[day.iso] = [];
          }
          grouped[day.iso].push(task);
        }
      });
    });

    return grouped;
  }, [filteredTasks, days]);
  const getTaskColor = (category: TaskCategory) => {
    switch (category) {
      case "Completed":
        return "bg-green-500/50 border-green-500";
      case "Review":
        return "bg-purple-500/50 border-purple-500";
      case "In Progress":
        return "bg-yellow-500/50 border-purple-500";
      default:
        return "bg-blue-500/50 border-blue-500";
    }
  };
  return (
    <div className="w-full">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Month Task Planner
        </h1>
        <p className="text-muted-foreground">
          Drag to create, move to reschedule, stretch to resize.
        </p>
      </header>
      <TodoBoard setTasks={setTasks} tasks={tasks} />

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={goToday}>
          Today
        </Button>
        <Button variant="outline" onClick={goPrevMonth}>
          Prev
        </Button>
        <Button variant="outline" onClick={goNextMonth}>
          Next
        </Button>
        <h2 className="text-lg md:text-xl font-semibold" aria-live="polite">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            aria-label="Search tasks by name"
          />
        </div>
      </section>

      <section className="mb-6 grid grid-cols-4 md:grid-cols-6 gap-4">
        <div className="col-span-4 md:col-span-4">
          <div className="mb-2 grid grid-cols-7 text-sm text-muted-foreground">
            {weeksLabels.map((w) => (
              <div key={w} className="py-1 text-center">
                {w}
              </div>
            ))}
          </div>

          <div
            ref={containerRef}
            className="grid grid-cols-7 select-none gap-0 border-l border-t border-gray-300"
            onPointerMove={onMoveCreate}
            onPointerUp={endDragCreate}
          >
            {days.map((d, idx) => {
              const dayTasks = tasksByDay[d.iso] || [];
              const { taskLaneMap, totalLanes } = processedTasks;

              // Calculate min height based on total lanes
              const minHeight = Math.max(110, 50 + totalLanes * 35);

              return (
                <div
                  key={d.iso}
                  data-cell-index={idx}
                  onPointerDown={startDragCreate(idx)}
                  className={cn(
                    "border-r border-b border-gray-300 relative",
                    d.inCurrentMonth ? "bg-white" : "bg-gray-100",
                    isIdxInSelection(idx) ? "ring-2 ring-blue-500" : "",
                    isToday(d.date) && "bg-blue-50",
                    "hover:bg-blue-50 transition-colors max-h-full"
                  )}
                  style={{ minHeight: `${minHeight}px` }}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between text-xs text-gray-600 p-2 border-b border-gray-200">
                    <span className="font-semibold text-base">
                      {format(d.date, "d")}
                    </span>
                    <span className="capitalize text-gray-500">
                      {format(d.date, "MMM")}
                    </span>
                  </div>

                  {/* Tasks container */}
                  <div
                    className="relative p-1"
                    style={{ minHeight: `${totalLanes * 35 + 10}px` }}
                  >
                    {dayTasks.map((task) => {
                      const isStart = isSameDay(parseISO(task.start), d.date);
                      const isEnd = isSameDay(parseISO(task.end), d.date);
                      const laneIndex = taskLaneMap.get(task.id);

                      return (
                        <div
                          key={`${task.id}-${d.iso}`}
                          className="absolute"
                          style={{
                            top: `${laneIndex * 35 + 5}px`,
                            left: isStart ? "4px" : "0px",
                            right: isEnd ? "4px" : "0px",
                            height: "30px",
                            zIndex: 10 + laneIndex,
                          }}
                        >
                          <div
                            onPointerDown={startDragTask(task, idx)}
                            ref={(el) => {
                              if (el && refs.current) {
                                refs.current[`${task.id}-${d.iso}`] = el;
                              }
                            }}
                            className={cn(
                              "w-full h-full group overflow-hidden border-2 px-2 py-1 text-xs cursor-grab active:cursor-grabbing",
                              getTaskColor(task.category),
                              isStart ? "rounded-l-md" : "border-l-0 ml-0",
                              isEnd ? "rounded-r-md" : "border-r-0 mr-0",
                              "hover:z-20 hover:shadow-lg transition-all"
                            )}
                            title={`${task.name} • ${task.category} • ${task.dailyHours}h/day`}
                            onClick={() => startEdit(task)}
                          >
                            <div className="flex items-center h-full">
                              {isStart ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold truncate text-gray-800">
                                    {task.name}
                                  </span>
                                  <span className="text-[10px] bg-white/80 px-1 rounded whitespace-nowrap">
                                    {task.category}
                                  </span>
                                </div>
                              ) : (
                                <span className="opacity-80 truncate text-[11px] text-gray-700 hidden">
                                  {task.name} (cont.)
                                </span>
                              )}
                            </div>

                            {/* Resize handles */}
                            {isStart && (
                              <div
                                onPointerDown={startResize(task.id, "left")}
                                className="absolute left-0 top-0 h-full w-2 bg-blue-600 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            )}
                            {isEnd && (
                              <div
                                onPointerDown={startResize(task.id, "right")}
                                className="absolute right-0 top-0 h-full w-2 bg-blue-600 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters Panel */}
        <aside className="col-span-4 md:col-span-2 rounded-lg border p-4 h-fit">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.categories.has(c)}
                      onCheckedChange={() => toggleCategory(c)}
                      aria-label={`Filter ${c}`}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Time Window</Label>
              <RadioGroup
                value={String(filters.timeWindowWeeks)}
                onValueChange={(v) =>
                  setFilters((f) => ({
                    ...f,
                    timeWindowWeeks: Number(v) as 0 | 1 | 2 | 3,
                  }))
                }
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="0" id="tw-0" />
                  <Label htmlFor="tw-0">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="tw-1" />
                  <Label htmlFor="tw-1">Within 1 week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="tw-2" />
                  <Label htmlFor="tw-2">Within 2 weeks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="tw-3" />
                  <Label htmlFor="tw-3">Within 3 weeks</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Button onClick={() => resetFilters()}>Reset Filters</Button>
            </div>
          </div>
        </aside>
      </section>

      <Dialog
        open={showDialog}
        onOpenChange={(o) => {
          setShowDialog(o);
          if (!o) {
            setEditTaskId(null);
            setDragStartIdx(null);
            setDragEndIdx(null);
            resetDraft();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTaskId ? "Edit Task" : "Create Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="task-name">Task name</Label>
              <Input
                id="task-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Enter task name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={draftCategory}
                onValueChange={(v) => setDraftCategory(v as TaskCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hours">Daily hours</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={24}
                value={draftHours}
                onChange={(e) =>
                  setDraftHours(clampHours(Number(e.target.value || 1)))
                }
              />
            </div>
            {!editTaskId && isDraggingCreate && (
              <p className="text-sm text-muted-foreground">
                Selected range: {days[Math.min(dragStartIdx!, dragEndIdx!)].iso}{" "}
                → {days[Math.max(dragStartIdx!, dragEndIdx!)].iso}
              </p>
            )}
            {editTaskId && (
              <p className="text-sm text-muted-foreground">
                Task duration:{" "}
                {
                  days.find(
                    (day) =>
                      day.iso === tasks.find((t) => t.id === editTaskId)?.start
                  )?.iso
                }{" "}
                →{" "}
                {
                  days.find(
                    (day) =>
                      day.iso === tasks.find((t) => t.id === editTaskId)?.end
                  )?.iso
                }
              </p>
            )}
          </div>
          <DialogFooter>
            {editTaskId && (
              <Button
                variant="destructive"
                onClick={onDeleteTask}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setEditTaskId(null);
                setDragStartIdx(null);
                setDragEndIdx(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={onConfirmDialog}>
              {editTaskId ? "Save" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
