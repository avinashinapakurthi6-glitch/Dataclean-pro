import * as XLSX from 'xlsx';
const rows = [
  {id:'1',name:'customer database clean',status:'completed',created_date:'2026-05-12',records_processed:5000,quality_score:92},
  {id:'2',name:'product inventory validation',status:'completed',created_date:'2026-05-11',records_processed:3200,quality_score:88},
  {id:'3',name:'email deduplication',status:'completed',created_date:'2026-05-10',records_processed:8500,quality_score:95}
];
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'test-clean.xlsx');
console.log('test-clean.xlsx created');
