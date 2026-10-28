/**
 * Which project should a standalone page (like Inventory) open on?
 *  - the one the person used last, if they still have access to it
 *  - otherwise the first in the list (the list is newest-activity first; with one project, that's the only choice)
 *  - nothing, if they are on no project
 */
export function chooseProject(availableIds: string[], savedId: string | null): string | null {
  if (availableIds.length === 0) return null;
  return savedId && availableIds.includes(savedId) ? savedId : availableIds[0]!;
}
