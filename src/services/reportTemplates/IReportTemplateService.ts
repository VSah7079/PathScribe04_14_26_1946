// src/services/reportTemplates/IReportTemplateService.ts

import type { ServiceResult, ID } from '../types';
import type { ReportTemplate } from '../../types/reportPart';

export interface IReportTemplateService {
  getAll(status?: ReportTemplate['status'] | ReportTemplate['status'][]): Promise<ServiceResult<ReportTemplate[]>>;
  getById(id: ID): Promise<ServiceResult<ReportTemplate>>;
  create(partial?: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ServiceResult<ReportTemplate>>;
  save(template: ReportTemplate): Promise<ServiceResult<ReportTemplate>>;
  clone(id: ID, newName?: string): Promise<ServiceResult<ReportTemplate>>;
  publish(id: ID): Promise<ServiceResult<ReportTemplate>>;
  archive(id: ID): Promise<ServiceResult<ReportTemplate>>;
  remove(id: ID): Promise<ServiceResult<void>>;
}
