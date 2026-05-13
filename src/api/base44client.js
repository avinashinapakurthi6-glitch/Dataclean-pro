// Mock data service for DataClean Pro
export const mockCleaningJobs = [
  {
    id: '1',
    name: 'Customer Database Clean',
    status: 'completed',
    created_date: new Date(Date.now() - 86400000).toISOString(),
    records_processed: 5000,
    quality_score: 92,
  },
  {
    id: '2',
    name: 'Product Inventory Validation',
    status: 'completed',
    created_date: new Date(Date.now() - 172800000).toISOString(),
    records_processed: 3200,
    quality_score: 88,
  },
  {
    id: '3',
    name: 'Email Deduplication',
    status: 'completed',
    created_date: new Date(Date.now() - 259200000).toISOString(),
    records_processed: 8500,
    quality_score: 95,
  },
];

export const base44 = {
  entities: {
    CleaningJob: {
      list: () => Promise.resolve(mockCleaningJobs),
    },
  },
};