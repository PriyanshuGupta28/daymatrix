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

  const handleDropTask = (
    taskId: string,
    newCategory: TaskCategory,
    targetIndex: number
  ) => {
    setTasks((prev: TaskItem[]) => {
      // Find the task being moved
      const taskToMove = prev.find((task) => task.id === taskId);
      if (!taskToMove) return prev;

      // Filter out the moving task from the original array
      const filteredTasks = prev.filter((task) => task.id !== taskId);

      // Find all tasks in the target category
      const targetCategoryTasks = filteredTasks.filter(
        (task) => task.category === newCategory
      );

      // Insert the task at the correct position
      const before = targetCategoryTasks.slice(0, targetIndex);
      const after = targetCategoryTasks.slice(targetIndex);

      const newTasks = [
        ...filteredTasks.filter((task) => task.category !== newCategory),
        ...before,
        { ...taskToMove, category: newCategory },
        ...after,
      ];

      return newTasks;
    });
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
