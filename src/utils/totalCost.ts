import { STORAGE_NAME_TOTALCOST } from "@/const";

export function addTotalCost(cost: number) {
  let totalCost = getTotalCost();
  totalCost += cost;
  localStorage.setItem(STORAGE_NAME_TOTALCOST, `${totalCost}`);
}

export function getTotalCost(): number {
  let totalCost = parseFloat(
    localStorage.getItem(STORAGE_NAME_TOTALCOST) ?? "0"
  );
  return totalCost;
}

export function clearTotalCost() {
  localStorage.setItem(STORAGE_NAME_TOTALCOST, `0`);
}
