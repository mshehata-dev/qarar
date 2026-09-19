/**
 * High-performance deterministic synthetic dataset generator for Qarar stress tests.
 */

// Simple fast deterministic pseudo-random number generator (Mulberry32)
function createPrng(seed: number = 42) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DomainType = "ecommerce" | "fintech" | "healthcare";

export interface ECommerceOrder {
  customer: {
    id: string;
    age: number;
    tier: "guest" | "member" | "vip" | "platinum";
    country: "US" | "CA" | "UK" | "DE" | "FR";
    loyaltyPoints: number;
    isVerified: boolean;
  };
  cart: {
    total: number;
    itemCount: number;
    currency: string;
    hasCoupon: boolean;
    categories: string[];
  };
  order: {
    channel: "web" | "mobile" | "api" | "pos";
    priority: "standard" | "express" | "same-day";
    promoCode?: string;
  };
}

export interface FinTechTransaction {
  transaction: {
    id: string;
    amount: number;
    currency: "USD" | "EUR" | "GBP" | "JPY";
    velocityCount24h: number;
    category: "retail" | "crypto" | "gambling" | "travel" | "utilities";
    timestamp: number;
  };
  risk: {
    score: number;
    isNewDevice: boolean;
    countryMatch: boolean;
    ipRiskScore: number;
    chargebackCount: number;
  };
  user: {
    accountAgeDays: number;
    kycLevel: "tier0" | "tier1" | "tier2" | "tier3";
    isBlocked: boolean;
  };
}

export interface HealthcareClaim {
  patient: {
    id: string;
    age: number;
    consentSigned: boolean;
    state: "CA" | "NY" | "TX" | "FL" | "IL";
    hipaaAcknowledged: boolean;
  };
  claim: {
    amount: number;
    serviceType: "outpatient" | "emergency" | "surgery" | "pharmacy";
    isPreAuthorized: boolean;
    diagnosisCode: string;
  };
  insurance: {
    planType: "HMO" | "PPO" | "EPO";
    networkStatus: "in-network" | "out-of-network";
    copayMet: boolean;
  };
}

export class DatasetGenerator {
  private prng: () => number;

  constructor(seed: number = 42) {
    this.prng = createPrng(seed);
  }

  private pick<T>(arr: readonly T[]): T {
    const idx = Math.floor(this.prng() * arr.length);
    return arr[idx];
  }

  private intBetween(min: number, max: number): number {
    return Math.floor(this.prng() * (max - min + 1)) + min;
  }

  private floatBetween(min: number, max: number, decimals: number = 2): number {
    const val = this.prng() * (max - min) + min;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }

  private bool(chance: number = 0.5): boolean {
    return this.prng() < chance;
  }

  generateECommerce(index: number): ECommerceOrder {
    const tiers = ["guest", "member", "vip", "platinum"] as const;
    const countries = ["US", "CA", "UK", "DE", "FR"] as const;
    const channels = ["web", "mobile", "api", "pos"] as const;
    const priorities = ["standard", "express", "same-day"] as const;
    const allCategories = ["electronics", "apparel", "home", "books", "groceries"];

    const catCount = this.intBetween(1, 3);
    const categories: string[] = [];
    for (let i = 0; i < catCount; i++) {
      categories.push(this.pick(allCategories));
    }

    return {
      customer: {
        id: `cust_${index}`,
        age: this.intBetween(16, 75),
        tier: this.pick(tiers),
        country: this.pick(countries),
        loyaltyPoints: this.intBetween(0, 5000),
        isVerified: this.bool(0.7),
      },
      cart: {
        total: this.floatBetween(5, 1200),
        itemCount: this.intBetween(1, 12),
        currency: "USD",
        hasCoupon: this.bool(0.25),
        categories,
      },
      order: {
        channel: this.pick(channels),
        priority: this.pick(priorities),
        promoCode: this.bool(0.2) ? "SAVE20" : undefined,
      },
    };
  }

  generateFinTech(index: number): FinTechTransaction {
    const currencies = ["USD", "EUR", "GBP", "JPY"] as const;
    const categories = ["retail", "crypto", "gambling", "travel", "utilities"] as const;
    const kycLevels = ["tier0", "tier1", "tier2", "tier3"] as const;

    return {
      transaction: {
        id: `tx_${index}`,
        amount: this.floatBetween(1, 15000),
        currency: this.pick(currencies),
        velocityCount24h: this.intBetween(0, 20),
        category: this.pick(categories),
        timestamp: 1726700000000 + index * 1000,
      },
      risk: {
        score: this.intBetween(0, 950),
        isNewDevice: this.bool(0.15),
        countryMatch: this.bool(0.85),
        ipRiskScore: this.intBetween(0, 100),
        chargebackCount: this.bool(0.05) ? this.intBetween(1, 3) : 0,
      },
      user: {
        accountAgeDays: this.intBetween(1, 1500),
        kycLevel: this.pick(kycLevels),
        isBlocked: this.bool(0.01),
      },
    };
  }

  generateHealthcare(index: number): HealthcareClaim {
    const states = ["CA", "NY", "TX", "FL", "IL"] as const;
    const serviceTypes = ["outpatient", "emergency", "surgery", "pharmacy"] as const;
    const diagnoses = ["E11.9", "I10", "J45.909", "M54.5", "Z00.00"];
    const planTypes = ["HMO", "PPO", "EPO"] as const;

    return {
      patient: {
        id: `pat_${index}`,
        age: this.intBetween(1, 90),
        consentSigned: this.bool(0.92),
        state: this.pick(states),
        hipaaAcknowledged: this.bool(0.95),
      },
      claim: {
        amount: this.floatBetween(50, 45000),
        serviceType: this.pick(serviceTypes),
        isPreAuthorized: this.bool(0.65),
        diagnosisCode: this.pick(diagnoses),
      },
      insurance: {
        planType: this.pick(planTypes),
        networkStatus: this.bool(0.8) ? "in-network" : "out-of-network",
        copayMet: this.bool(0.4),
      },
    };
  }

  /**
   * Generates a complete in-memory array of records.
   */
  generateBatch<T extends Record<string, unknown>>(
    count: number,
    domain: DomainType = "ecommerce"
  ): T[] {
    const result: T[] = new Array(count);
    for (let i = 0; i < count; i++) {
      if (domain === "ecommerce") {
        result[i] = this.generateECommerce(i) as unknown as T;
      } else if (domain === "fintech") {
        result[i] = this.generateFinTech(i) as unknown as T;
      } else {
        result[i] = this.generateHealthcare(i) as unknown as T;
      }
    }
    return result;
  }

  /**
   * Generates in memory-conscious streaming chunks for massive dataset tests (e.g. 1M+ rows).
   */
  *generateChunks<T extends Record<string, unknown>>(
    totalRows: number,
    chunkSize: number = 50000,
    domain: DomainType = "ecommerce"
  ): Generator<T[], void, unknown> {
    let generated = 0;
    while (generated < totalRows) {
      const currentChunkSize = Math.min(chunkSize, totalRows - generated);
      const chunk: T[] = new Array(currentChunkSize);
      for (let i = 0; i < currentChunkSize; i++) {
        const idx = generated + i;
        if (domain === "ecommerce") {
          chunk[i] = this.generateECommerce(idx) as unknown as T;
        } else if (domain === "fintech") {
          chunk[i] = this.generateFinTech(idx) as unknown as T;
        } else {
          chunk[i] = this.generateHealthcare(idx) as unknown as T;
        }
      }
      generated += currentChunkSize;
      yield chunk;
    }
  }
}
