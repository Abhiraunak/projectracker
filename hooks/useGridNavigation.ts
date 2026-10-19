"use client";

import { useEffect, type RefObject } from "react";

/**
 * Spreadsheet-style keyboard movement between cells inside `container`:
 *   Arrow up / down, Enter / Shift+Enter: the cell above or below in the same column
 *   Arrow left / right at the start or end of the text: the previous or next cell in the row
 * In a multi-line cell, up/down only leave the cell from its first/last character, and Enter adds a new line.
 * Cells are inputs marked data-cell with a data-col number; rows are marked data-grid-row.
 */

type Direction = "up" | "down" | "left" | "right";
type Field = HTMLInputElement | HTMLTextAreaElement;

const cellsOf = (row: Element) => [...row.querySelectorAll<Field>("[data-cell]")].filter((c) => !c.disabled);

function neighbour(container: HTMLElement, from: Field, direction: Direction): Field | null {
  const row = from.closest("[data-grid-row]");
  if (!row) return null;
  const column = Number(from.dataset.col);

  if (direction === "left" || direction === "right") {
    const cells = cellsOf(row).sort((a, b) => Number(a.dataset.col) - Number(b.dataset.col));
    return cells[cells.indexOf(from) + (direction === "left" ? -1 : 1)] ?? null;
  }

  const rows = [...container.querySelectorAll("[data-grid-row]")];
  const step = direction === "up" ? -1 : 1;
  for (let i = rows.indexOf(row) + step; i >= 0 && i < rows.length; i += step) {
    const match = cellsOf(rows[i]!).find((c) => Number(c.dataset.col) === column);
    if (match) return match; // rows without this column (headings, totals) are skipped, like merged cells
  }
  return null;
}

function directionFor(event: KeyboardEvent, field: Field): Direction | null {
  const multiline = field.tagName === "TEXTAREA";
  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? 0;
  const atStart = start === 0 && end === 0;
  const atEnd = start === field.value.length && end === field.value.length;
  const modified = event.ctrlKey || event.metaKey || event.altKey;

  if (modified) return null;
  if (event.key === "ArrowUp" && (!multiline || atStart)) return "up";
  if (event.key === "ArrowDown" && (!multiline || atEnd)) return "down";
  if (event.key === "Enter" && !multiline) return event.shiftKey ? "up" : "down";
  if (event.key === "ArrowLeft" && !event.shiftKey && atStart) return "left";
  if (event.key === "ArrowRight" && !event.shiftKey && atEnd) return "right";
  return null;
}

export function useGridNavigation(container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const field = event.target as Field;
      if (!field.matches?.("[data-cell]")) return;
      const direction = directionFor(event, field);
      if (!direction) return;
      const target = neighbour(root, field, direction);
      if (!target) return;
      event.preventDefault();
      target.focus();
      target.select(); // like a spreadsheet: typing replaces the cell
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [container]);
}
