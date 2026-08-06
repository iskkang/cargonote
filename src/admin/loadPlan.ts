// Hand-off payload from the load calculator to the new-work-order screen.
// A plan is display-only context + a container count; it is not persisted.
export interface LoadPlan {
  containerLabel: string;   // e.g. "40' HQ"
  containerCount: number;   // number of containers the pack needs
  fills: number[];          // per-container fill %, rounded
  cargoKinds: number;       // distinct cargo lines
  cargoQty: number;         // total units
  totalCbm: number;
  totalWeight: number;
}
