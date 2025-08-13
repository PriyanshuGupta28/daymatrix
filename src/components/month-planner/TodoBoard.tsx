"use client";

import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CategoryColumn from "./CategoryColumn";

export type TaskCategory = "To Do" | "In Progress" | "Review" | "Completed";

export interface TaskItem {
  id: string;
  name: string;
  category: TaskCategory;
  start: string;
  end: string;
  dailyHours: number;
}

const LOCAL_STORAGE_KEY = "monthTaskPlannerTasks";

type todoprops = {
  tasks: TaskItem[];
  setTasks: (tasks: TaskItem[]) => void;
};

export default function TodoBoard({ tasks, setTasks }: todoprops) {
  const categories: TaskCategory[] = [
    "To Do",
    "In Progress",
    "Review",
    "Completed",
  ];

  const handleDropTask = (taskId: string, newCategory: TaskCategory) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, category: newCategory } : task
      )
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {categories.map((category) => (
          <CategoryColumn
            key={category}
            category={category}
            tasks={tasks.filter((task) => task.category === category)}
            onDropTask={handleDropTask}
          />
        ))}
      </div>
    </DndProvider>
  );
}
