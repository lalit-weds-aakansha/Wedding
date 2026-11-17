import { useReducedMotion } from "framer-motion";
import { wedding } from "../config/wedding";

/** Whether the site honours the device's "reduce motion" setting. See `opening.respectReducedMotion` in the config. */
export const respectReducedMotion = wedding.opening.respectReducedMotion;

/** True only when the visitor asked for reduced motion AND the site is set to honour it. */
export const prefersReduced = () => respectReducedMotion && typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function useReduce() {
  const os = useReducedMotion();
  return respectReducedMotion && !!os;
}
