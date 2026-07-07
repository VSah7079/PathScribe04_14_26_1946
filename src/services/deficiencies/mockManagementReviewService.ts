// src/services/deficiencies/mockManagementReviewService.ts

import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { ManagementReview, IManagementReviewService } from './IDeficiencyService';

const load    = () => storageGet<ManagementReview[]>('pathscribe_management_reviews', []);
const persist = (data: ManagementReview[]) => storageSet('pathscribe_management_reviews', data);
let REVIEWS: ManagementReview[] = load();

const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const mockManagementReviewService: IManagementReviewService = {
  async getAll() { return ok([...REVIEWS]); },

  async create(review) {
    const newReview: ManagementReview = {
      ...review,
      id: 'mrev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      reviewedAt: new Date().toISOString(),
    };
    REVIEWS = [...REVIEWS, newReview];
    persist(REVIEWS);

    // Stamp managementReviewId onto every SpecimenDeficiency covered by
    // this review, so "closed but unreviewed" can be queried directly
    // without joining against every review's deficiencyIds array.
    // Imported dynamically to avoid a circular module dependency —
    // this file and mockSpecimenDeficiencyService.ts both live under
    // the same barrel and would otherwise import each other.
    const { mockSpecimenDeficiencyService } = await import('./mockSpecimenDeficiencyService');
    await mockSpecimenDeficiencyService.markReviewed(review.deficiencyIds, newReview.id);

    return ok({ ...newReview });
  },
};
