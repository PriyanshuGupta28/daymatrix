"use client";

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
  onDropTask: (taskId: string, newCategory: TaskCategory) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string }) => {
      onDropTask(item.id, category);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <Card
      ref={drop}
      className={cn(
        "bg-muted min-h-[300px] flex flex-col transition-colors",
        isOver && "bg-primary/10"
      )}
    >
      <CardHeader>
        <CardTitle>{category}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </CardContent>
    </Card>
  );
}
