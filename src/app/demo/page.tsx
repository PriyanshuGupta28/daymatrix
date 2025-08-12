import CalendarView from "@/components/full-calendar/calendar-view";
import MonthPlanner from "@/components/month-planner/month-planner";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Demo | Daymatrix",
};
export default function Demo() {
  return (
    <>
      <section className="container py-6 mx-auto">
        <MonthPlanner />
      </section>
      <div className="mt-10 border-t py-5">
        <p className="text-3xl text-center">Calendar using FullCalendar.io</p>
        <CalendarView />
      </div>
    </>
  );
}
