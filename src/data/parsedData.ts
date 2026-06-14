import { rawCSVData } from './rawData';

export interface PurchaseRecord {
  id: number;
  customerId: number;
  age: number;
  gender: string;
  itemPurchased: string;
  category: string;
  purchaseAmount: number;
  location: string;
  size: string;
  color: string;
  season: string;
  reviewRating: number | null;
  subscriptionStatus: 'Yes' | 'No' | string;
  shippingType: string;
  discountApplied: 'Yes' | 'No' | string;
  previousPurchases: number;
  paymentMethod: string;
  frequency: string;
}

export function getParsedRecords(): PurchaseRecord[] {
  const lines = rawCSVData.trim().split('\n');
  if (lines.length <= 1) return [];

  const records: PurchaseRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    
    // Fallback if data row is malformed or short
    if (cols.length < 10) continue;

    const customerId = parseInt(cols[0] || '0', 10);
    const age = parseInt(cols[1] || '0', 10);
    const gender = cols[2] || 'Unspecified';
    const itemPurchased = cols[3] || 'Unknown';
    const category = cols[4] || 'Misc';
    
    // Coerce raw amount to float, handle missing cell cleanly
    const rawAmount = cols[5]?.trim();
    const purchaseAmount = rawAmount ? parseFloat(rawAmount) : 0;

    const location = cols[6] || 'Online';
    const size = cols[7] || 'Standard';
    const color = cols[8] || 'Default';
    const season = cols[9] || 'All-Season';
    
    // Coerce review rating safely (optional field)
    const rawRating = cols[10]?.trim();
    const reviewRating = (rawRating && rawRating !== '') ? parseFloat(rawRating) : null;

    const subscriptionStatus = cols[11] || 'No';
    const shippingType = cols[12] || 'Standard';
    const discountApplied = cols[13] || 'No';
    
    const rawPrevious = cols[14]?.trim();
    const previousPurchases = rawPrevious ? parseInt(rawPrevious, 10) : 0;

    const paymentMethod = cols[15] || 'Credit Card';
    const frequency = cols[16] || 'One-time';

    records.push({
      id: i,
      customerId,
      age,
      gender,
      itemPurchased,
      category,
      purchaseAmount,
      location,
      size,
      color,
      season,
      reviewRating,
      subscriptionStatus,
      shippingType,
      discountApplied,
      previousPurchases,
      paymentMethod,
      frequency
    });
  }

  return records;
}

export interface MetricSummary {
  totalRevenue: number;
  averageAmount: number;
  totalTransactions: number;
  averageAge: number;
  averageRating: number;
  subscriberCount: number;
  subscriberRate: number;
}

export function computeSummary(records: PurchaseRecord[]): MetricSummary {
  if (records.length === 0) {
    return {
      totalRevenue: 0,
      averageAmount: 0,
      totalTransactions: 0,
      averageAge: 0,
      averageRating: 0,
      subscriberCount: 0,
      subscriberRate: 0,
    };
  }

  let totalRevenue = 0;
  let totalAge = 0;
  let countWithRatings = 0;
  let sumOfRatings = 0;
  let subscriberCount = 0;

  records.forEach((record) => {
    totalRevenue += record.purchaseAmount;
    totalAge += record.age;
    if (record.reviewRating !== null && !isNaN(record.reviewRating)) {
      sumOfRatings += record.reviewRating;
      countWithRatings++;
    }
    if (record.subscriptionStatus?.toLowerCase() === 'yes') {
      subscriberCount++;
    }
  });

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageAmount: Math.round((totalRevenue / records.length) * 100) / 100,
    totalTransactions: records.length,
    averageAge: Math.round((totalAge / records.length) * 10) / 10,
    averageRating: countWithRatings > 0 ? Math.round((sumOfRatings / countWithRatings) * 100) / 100 : 0,
    subscriberCount,
    subscriberRate: Math.round((subscriberCount / records.length) * 100),
  };
}
