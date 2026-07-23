import { createContext, useContext, useState, type ReactNode } from "react";
import { nextState, type ConsultState } from "@/lib/consultState";

interface ConsultContextValue {
  state: ConsultState;
  advance: () => void;
}

const ConsultContext = createContext<ConsultContextValue | null>(null);

export function ConsultProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsultState>("INTAKE");

  function advance() {
    setState((s) => nextState(s));
  }

  return (
    <ConsultContext.Provider value={{ state, advance }}>
      {children}
    </ConsultContext.Provider>
  );
}

export function useConsult(): ConsultContextValue {
  const ctx = useContext(ConsultContext);
  if (!ctx) {
    throw new Error("useConsult must be used within a ConsultProvider");
  }
  return ctx;
}