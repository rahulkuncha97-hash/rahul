import React from "react";
import { motion } from "motion/react";

export const FloatingOrbs = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.2, 0.8, 1],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px]"
    />
    <motion.div
      animate={{
        x: [0, -150, 100, 0],
        y: [0, 150, -100, 0],
        scale: [1, 0.9, 1.3, 1],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"
    />
    <motion.div
      animate={{
        x: [0, 200, -100, 0],
        y: [0, 100, -200, 0],
        scale: [1, 1.1, 0.9, 1],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-600/20 rounded-full blur-[100px]"
    />
  </div>
);
