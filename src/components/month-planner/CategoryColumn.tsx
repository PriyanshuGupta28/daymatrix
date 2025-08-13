"use client";

import { useState, useRef, useEffect } from "react";
import { useDrop } from "react-dnd";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TaskCategory, TaskItem } from "./TodoBoard";
import TaskCard from "./task-card";

const ItemTypes = { TASK: "task" };

export default function CategoryColumn({
  category,
  tasks,
  onDropTask,
}: {
  category: TaskCategory;
  tasks: TaskItem[];
  onDropTask: (
    taskId: string,
    newCategory: TaskCategory,
    index: number
  ) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const taskRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    taskRefs.current = taskRefs.current.slice(0, tasks.length);
  }, [tasks]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string }, monitor) => {
      const originalIndex = tasks.findIndex((t) => t.id === item.id);
      let adjustedIndex = hoverIndex;

      // Adjust index if moving within same column
      if (originalIndex !== -1 && originalIndex < adjustedIndex) {
        adjustedIndex--;
      }

      onDropTask(item.id, category, adjustedIndex);
      setHoverIndex(-1);
    },
    hover: (item: { id: string }, monitor) => {
      if (!contentRef.current) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const contentRect = contentRef.current.getBoundingClientRect();
      const relativeY = clientOffset.y - contentRect.top;
      const headerHeight = 57; // Approximate header height
      const scrollOffset = contentRef.current.scrollTop;
      const adjustedY = relativeY + scrollOffset - headerHeight;

      let newHoverIndex = tasks.length;

      // Find hover position relative to tasks
      for (let i = 0; i < taskRefs.current.length; i++) {
        const taskEl = taskRefs.current[i];
        if (!taskEl) continue;

        const taskRect = taskEl.getBoundingClientRect();
        const taskTop =
          taskRect.top - contentRect.top + scrollOffset - headerHeight;
        const taskMiddle = taskTop + taskRect.height / 2;

        if (adjustedY < taskMiddle) {
          newHoverIndex = i;
          break;
        }
      }

      setHoverIndex(newHoverIndex);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <Card className={cn("bg-muted min-h-[300px] flex flex-col")}>
      <CardHeader>
        <CardTitle>{category}</CardTitle>
      </CardHeader>
      <CardContent
        ref={(node) => {
          drop(node);
          contentRef.current = node;
        }}
        className={cn(
          "flex-1 space-y-2 transition-colors relative overflow-y-auto",
          isOver && "bg-primary/10"
        )}
      >
        {tasks.map((task, index) => (
          <div
            key={task.id}
            ref={(el) => (taskRefs.current[index] = el)}
            className="relative"
          >
            {hoverIndex === index && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 z-10 rounded-full" />
            )}
            <TaskCard task={task} />
          </div>
        ))}

        {hoverIndex === tasks.length && (
          <div className="h-1 bg-blue-500 rounded-full" />
        )}
      </CardContent>
    </Card>
  );
}
