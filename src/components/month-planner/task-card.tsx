"use client";

import { useDrag } from "react-dnd";
import { cn } from "@/lib/utils";
import { TaskItem } from "./TodoBoard";

const ItemTypes = { TASK: "task" };

export default function TaskCard({ task }: { task: TaskItem }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={cn(
        "p-3 rounded-md bg-white shadow cursor-move",
        isDragging && "opacity-50"
      )}
    >
      <p className="font-medium">{task.name}</p>
      <p className="text-xs text-muted-foreground">
        {task.start} → {task.end}
      </p>
    </div>
  );
}
