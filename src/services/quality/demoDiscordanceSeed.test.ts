import { describe, expect, it } from 'vitest';
import { DEMO_DISCORDANCE_CAPA_RECOMMENDATIONS, DEMO_DISCORDANCE_RECORDS } from './demoDiscordanceSeed';
import { qaRecordRecommendation } from './capaRecommendationRules';
import { SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID, mockQaActivityTypeService } from './mockQaActivityTypeService';

describe('demo discordance data (PS-147)', () => {
  it('has 5 cases: 3 minor and 2 major', () => {
    expect(DEMO_DISCORDANCE_RECORDS).toHaveLength(5);
    expect(DEMO_DISCORDANCE_RECORDS.filter(r => r.severity === 'low')).toHaveLength(3);
    expect(DEMO_DISCORDANCE_RECORDS.filter(r => r.severity === 'high')).toHaveLength(2);
  });

  it('involves exactly 3 pathologists', () => {
    const people = new Set<string>();
    for (const r of DEMO_DISCORDANCE_RECORDS) { people.add(r.recordedBy.userId); if (r.reviewedPathologist) people.add(r.reviewedPathologist.userId); }
    expect(people.size).toBe(3);
  });

  it('gives one pathologist a pattern: 3 of the 5 reviewed reads', () => {
    const counts = new Map<string, number>();
    for (const r of DEMO_DISCORDANCE_RECORDS) counts.set(r.reviewedPathologist!.userId, (counts.get(r.reviewedPathologist!.userId) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBe(3);
  });

  it('uses unique ids and a reviewer who is never the reviewed pathologist', () => {
    expect(new Set(DEMO_DISCORDANCE_RECORDS.map(r => r.id)).size).toBe(5);
    for (const r of DEMO_DISCORDANCE_RECORDS) expect(r.recordedBy.userId).not.toBe(r.reviewedPathologist!.userId);
  });

  it('uses the surgical peer review activity and its own fields', async () => {
    const types = await mockQaActivityTypeService.getAll();
    const type = types.ok ? types.data.find(t => t.id === SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID) : undefined;
    expect(type).toBeTruthy();
    const fieldIds = type!.fields.map(f => f.id);
    for (const r of DEMO_DISCORDANCE_RECORDS) {
      expect(r.activityTypeId).toBe(SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID);
      expect(Object.keys(r.fieldValues).sort()).toEqual([...fieldIds].sort());
    }
  });

  it('recommends a CAPA for the two major ones only, and the seeded recommendations match', async () => {
    const types = await mockQaActivityTypeService.getAll();
    const type = types.ok ? types.data.find(t => t.id === SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID) : undefined;
    const withCapa = DEMO_DISCORDANCE_RECORDS.filter(r => qaRecordRecommendation(r, type));
    expect(withCapa.map(r => r.severity)).toEqual(['high', 'high']);
    expect(DEMO_DISCORDANCE_CAPA_RECOMMENDATIONS.map(c => c.sourceRecordId).sort()).toEqual(withCapa.map(r => r.id).sort());
    for (const c of DEMO_DISCORDANCE_CAPA_RECOMMENDATIONS) {
      const rec = withCapa.find(r => r.id === c.sourceRecordId)!;
      expect(c.source).toBe(qaRecordRecommendation(rec, type)!.source);
      expect(c.deficiencyTypeId).toBe(qaRecordRecommendation(rec, type)!.deficiencyTypeId);
    }
  });
});
