// import React from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   CheckCircle2,
//   Upload,
//   ScanSearch,
//   LayoutGrid,
//   Rocket,
//   UtensilsCrossed,
//   ChefHat,
//   Coffee,
//   Pizza,
//   Soup,
//   IceCreamCone,
//   Salad,
// } from "lucide-react";

// interface SetupLoadingScreenProps {
//   activeStep: number;
//   completed: boolean;
//   statusMessage?: string | null;
//   /** Overall setup progress in percent (0..100). */
//   progressPct: number;
// }

// const steps = [
//   { icon: Upload, label: "Uploading Menu", subtext: "Sending your files securely..." },
//   { icon: ScanSearch, label: "Extracting Items", subtext: "Analyzing your menu items..." },
//   { icon: LayoutGrid, label: "Organizing Categories", subtext: "Sorting dishes into categories..." },
//   { icon: Rocket, label: "Finalizing Dashboard", subtext: "Almost there..." },
// ];

// const floatingIcons = [UtensilsCrossed, ChefHat, Coffee, Pizza, Soup, IceCreamCone, Salad];

// function clamp01(n: number): number {
//   if (!Number.isFinite(n)) return 0;
//   return Math.max(0, Math.min(1, n));
// }

// function stepProgressFromOverall(progressPct: number, stepIndex: number): number {
//   const bounds = [0, 25, 50, 75, 100] as const;
//   const start = bounds[Math.max(0, Math.min(stepIndex, bounds.length - 2))]!;
//   const end = bounds[Math.max(1, Math.min(stepIndex + 1, bounds.length - 1))]!;
//   const overall = Math.max(0, Math.min(100, progressPct));
//   return clamp01((overall - start) / Math.max(1, end - start));
// }

// function StepVisual({
//   stepIndex,
//   stepProgress01,
//   icon: Icon,
// }: {
//   stepIndex: number;
//   stepProgress01: number;
//   icon: React.ElementType;
// }) {
//   const p = clamp01(stepProgress01);

//   // Shared container (matches the existing icon box sizing).
//   const Box = ({ children }: { children?: React.ReactNode }) => (
//     <div
//       className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden"
//       style={{ background: "rgba(249,115,22,0.15)" }}
//     >
//       {children}
//     </div>
//   );

//   if (stepIndex === 0) {
//     // Uploading: liquid fill rises with progress (mask via overflow-hidden container).
//     const fillPct = p * 100;
//     const waveTopPct = 100 - fillPct;
//     return (
//       <Box>
//         {/* Liquid fill */}
//         <div
//           className="absolute inset-x-0 bottom-0"
//           style={{
//             height: `${fillPct}%`,
//             background: "linear-gradient(180deg, rgba(249,115,22,0.9), rgba(251,146,60,0.75))",
//           }}
//         />
//         {/* Wave crest */}
//         <motion.div
//           className="absolute inset-x-0"
//           style={{ top: `${waveTopPct}%` }}
//           animate={{ x: [-6, 6, -6] }}
//           transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
//         >
//           <svg viewBox="0 0 64 12" className="w-full h-3" preserveAspectRatio="none">
//             <path
//               d="M0 6 C8 2 16 10 24 6 C32 2 40 10 48 6 C56 2 60 10 64 6 L64 12 L0 12 Z"
//               fill="rgba(255,255,255,0.18)"
//             />
//           </svg>
//         </motion.div>

//         <Icon className="w-4 h-4 text-white/90 relative z-10" />
//       </Box>
//     );
//   }

//   if (stepIndex === 1) {
//     // Extracting: scanner line sweeps top->bottom with progress.
//     return (
//       <Box>
//         <Icon className="w-4 h-4 text-white/30 relative z-10" />
//         <motion.div
//           className="absolute inset-x-1 h-1.5 rounded-full"
//           style={{
//             top: `${p * 100}%`,
//             transform: "translateY(-50%)",
//             background:
//               "linear-gradient(90deg, rgba(249,115,22,0), rgba(249,115,22,0.95), rgba(249,115,22,0))",
//             filter: "blur(0.2px)",
//             boxShadow: "0 0 10px rgba(249,115,22,0.35)",
//           }}
//           animate={{ opacity: [0.65, 1, 0.65] }}
//           transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
//         />
//       </Box>
//     );
//   }

//   if (stepIndex === 2) {
//     // Organizing: grid tiles reveal in a stagger linked to progress.
//     const tiles = Array.from({ length: 9 }, (_, i) => i);
//     return (
//       <Box>
//         <div className="grid grid-cols-3 gap-0.5 w-5 h-5 relative z-10">
//           {tiles.map((i) => {
//             const t = (i + 1) / tiles.length;
//             const local = clamp01((p - (t - 0.18)) / 0.18);
//             return (
//               <div
//                 key={i}
//                 className="rounded-[2px]"
//                 style={{
//                   background: "rgba(255,255,255,0.85)",
//                   opacity: 0.15 + local * 0.85,
//                   transform: `scale(${0.7 + local * 0.3})`,
//                 }}
//               />
//             );
//           })}
//         </div>
//       </Box>
//     );
//   }

//   // Finalizing: rocket ignite + lift based on progress.
//   const lift = -6 * p;
//   const glow = 0.1 + 0.5 * p;
//   return (
//     <Box>
//       <motion.div
//         className="absolute inset-0"
//         style={{
//           background: `radial-gradient(circle at 50% 70%, rgba(249,115,22,${glow}) 0%, rgba(249,115,22,0) 70%)`,
//           filter: "blur(6px)",
//         }}
//         animate={{ opacity: [0.75, 1, 0.75] }}
//         transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
//       />
//       <motion.div style={{ y: lift }} className="relative z-10">
//         <Icon className="w-4 h-4 text-white/90" />
//       </motion.div>
//       <div
//         className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
//         style={{
//           background: "rgba(251,146,60,0.9)",
//           opacity: p,
//           filter: "blur(1px)",
//         }}
//       />
//     </Box>
//   );
// }

// function FloatingElement({
//   delay,
//   x,
//   icon: Icon,
// }: {
//   delay: number;
//   x: number;
//   icon: React.ElementType;
//   // React's `key` is a special attribute; including it here silences TS when it is
//   // checked against the explicit props type.
//   key?: React.Key;
// }) {
//   return (
//     <motion.div
//       initial={{ y: 100, opacity: 0 }}
//       animate={{ y: -200, opacity: [0, 0.3, 0.15, 0] }}
//       transition={{ duration: 6, delay, repeat: Infinity, ease: "easeOut" }}
//       className="absolute bottom-0 pointer-events-none"
//       style={{ left: `${x}%` }}
//     >
//       <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
//         <Icon className="w-5 h-5 text-orange-300/50" />
//       </div>
//     </motion.div>
//   );
// }

// export function SetupLoadingScreen({
//   activeStep,
//   completed,
//   statusMessage,
//   progressPct,
// }: SetupLoadingScreenProps) {
//   const clampedStep = Math.max(0, Math.min(activeStep, steps.length - 1));
//   const progress = completed ? 100 : Math.max(0, Math.min(100, progressPct));

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
//     >
//       {/* Animated gradient background */}
//       <motion.div
//         animate={{
//           background: [
//             "linear-gradient(135deg, #1a0a00 0%, #2d1200 30%, #0f0f0f 70%, #1a0800 100%)",
//             "linear-gradient(135deg, #0f0f0f 0%, #1a0a00 30%, #2d1200 70%, #0f0f0f 100%)",
//             "linear-gradient(135deg, #1a0a00 0%, #2d1200 30%, #0f0f0f 70%, #1a0800 100%)",
//           ],
//         }}
//         transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute inset-0"
//       />

//       {/* Blurred dashboard mockup bg */}
//       <div className="absolute inset-0 opacity-[0.04]">
//         <div className="absolute top-[10%] left-[5%] w-[40%] h-[30%] rounded-2xl border border-white/10 bg-white/5" />
//         <div className="absolute top-[10%] right-[5%] w-[45%] h-[20%] rounded-2xl border border-white/10 bg-white/5" />
//         <div className="absolute bottom-[15%] left-[8%] w-[35%] h-[25%] rounded-2xl border border-white/10 bg-white/5" />
//         <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[35%] rounded-2xl border border-white/10 bg-white/5" />
//         <div className="absolute top-[45%] left-[20%] w-[60%] h-[8%] rounded-xl border border-white/10 bg-white/5" />
//       </div>

//       {/* Floating food icons */}
//       {floatingIcons.map((Icon, i) => (
//         <FloatingElement
//           key={i}
//           delay={i * 0.9}
//           x={8 + i * 13}
//           icon={Icon}
//         />
//       ))}

//       {/* Pulsing orange glow */}
//       <motion.div
//         animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
//         transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute w-80 h-80 rounded-full"
//         style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)", filter: "blur(80px)" }}
//       />

//       {/* Main card */}
//       <motion.div
//         initial={{ y: 30, opacity: 0, scale: 0.95 }}
//         animate={{ y: 0, opacity: 1, scale: 1 }}
//         transition={{ type: "spring", stiffness: 150, damping: 20 }}
//         className="relative z-10 w-[90%] max-w-md mx-auto"
//       >
//         <div
//           className="rounded-3xl p-8 border border-white/10 shadow-2xl"
//           style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(40px)" }}
//         >
//           {/* Header */}
//           <AnimatePresence mode="wait">
//             {!completed ? (
//               <motion.div key="loading" exit={{ opacity: 0, y: -10 }}>
//                 <motion.div
//                   animate={{ rotate: [0, 5, -5, 0] }}
//                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
//                   className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
//                   style={{ background: "rgba(249,115,22,0.15)" }}
//                 >
//                   <UtensilsCrossed className="w-7 h-7" style={{ color: "#f97316" }} />
//                 </motion.div>
//                 <h2 className="text-white text-center mb-1">Setting up your restaurant...</h2>
//                 <p className="text-white/40 text-center text-sm mb-7">
//                   We're building your menu and dashboard
//                 </p>
//               </motion.div>
//             ) : (
//               <motion.div
//                 key="done"
//                 initial={{ opacity: 0, scale: 0.8 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 transition={{ type: "spring", stiffness: 200, damping: 15 }}
//                 className="text-center mb-5"
//               >
//                 <motion.div
//                   initial={{ scale: 0, rotate: -180 }}
//                   animate={{ scale: 1, rotate: 0 }}
//                   transition={{ type: "spring", stiffness: 200, damping: 12 }}
//                   className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
//                   style={{ background: "rgba(34,197,94,0.15)" }}
//                 >
//                   <CheckCircle2 className="w-7 h-7 text-green-400" />
//                 </motion.div>
//                 <h2 className="text-white mb-1">Your restaurant is ready 🚀</h2>
//                 <p className="text-white/40 text-sm">Everything's set. Let's go!</p>
//               </motion.div>
//             )}
//           </AnimatePresence>

//           {/* Progress bar */}
//           <div className="w-full h-1.5 rounded-full bg-white/10 mb-7 overflow-hidden">
//             <motion.div
//               className="h-full rounded-full"
//               style={{ background: "linear-gradient(90deg, #f97316, #fb923c)" }}
//               initial={{ width: "0%" }}
//               animate={{ width: `${progress}%` }}
//               transition={{ duration: 0.6, ease: "easeOut" }}
//             />
//           </div>

//           {/* Steps */}
//           <div className="space-y-3">
//             {steps.map((step, i) => {
//               const isDone = activeStep > i || completed;
//               const isActive = activeStep === i && !completed;
//               const StepIcon = step.icon;
//               const stepP = stepProgressFromOverall(progress, i);

//               return (
//                 <motion.div
//                   key={step.label}
//                   initial={{ opacity: 0, x: -20 }}
//                   animate={{ opacity: i <= activeStep || completed ? 1 : 0.3, x: 0 }}
//                   transition={{ delay: i * 0.1, duration: 0.4 }}
//                   className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-colors"
//                   style={{
//                     background: isActive ? "rgba(249,115,22,0.08)" : "transparent",
//                   }}
//                 >
//                   {/* Icon */}
//                   <div className="relative flex-shrink-0">
//                     {isDone ? (
//                       <motion.div
//                         initial={{ scale: 0 }}
//                         animate={{ scale: 1 }}
//                         transition={{ type: "spring", stiffness: 300, damping: 15 }}
//                         className="w-8 h-8 rounded-lg flex items-center justify-center"
//                         style={{ background: "rgba(34,197,94,0.15)" }}
//                       >
//                         <CheckCircle2 className="w-4 h-4 text-green-400" />
//                       </motion.div>
//                     ) : (
//                       <div
//                         className="w-8 h-8 rounded-lg flex items-center justify-center"
//                         style={{
//                           background: isActive ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
//                         }}
//                       >
//                         {isActive ? (
//                           <StepVisual
//                             stepIndex={i}
//                             stepProgress01={stepP}
//                             icon={StepIcon}
//                           />
//                         ) : (
//                           <StepIcon className="w-4 h-4 text-white/20" />
//                         )}
//                       </div>
//                     )}
//                   </div>

//                   {/* Text */}
//                   <div className="flex-1 min-w-0">
//                     <p
//                       className="text-sm"
//                       style={{
//                         color: isDone ? "rgba(34,197,94,0.8)" : isActive ? "#f97316" : "rgba(255,255,255,0.25)",
//                       }}
//                     >
//                       {step.label}
//                     </p>
//                     {isActive && (
//                       <motion.p
//                         initial={{ opacity: 0, height: 0 }}
//                         animate={{ opacity: 1, height: "auto" }}
//                         className="text-xs text-white/30 mt-0.5"
//                       >
//                         {step.subtext}
//                       </motion.p>
//                     )}
//                   </div>

//                   {/* Status indicator */}
//                   {isActive && (
//                     <motion.div
//                       animate={{ opacity: [0.4, 1, 0.4] }}
//                       transition={{ duration: 1.5, repeat: Infinity }}
//                       className="w-1.5 h-1.5 rounded-full flex-shrink-0"
//                       style={{ backgroundColor: "#f97316" }}
//                     />
//                   )}
//                 </motion.div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Bottom text */}
//         <motion.p
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 1 }}
//           className="text-center text-xs text-white/20 mt-5"
//         >
//           {statusMessage ?? "This usually takes a few seconds"}
//         </motion.p>
//       </motion.div>
//     </motion.div>
//   );
// }
