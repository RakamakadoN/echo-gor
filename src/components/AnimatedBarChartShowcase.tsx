import { motion } from "motion/react";

const chartData = [
  { label: "Alpha", value: 46, color: "#2f80ed" },
  { label: "Beta", value: 72, color: "#27ae60" },
  { label: "Gamma", value: 58, color: "#f2994a" },
  { label: "Delta", value: 88, color: "#eb5757" },
  { label: "Echo", value: 100, color: "#7b61ff" },
];

const maxChartValue = Math.max(...chartData.map((item) => item.value));

export function AnimatedBarChartShowcase() {
  return (
    <section className="min-h-full bg-[#F4F7FB] px-6 py-8 text-[#162033] md:px-10 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#637083]">
            Quarterly momentum
          </p>
          <h2 className="text-3xl font-black tracking-normal text-[#162033] md:text-5xl">
            Animated 5-Bar Chart
          </h2>
        </div>

        <div className="relative h-[520px] overflow-hidden rounded-[8px] border border-slate-200 bg-gradient-to-br from-white to-[#eef3f8] px-6 pb-20 pt-12 shadow-xl shadow-slate-200/70 md:h-[620px] md:px-12 md:pb-24">
          <div className="absolute left-6 right-6 top-20 h-[350px] md:left-12 md:right-12 md:top-24 md:h-[420px]">
            {[0, 1, 2, 3].map((line) => (
              <div
                key={line}
                className="absolute left-0 right-0 h-px bg-slate-300/70"
                style={{ top: `${line * 25}%` }}
              />
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-[#263246]" />

            <span className="absolute -left-4 top-0 -translate-x-full text-xs font-bold text-[#667085]">
              100
            </span>
            <span className="absolute -left-4 bottom-0 -translate-x-full translate-y-1/2 text-xs font-bold text-[#667085]">
              0
            </span>

            <div className="absolute inset-0 flex items-end justify-between gap-2 px-8 md:gap-6 md:px-12">
              {chartData.map((item, index) => {
                const height = `${(item.value / maxChartValue) * 100}%`;

                return (
                  <div key={item.label} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                    <motion.div
                      className="relative w-full max-w-[92px] rounded-t-[8px] shadow-[0_20px_36px_rgba(36,47,70,0.16)] md:max-w-[150px]"
                      style={{
                        height,
                        background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}dd 100%)`,
                      }}
                      initial={{ scaleY: 0.02, transformOrigin: "bottom" }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        delay: 0.16 + index * 0.12,
                        duration: 0.82,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <motion.span
                        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8 text-base font-black text-[#162033] md:text-xl"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.78 + index * 0.12,
                          duration: 0.32,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        {item.value}
                      </motion.span>
                    </motion.div>
                    <motion.span
                      className="absolute -bottom-10 left-1/2 w-full -translate-x-1/2 text-center text-xs font-black text-[#4d5a6f] md:text-sm"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.72 + index * 0.12,
                        duration: 0.32,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {item.label}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.p
            className="absolute bottom-7 right-6 text-xs font-black uppercase tracking-wider text-[#687386] md:right-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.55, duration: 0.45 }}
          >
            Встроено в React-приложение
          </motion.p>
        </div>
      </div>
    </section>
  );
}
