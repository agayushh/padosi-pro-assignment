import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { SelectedTask } from "../types";

type DraftValue = {
  selected: SelectedTask[];
  toggle: (task: SelectedTask) => void;
  replace: (tasks: SelectedTask[]) => void;
};

const DraftContext = createContext<DraftValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedTask[]>([]);

  const toggle = useCallback((task: SelectedTask) => {
    setSelected((current) => {
      const exists = current.some((item) => item.id === task.id);
      if (exists) return current.filter((item) => item.id !== task.id);
      return [...current, task];
    });
  }, []);

  const replace = useCallback((tasks: SelectedTask[]) => {
    setSelected(tasks);
  }, []);

  const value = useMemo(() => ({ selected, toggle, replace }), [selected, toggle, replace]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useDraft must be used inside DraftProvider");
  return value;
}
