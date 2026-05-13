import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Rows3, Columns3, AlertTriangle, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuditPanel({ audit }) {
  if (!audit) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Initial Data Audit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Rows3, label: 'Rows', value: audit.row_count },
            { icon: Columns3, label: 'Columns', value: audit.column_count },
            { icon: AlertTriangle, label: 'Missing Values', value: audit.total_nulls },
            { icon: Copy, label: 'Duplicates', value: audit.duplicate_rows },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-lg bg-muted/50 text-center"
            >
              <item.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{item.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Column details */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Column</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Nulls</TableHead>
                <TableHead className="text-xs text-right">Unique</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Sample</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.columns.map((col, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{col.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">{col.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    <span className={col.null_count > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                      {col.null_count}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">{col.unique_count}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground font-mono truncate block max-w-[200px]">
                      {col.sample_values?.slice(0, 3).join(', ')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}