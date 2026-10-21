import { TD } from "../cells/cellStyles";

/** Blank grid cells, so every row lines up with the 11 columns */
export const Empty = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <td key={i} className={TD} />
    ))}
  </>
);
