import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const steps = [
  { key: 'uploading', label: 'Uploading file...' },
  { key: 'auditing', label: 'Auditing data...' },
  { key: 'cleaning', label: 'Running cleaning pipeline...' },
  { key: 'generating_report', label: 'Generating report...' },
  { key: 'completed', label: 'Complete!' },
];

export default function ProcessingOverlay({ status }) {
  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 flex flex-col items-center gap-6"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-10 h-10 text-primary" />
      </motion.div>

      <div className="space-y-3 w-full max-w-xs">
        {steps.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                isDone ? 'bg-emerald-500' : isCurrent ? 'bg-primary animate-pulse' : 'bg-muted'
              }`} />
              <span className={`text-sm transition-colors duration-300 ${
                isDone ? 'text-muted-foreground line-through' : isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground/50'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}