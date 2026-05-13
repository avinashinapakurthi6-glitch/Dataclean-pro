import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock } from 'lucide-react';

export default function CleaningLog({ log }) {
  if (!log || log.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Cleaning Pipeline Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {log.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 py-3 border-b last:border-0"
            >
              <div className="mt-0.5">
                <CheckCircle2 className={`w-4 h-4 ${entry.items_fixed > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{entry.step}</p>
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {entry.items_fixed > 0 ? `${entry.items_fixed} fixed` : 'No changes'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                {entry.rows_before !== entry.rows_after && (
                  <p className="text-xs text-destructive mt-0.5">
                    {entry.rows_before} → {entry.rows_after} rows
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}