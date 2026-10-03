"use client"
import React, { useState } from "react";
import { SubHeading } from "../utilites/Label";

export interface ComparisonItem {
  id: string | number;
  title: string;
  area: number;
  contractorRate: number;
  inHouseRate: number;
  unit?: string;
}

interface ComparisonGridProps {
  items: ComparisonItem[];
  title?: string;
  currencySymbol?: string;
  className?: string;
}

const formatMoney = (amount: number, currencySymbol: string) => {
  return `${currencySymbol}${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

export function ComparisonGrid({
  items,
  title,
  currencySymbol = "₹",
  className = "",
}: ComparisonGridProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Empty state handling for production
  if (!items || items.length === 0) {
    return (
      <div className="w-full p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50">
        <p className="text-stone-500 font-medium">No comparison data available.</p>
      </div>
    );
  }

  return (
    <section className={`w-full ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {title && (
          <SubHeading>{title}</SubHeading>
        )}

        {/* View Toggle */}
        <div className="inline-flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              viewMode === "cards"
                ? "bg-white shadow-sm text-stone-900"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              viewMode === "table"
                ? "bg-white shadow-sm text-stone-900"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Table
          </button>
        </div>
      </div>

      {/* --- Conditional Rendering based on viewMode --- */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {items.map((item) => (
            <ComparisonCard
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm text-left text-stone-600">
            <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Work Item</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Area</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Contr. Rate</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">In-house Rate</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Contr. Total</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">In-house Total</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Net Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {items.map((item) => {
                const unit = item.unit || "sqft";
                const contractorCost = item.area * item.contractorRate;
                const inHouseCost = item.area * item.inHouseRate;
                const saving = contractorCost - inHouseCost;
                const isSaving = saving >= 0;

                return (
                  <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-900 whitespace-nowrap">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.area.toLocaleString()} <span className="text-stone-400">{unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatMoney(item.contractorRate, currencySymbol)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatMoney(item.inHouseRate, currencySymbol)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatMoney(contractorCost, currencySymbol)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatMoney(inHouseCost, currencySymbol)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${isSaving ? "text-emerald-600" : "text-rose-600"}`}>
                      {isSaving ? "+" : "-"}{formatMoney(Math.abs(saving), currencySymbol)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------
// Sub-component: Cards View
// ----------------------------------------------------------------------

interface ComparisonCardProps {
  item: ComparisonItem;
  currencySymbol: string;
}

function ComparisonCard({ item, currencySymbol }: ComparisonCardProps) {
  const unit = item.unit || "sqft";
  const contractorCost = item.area * item.contractorRate;
  const inHouseCost = item.area * item.inHouseRate;
  const saving = contractorCost - inHouseCost;
  const isSaving = saving >= 0;

  return (
    <div className="flex flex-col h-full p-6 rounded-2xl border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
      {/* --- Card Header --- */}
      <div className="flex-1">
        <div className="flex flex-col justify-between gap-3 mb-4">
          <h3 className="text-stone-800 font-semibold text-base leading-snug line-clamp-2">
            {item.title}
          </h3>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap w-fit ${
              isSaving
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {isSaving ? (
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            {isSaving ? "In-house Saving" : "Contractor Cheaper"}
          </span>
        </div>

        {/* --- Net Difference --- */}
        <div className="mb-6">
          <span className="text-sm font-medium text-stone-500 block mb-1">
            {isSaving ? "Estimated Net Savings" : "Additional Cost"}
          </span>
          <p
            className={`text-3xl font-bold tracking-tight ${
              isSaving ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatMoney(Math.abs(saving), currencySymbol)}
          </p>
        </div>
      </div>

      {/* --- Breakdown List --- */}
      <div className="mt-auto pt-5 space-y-3 text-sm text-stone-600 border-t border-stone-100">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Total Area</span>
          <span className="font-medium text-stone-800">
            {item.area.toLocaleString()} {unit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-stone-500">Contractor Rate</span>
          <span className="font-medium text-stone-800">
            {formatMoney(item.contractorRate, currencySymbol)} <span className="text-stone-400 font-normal">/ {unit}</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-stone-500">In-house Rate</span>
          <span className="font-medium text-stone-800">
            {formatMoney(item.inHouseRate, currencySymbol)} <span className="text-stone-400 font-normal">/ {unit}</span>
          </span>
        </div>

        {/* Separator for Totals */}
        <div className="pt-3 mt-1 border-t border-dashed border-stone-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Contractor Total</span>
            <span className="font-semibold text-stone-800">
              {formatMoney(contractorCost, currencySymbol)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-500">In-house Total</span>
            <span className="font-semibold text-stone-800">
              {formatMoney(inHouseCost, currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}