import React from 'react';
import { motion } from 'framer-motion';

function getScoreColor(score) {
  if (score >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Excellent' };
  if (score >= 75) return { bg: 'bg-primary', text: 'text-primary', label: 'Good' };
  if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Fair' };
  return { bg: 'bg-destructive', text: 'text-destructive', label: 'Poor' };
}

export default function QualityScoreCard({ score, animate = true }) {
  const { bg, text, label } = getScoreColor(score);
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <motion.circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            className={text}
            initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-3xl font-bold ${text}`}
            initial={animate ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground font-medium">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Data Quality</p>
        <p className={`text-xs font-medium ${text}`}>{label}</p>
      </div>
    </div>
  );
}