import React from "react";
import { FiAlertTriangle, FiCheck, FiCheckCircle, FiHelpCircle, FiShoppingCart, FiTool, FiXCircle } from "react-icons/fi";
import { Pill } from "@/components/materials/Pill";
import type { ItemState, StockState } from "@/lib/inventory/figures";

/** Where a BOQ item stands in the plan */
export function ItemStatePill({ state }: { state: ItemState }) {
  switch (state) {
    case "review":
      return <Pill tone="warn" icon={FiHelpCircle}>Needs materials</Pill>;
    case "suggested":
      return <Pill tone="info" icon={FiAlertTriangle}>Suggested: check</Pill>;
    case "labour":
      return <Pill tone="neutral" icon={FiTool}>Labour only</Pill>;
    case "removed":
      return <Pill tone="neutral" icon={FiXCircle}>Removed from BOQ</Pill>;
    default:
      return <Pill tone="good" icon={FiCheck}>Materials set</Pill>;
  }
}

/** One material in the store at a glance */
export function StockStatePill({ state }: { state: StockState }) {
  switch (state) {
    case "order":
      return <Pill tone="bad" icon={FiShoppingCart}>Order more</Pill>;
    case "low":
      return <Pill tone="warn" icon={FiAlertTriangle}>Low in store</Pill>;
    case "done":
      return <Pill tone="good" icon={FiCheckCircle}>All used</Pill>;
    default:
      return <Pill tone="good" icon={FiCheck}>Covered</Pill>;
  }
}
