export type ConsultState =
  | "INTAKE"
  | "DIVINATION"
  | "INTERPRETATION"
  | "SUMMARY"
  | "PAYMENT"
  | "COMPLETE";

export function nextState(current: ConsultState): ConsultState {
  switch (current) {
    case "INTAKE":
      return "DIVINATION";
    case "DIVINATION":
      return "INTERPRETATION";
    case "INTERPRETATION":
      return "SUMMARY";
    case "SUMMARY":
      return "PAYMENT";
    case "PAYMENT":
      return "COMPLETE";
    default:
      return "COMPLETE";
  }
}

export function prevState(current: ConsultState): ConsultState | null {
  switch (current) {
    case "DIVINATION":
      return "INTAKE";
    case "INTERPRETATION":
      return "DIVINATION";
    case "SUMMARY":
      return "INTERPRETATION";
    case "PAYMENT":
      return "SUMMARY";
    default:
      return null;
  }
}

export function stateToRoute(state: ConsultState): string {
  switch (state) {
    case "INTAKE":
      return "/consult/intake";
    case "DIVINATION":
    case "INTERPRETATION":
      return "/consult/session";
    case "SUMMARY":
      return "/consult/summary";
    case "PAYMENT":
      return "/consult/payment";
    case "COMPLETE":
      return "/consult/history";
  }
}

export function isTerminal(state: ConsultState): boolean {
  return state === "COMPLETE";
}