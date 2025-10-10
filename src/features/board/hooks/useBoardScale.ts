import { createContext, useContext } from "react";
export const BoardScaleCtx = createContext<() => number>(() => 1);
export const useBoardScale = () => useContext(BoardScaleCtx);
