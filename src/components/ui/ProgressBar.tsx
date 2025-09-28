import * as Progress from "@radix-ui/react-progress";
import { motion, useReducedMotion } from "framer-motion";

type Props = { value: number }; // 0..100

export default function ProgressBar({ value }: Props) {
  const prefersReduced = useReducedMotion();

  return (
    <Progress.Root
      value={value}
      style={{
        position: "relative",
        height: 10,
        marginLeft: "2.5%",
        width: "95%",
        background: "rgba(255,255,255,0.15)",
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      }}
      aria-label="Progress"
    >
      <motion.div
        style={{
          height: "100%",
          background: "linear-gradient(90deg,#8ec5ff,#a8ffcc)",
        }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={prefersReduced ? { duration: 0 } : { type: "tween", duration: 0.35 }}
      />
    </Progress.Root>
  );
}
