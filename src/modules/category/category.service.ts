import { ApiError } from '../../utils/ApiError.js';
import { slugify } from '../../utils/slugify.js';
import { categoryRepository } from './category.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.validation.js';

export const categoryService = {
  create: async (createdBy: string, input: CreateCategoryInput) => {
    const slug = (input.slug ?? slugify(input.name)).toLowerCase();
    if (!slug) {
      throw new ApiError(422, 'Unable to derive a valid slug from the provided name');
    }

    const existing = await categoryRepository.findBySlug(slug);
    if (existing) {
      throw new ApiError(409, `A category with slug "${slug}" already exists`);
    }

    return categoryRepository.create({
      name: input.name,
      slug,
      description: input.description,
      scoringType: input.scoringType ?? 'total',
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
      createdBy,
    });
  },

  list: async () => {
    const rows = await categoryRepository.list();
    return rows.map(({ _count, ...c }) => ({
      ...c,
      questionCount: _count.questions,
    }));
  },

  stats: () => categoryRepository.stats(),

  listActiveForPatient: async () => {
    const rows = await categoryRepository.listActiveForPatient();
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      questionCount: c._count.questions,
    }));
  },

  getByIdForPatient: async (id: string) => {
    const row = await categoryRepository.findActiveByIdForPatient(id);
    if (!row) throw new ApiError(404, 'Category not found');
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      scoringType: row.scoringType,
      displayOrder: row.displayOrder,
      questionCount: row._count.questions,
    };
  },

  getById: async (id: string) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  },

  update: async (id: string, input: UpdateCategoryInput) => {
    await categoryService.getById(id);

    if (input.slug) {
      const slug = input.slug.toLowerCase();
      const existing = await categoryRepository.findBySlug(slug);
      if (existing && existing.id !== id) {
        throw new ApiError(409, `Slug "${slug}" is already in use`);
      }
      return categoryRepository.update(id, { ...input, slug });
    }

    return categoryRepository.update(id, input);
  },

  delete: async (id: string) => {
    await categoryService.getById(id);
    return categoryRepository.delete(id);
  },
};
