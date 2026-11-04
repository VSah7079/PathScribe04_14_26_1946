// src/types/case/HpvGenotype.ts
// Batch 631. The genotype detail of a positive hrHPV result. `hpv16`, `hpv18Or45` and `otherHighRisk` are the grouping the
// platform interface and the UK/US high-risk factors already use. `hpv18` and `hpv45` are optional and separate the
// "18 or 45" group, which the Australian and New Zealand programmes need (16/18 are urgent; 45 is an "other" type).
export interface HpvGenotypeDetail {
  hpv16: boolean;
  hpv18Or45: boolean;
  otherHighRisk: boolean;
  /** HPV 18 reported on its own. Absent when the sender only reports the 18/45 group. */
  hpv18?: boolean;
  /** HPV 45 reported on its own. Absent when the sender only reports the 18/45 group. */
  hpv45?: boolean;
}
