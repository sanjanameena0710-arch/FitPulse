import React, { createContext, useContext, useState, ReactNode } from "react";

export type WorkoutExercise = {
  exerciseId?: number;
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
};

export type ActiveWorkout = {
  name: string;
  category: string;
  exercises: WorkoutExercise[];
  startTime: Date;
  timerSeconds: number;
  isRunning: boolean;
};

type WorkoutContextType = {
  activeWorkout: ActiveWorkout | null;
  startWorkout: (name: string, category: string, exercises?: WorkoutExercise[]) => void;
  addExercise: (exercise: WorkoutExercise) => void;
  removeExercise: (index: number) => void;
  updateTimer: (seconds: number) => void;
  setRunning: (running: boolean) => void;
  finishWorkout: () => ActiveWorkout | null;
};

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  function startWorkout(name: string, category: string, exercises: WorkoutExercise[] = []) {
    setActiveWorkout({
      name, category, exercises,
      startTime: new Date(),
      timerSeconds: 0,
      isRunning: false,
    });
  }

  function addExercise(exercise: WorkoutExercise) {
    setActiveWorkout(prev => prev ? { ...prev, exercises: [...prev.exercises, exercise] } : prev);
  }

  function removeExercise(index: number) {
    setActiveWorkout(prev => prev ? {
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    } : prev);
  }

  function updateTimer(seconds: number) {
    setActiveWorkout(prev => prev ? { ...prev, timerSeconds: seconds } : prev);
  }

  function setRunning(running: boolean) {
    setActiveWorkout(prev => prev ? { ...prev, isRunning: running } : prev);
  }

  function finishWorkout(): ActiveWorkout | null {
    const workout = activeWorkout;
    setActiveWorkout(null);
    return workout;
  }

  return (
    <WorkoutContext.Provider value={{ activeWorkout, startWorkout, addExercise, removeExercise, updateTimer, setRunning, finishWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
