import CalendarView from "@/components/full-calendar/calendar-view";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Demo | Daymatrix",
};
export default function Demo() {
  return (
    <>
      <CalendarView />
    </>
  );
}
