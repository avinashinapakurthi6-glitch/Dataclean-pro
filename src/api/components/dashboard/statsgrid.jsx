import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Rows3, Trash2, FileWarning, Wrench, Bug, CheckCircle } from 'lucide-react';

const statConfigs = [
  { key: 'rows_before', label: 'Rows Before', icon: Rows3, color: 'text-muted-foreground' },
  { key: 'rows_after', label: 'Rows After', icon: CheckCircle, color: 'text-emerald-500' },
  { key: 'duplicates_removed', label: 'Duplicates Removed', icon: Trash2, color: 'text-destructive' },
  { key: 'nulls_before', label: 'Missing Values Found', icon: FileWarning, color: 'text-amber-500' },
  { key: 'formats_fixed', label: 'Formats Fixed', icon: Wrench, color: 'text-primary' },
  { key: 'outliers_handled', label: 'Outliers Capped', icon: Bug, color: 'text-purple-500' },
];

export default function StatsGrid({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statConfigs.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="p-4 text-center space-y-2 hover:shadow-md transition-shadow">
              <Icon className={`w-5 h-5 mx-auto ${stat.color}`} />
              <p className="text-2xl font-bold text-foreground">
                {(summary[stat.key] ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}