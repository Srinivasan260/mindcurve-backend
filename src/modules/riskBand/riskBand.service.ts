import { categoryRepository } from '../category/category.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { riskBandRepository, type BandInput } from './riskBand.repository.js';
import type {
  BulkReplaceRiskBandsInput,
  CreateRiskBandInput,
  UpdateRiskBandInput,
} from './riskBand.validation.js';

interface RangeCheck {
  subscale: string | null;
  level: string;
  minScore: number;
  maxScore: number;
}

const overlaps = (a: RangeCheck, b: RangeCheck): boolean =>
  !(a.maxScore < b.minScore || a.minScore > b.maxScore);

const findOverlapInSet = (bands: RangeCheck[]): [RangeCheck, RangeCheck] | null => {
  // Group by subscale, then check each group for overlapping ranges.
  const groups = new Map<string, RangeCheck[]>();
  for (const b of bands) {
    const key = b.subscale ?? '__null__';
    const arr = groups.get(key) ?? [];
    arr.push(b);
    groups.set(key, arr);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const first = group[i];
        const second = group[j];
        if (first && second && overlaps(first, second)) {
          return [first, second];
        }
      }
    }
  }
  return null;
};

const toCheck = (b: {
  subscale: string | null;
  level: string;
  minScore: unknown;
  maxScore: unknown;
}): RangeCheck => ({
  subscale: b.subscale,
  level: b.level,
  minScore: Number(b.minScore),
  maxScore: Number(b.maxScore),
});

const assertCategoryExists = async (categoryId: string): Promise<void> => {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');
};

export const riskBandService = {
  create: async (categoryId: string, input: CreateRiskBandInput) => {
    await assertCategoryExists(categoryId);

    const subscale = input.subscale ?? null;

    // Check overlap against existing bands in the same (category, subscale).
    const existing = await riskBandRepository.listByCategoryAndSubscale(categoryId, subscale);
    const candidate: RangeCheck = {
      subscale,
      level: input.level,
      minScore: input.minScore,
      maxScore: input.maxScore,
    };
    for (const row of existing) {
      if (overlaps(candidate, toCheck({ ...row, subscale: row.subscale }))) {
        throw new ApiError(
          409,
          `Band range ${input.minScore}-${input.maxScore} overlaps existing band "${row.level}" (${row.minScore}-${row.maxScore})`,
        );
      }
    }

    return riskBandRepository.create(categoryId, {
      subscale,
      level: input.level,
      minScore: input.minScore,
      maxScore: input.maxScore,
      label: input.label,
      color: input.color,
    });
  },

  list: async (categoryId: string) => {
    await assertCategoryExists(categoryId);
    return riskBandRepository.listByCategory(categoryId);
  },

  update: async (id: string, input: UpdateRiskBandInput) => {
    const current = await riskBandRepository.findById(id);
    if (!current) throw new ApiError(404, 'Risk band not found');

    const next: RangeCheck = {
      subscale: input.subscale === undefined ? current.subscale : input.subscale ?? null,
      level: input.level ?? current.level,
      minScore: input.minScore ?? Number(current.minScore),
      maxScore: input.maxScore ?? Number(current.maxScore),
    };

    const peers = await riskBandRepository.listByCategoryAndSubscale(
      current.categoryId,
      next.subscale,
    );
    for (const peer of peers) {
      if (peer.id === id) continue;
      if (overlaps(next, toCheck({ ...peer, subscale: peer.subscale }))) {
        throw new ApiError(
          409,
          `Updated range ${next.minScore}-${next.maxScore} overlaps band "${peer.level}" (${peer.minScore}-${peer.maxScore})`,
        );
      }
    }

    return riskBandRepository.update(id, {
      subscale: input.subscale === undefined ? undefined : input.subscale ?? null,
      level: input.level,
      minScore: input.minScore,
      maxScore: input.maxScore,
      label: input.label,
      color: input.color,
    });
  },

  delete: async (id: string) => {
    const current = await riskBandRepository.findById(id);
    if (!current) throw new ApiError(404, 'Risk band not found');
    return riskBandRepository.delete(id);
  },

  bulkReplace: async (categoryId: string, input: BulkReplaceRiskBandsInput) => {
    await assertCategoryExists(categoryId);

    const normalized: BandInput[] = input.bands.map((b) => ({
      subscale: b.subscale ?? null,
      level: b.level,
      minScore: b.minScore,
      maxScore: b.maxScore,
      label: b.label,
      color: b.color,
    }));

    // If the caller scoped the replace to one subscale, make sure every band
    // in the payload actually belongs to that subscale.
    if (input.subscale !== undefined) {
      const scope = input.subscale ?? null;
      for (const b of normalized) {
        if (b.subscale !== scope) {
          throw new ApiError(
            422,
            `All bands must have subscale=${scope === null ? 'null' : scope} when scoping replace`,
          );
        }
      }
    }

    // Overlap check within the incoming set.
    const overlap = findOverlapInSet(normalized);
    if (overlap) {
      const [a, b] = overlap;
      throw new ApiError(
        422,
        `Bands within the payload overlap: "${a.level}" (${a.minScore}-${a.maxScore}) and "${b.level}" (${b.minScore}-${b.maxScore})`,
      );
    }

    // Uniqueness check: duplicate (subscale, level) in payload would violate the unique index.
    const seen = new Set<string>();
    for (const b of normalized) {
      const key = `${b.subscale ?? '__null__'}::${b.level}`;
      if (seen.has(key)) {
        throw new ApiError(422, `Duplicate (subscale, level) in payload: ${key}`);
      }
      seen.add(key);
    }

    return riskBandRepository.replaceSet(categoryId, input.subscale, normalized);
  },
};
