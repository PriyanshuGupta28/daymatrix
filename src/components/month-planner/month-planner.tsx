"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInMinutes,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isToday,
  isWithinInterval,
  max,
  min,
  parseISO,
  startOfDay,
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

interface FiltersState {
  categories: Set<TaskCategory>;
  timeWindowWeeks: 0 | 1 | 2 | 3; // 0 = all
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

  const [filters, setFilters] = useState<FiltersState>({
    categories: new Set<TaskCategory>(),
    timeWindowWeeks: 0,
    search: "",
  });

  const { containerRef, rects } = useMonthRects();
  const isDraggingCreate = dragStartIdx !== null && dragEndIdx !== null;

  const filteredTasks = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const endLimit = filters.timeWindowWeeks
      ? addDays(new Date(), filters.timeWindowWeeks * 7)
      : null;

    return tasks.filter((t) => {
      if (filters.categories.size && !filters.categories.has(t.category))
        return false;
      if (term && !t.name.toLowerCase().includes(term)) return false;
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
    setDraftHours(8);
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

  const tasksByDay = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const t of filteredTasks) {
      let cur = parseISO(t.start);
      const last = parseISO(t.end);
      while (!isAfter(cur, last)) {
        const k = iso(cur);
        (map[k] ||= []).push(t);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [filteredTasks]);

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
            className="grid grid-cols-7 gap-2 select-none"
            onPointerMove={onMoveCreate}
            onPointerUp={endDragCreate}
          >
            {days.map((d, idx) => {
              const dayTasks = tasksByDay[d.iso] || [];
              return (
                <div
                  key={d.iso + idx}
                  data-cell-index={idx}
                  onPointerDown={startDragCreate(idx)}
                  className={cn(
                    `rounded-md border p-1 relative max-h-[150px] min-h-[110px] overflow-y-auto ${
                      d.inCurrentMonth ? "bg-card" : "bg-muted/40"
                    } ${isIdxInSelection(idx) ? "ring-2 ring-primary" : ""}`,
                    isToday(d.date) && "bg-primary/10 text-primary-foreground",
                    "hover:bg-blue-300/10 hover:text-primary-foreground"
                  )}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(d.date, "d")}</span>
                    <span className="capitalize">{format(d.date, "MMM")}</span>
                  </div>

                  {/* Container for 24-hour background + tasks with scroll */}
                  <div className="mt-1 flex flex-col gap-[1px] max-h-[200px] overflow-y-auto relative">
                    {/* Tasks overlays */}
                    <div
                      className="relative z-10 grid gap-[1px]"
                      //   style={{
                      //     gridTemplateRows: "repeat(24, minmax(0, 1fr))",
                      //   }}
                    >
                      {dayTasks.map((t) => {
                        const isStart = t.start === d.iso;
                        const isEnd = t.end === d.iso;
                        return (
                          <div
                            key={t.id}
                            onPointerDown={startDragTask(t, idx)}
                            className={cn(
                              `relative group overflow-hidden border px-2 py-1 text-xs cursor-grab active:cursor-grabbing bg-accent text-accent-foreground ${
                                isStart ? "rounded-l-md" : ""
                              } ${isEnd ? "rounded-r-md" : ""}`,
                              t.category === "Completed"
                                ? "bg-green-500/10"
                                : t.category === "Review"
                                ? "bg-purple-500/10"
                                : t.category === "In Progress"
                                ? "bg-yellow-500/10"
                                : "bg-blue-500/10"
                            )}
                            // style={{
                            //   gridRow: `span ${Math.max(
                            //     1,
                            //     Math.min(24, t.dailyHours)
                            //   )} / span ${Math.max(
                            //     1,
                            //     Math.min(24, t.dailyHours)
                            //   )}`,
                            // }}
                            aria-label={`${t.name} • ${t.category}`}
                            title={`${t.name} • ${t.category} • ${t.dailyHours}h/day`}
                            data-task-id={t.id}
                            onClick={() => startEdit(t)}
                          >
                            {/* Task content and resize handles */}
                            <div className="flex flex-col items-start justify-between">
                              <span className="truncate">{t.name}</span>
                              <span>
                                {format(parseISO(t.start), "dd MMM")} -{" "}
                                {format(parseISO(t.end), "dd MMM")}
                              </span>
                              <span className="ml-2 rounded bg-secondary/60 px-1 text-[10px] whitespace-nowrap">
                                {t.category}
                              </span>
                            </div>
                            {isStart && (
                              <div
                                onPointerDown={startResize(t.id, "left")}
                                className={cn(
                                  "absolute left-0 top-0 h-full w-1 bg-primary/70 cursor-ew-resize",
                                  t.category === "Completed"
                                    ? "bg-green-500"
                                    : t.category === "Review"
                                    ? "bg-purple-500"
                                    : t.category === "In Progress"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                                )}
                                role="slider"
                                aria-valuenow={t.dailyHours}
                                aria-label="Resize start"
                              />
                            )}
                            {isEnd && (
                              <div
                                onPointerDown={startResize(t.id, "right")}
                                className={cn(
                                  "absolute right-0 top-0 h-full w-1 bg-primary/70 cursor-ew-resize",
                                  t.category === "Completed"
                                    ? "bg-green-500"
                                    : t.category === "Review"
                                    ? "bg-purple-500"
                                    : t.category === "In Progress"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                                )}
                                role="slider"
                                aria-valuenow={t.dailyHours}
                                aria-label="Resize end"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
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
