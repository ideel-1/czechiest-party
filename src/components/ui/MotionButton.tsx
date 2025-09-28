import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { CSSProperties } from "react";

type Props = HTMLMotionProps<"button"> & {
  variant?: "solid" | "ghost";
};

export default function MotionButton({ variant = "solid", style, ...rest }: Props) {
  const base: CSSProperties = {
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 600,
    border: "1px solid transparent",
    cursor: "pointer",
  };
  const solid: CSSProperties = {
    background: "#2563eb",
    color: "white",
    boxShadow: "0 6px 18px rgba(37,99,235,0.25)",
  };
  const ghost: CSSProperties = {
    background: "white",
    color: "#111",
    borderColor: "#ddd",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <motion.button
      whileHover={{ y: -1, boxShadow: "0 10px 24px rgba(0,0,0,0.18)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "tween", duration: 0.15 }}
      style={{ ...base, ...(variant === "solid" ? solid : ghost), ...style }}
      {...rest}
    />
  );
}
