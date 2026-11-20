import { categoryRepository } from '../category/category.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { questionRepository, type OptionInput } from './question.repository.js';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from './question.validation.js';

const normalizeOptions = (
  input: CreateQuestionInput['options'] | NonNullable<UpdateQuestionInput['options']>,
): OptionInput[] =>
  input.map((opt, idx) => ({
    optionText: opt.text,
    score: opt.score,
    displayOrder: opt.displayOrder ?? idx,
  }));

export const questionService = {
  create: async (categoryId: string, input: CreateQuestionInput) => {
    const category = await categoryRepository.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    return questionRepository.create(
      {
        categoryId,
        questionText: input.questionText,
        questionType: input.questionType ?? 'single_choice',
        subscale: input.subscale,
        isReverseScored: input.isReverseScored ?? false,
        displayOrder: input.displayOrder ?? 0,
        isRequired: input.isRequired ?? true,
        isActive: input.isActive ?? true,
      },
      normalizeOptions(input.options),
    );
  },

  listByCategory: async (categoryId: string) => {
    const category = await categoryRepository.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');
    return questionRepository.listByCategory(categoryId);
  },

  listActiveByCategoryForPatient: async (categoryId: string) => {
    const category = await categoryRepository.findById(categoryId);
    if (!category || !category.isActive) {
      throw new ApiError(404, 'Category not found');
    }
    const rows = await questionRepository.listActiveByCategoryForPatient(categoryId);
    return rows.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      displayOrder: q.displayOrder,
      isRequired: q.isRequired,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.optionText,
        displayOrder: o.displayOrder,
      })),
    }));
  },

  getById: async (id: string) => {
    const question = await questionRepository.findByIdWithOptions(id);
    if (!question) throw new ApiError(404, 'Question not found');
    return question;
  },

  update: async (id: string, input: UpdateQuestionInput) => {
    await questionService.getById(id);

    const { options, ...meta } = input;

    if (options) {
      return questionRepository.updateWithOptions(id, meta, normalizeOptions(options));
    }
    return questionRepository.updateMetadata(id, meta);
  },

  delete: async (id: string) => {
    await questionService.getById(id);
    return questionRepository.delete(id);
  },
};
