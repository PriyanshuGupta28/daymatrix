import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export interface MonthDayCell {
  date: Date;
  iso: string; // YYYY-MM-DD
  inCurrentMonth: boolean;
}

export type TaskCategory = "To Do" | "In Progress" | "Review" | "Completed";

export interface TaskItem {
  id: string;
  name: string;
  category: TaskCategory;
  start: string; // ISO date (YYYY-MM-DD)
  end: string; // ISO date (YYYY-MM-DD) inclusive
  dailyHours: number; // 1..24
}

export function buildMonthGrid(currentMonth: Date): MonthDayCell[] {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }); // Sunday
  const days: MonthDayCell[] = [];
  const end = endOfMonth(currentMonth);

  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    days.push({
      date: d,
      iso: format(d, "yyyy-MM-dd"),
      inCurrentMonth: isSameMonth(d, end),
    });
  }
  return days;
}

export function iso(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function clampHours(h: number) {
  return Math.min(24, Math.max(1, Math.round(h)));
}

export function daysBetweenInclusive(startIso: string, endIso: string) {
  const startDate = new Date(startIso + "T00:00:00");
  const endDate = new Date(endIso + "T00:00:00");
  return Math.abs(differenceInCalendarDays(endDate, startDate)) + 1;
}
