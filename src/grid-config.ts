export const GRID_SPACING = 60;

const VALID_GRID_SIZES = [3, 5, 7];
const DEFAULT_GRID_SIZE = 5;
let gridCells = DEFAULT_GRID_SIZE;

export const setGridCells = (value: number) => {
  if (!VALID_GRID_SIZES.includes(value)) {
    return;
  }
  gridCells = value;
};

export const getGridCells = () => gridCells;
export const getGridHalfCount = () => gridCells / 2;
export const getGridRadius = () => getGridHalfCount() * GRID_SPACING;
export const getGridSizeOptions = () => VALID_GRID_SIZES.slice();
export const getDefaultGridSize = () => DEFAULT_GRID_SIZE;
