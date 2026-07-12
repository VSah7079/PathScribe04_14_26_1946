import { ServiceResult, ID } from '../types';
import { IconKey } from '../../types/smarttag.types';

export type TagClass = 'ADMINISTRATIVE' | 'COMPUTATIONAL';

export interface Flag {
  id:          ID;
  name:        string;
  lisCode:     string;
  description: string;
  level:       'Case' | 'Specimen';
  severity:    1 | 2 | 3 | 4 | 5;
  status:      'Active' | 'Inactive';

  // Set true when the flag was auto-generated from an unrecognised LIS code.
  // Prompts admin review via the AutoCreatedBanner on FlagConfigPage.
  autoCreated?: boolean;

  // ADMINISTRATIVE vs COMPUTATIONAL — previously thought worth keeping as
  // a real distinction (see git history for the earlier version of this
  // comment). Checked more carefully: the real, working application path
  // (FlagManagerModal, via adaptFlag()) drops this field entirely — it
  // isn't in FlagDefinition at all — and a leftover filter in
  // FlagManagerModal was actively hiding every COMPUTATIONAL flag from
  // the only place flags can be applied, based on the old assumption
  // that they'd be "LIS-driven, not manually applied." That assumption
  // no longer holds — there's no ordering apparatus left to drive
  // anything. So this field is now genuinely vestigial: kept optional,
  // for backward compatibility with existing seed data, but nothing
  // reads it to make a decision anymore. Every flag is just a flag —
  // attachable to a case, a specimen, or both.
  //
  // DO NOT treat this as a real field when building a production
  // backend. No column, no index, no required schema field. It's here
  // only so old mock seed data keeps compiling.
  tagClass?: TagClass;

  iconKey?: IconKey;
  meta?:    Record<string, unknown>;
}

export interface IFlagService {
  getAll():                                            Promise<ServiceResult<Flag[]>>;
  getById(id: ID):                                     Promise<ServiceResult<Flag>>;
  add(flag: Omit<Flag, 'id'>):                        Promise<ServiceResult<Flag>>;
  update(id: ID, changes: Partial<Omit<Flag, 'id'>>): Promise<ServiceResult<Flag>>;
  deactivate(id: ID):                                  Promise<ServiceResult<Flag>>;
  reactivate(id: ID):                                  Promise<ServiceResult<Flag>>;
}
