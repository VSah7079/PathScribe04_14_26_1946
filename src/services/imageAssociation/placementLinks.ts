// src/services/imageAssociation/placementLinks.ts
// Batch 742: the link a report placement is fetched from when its report is made. A typed link or a photo on the
// case is its own link. An attachment is resolved through its record: a permanent URL as it is, an object key in the
// hospital's storage through a fresh read link from the storage adapter (never stored). Null when it can't be
// reached, so the report prints the Image Unavailable notice in its place.
import { getCaseAttachment } from '../caseAttachments/caseAttachments';
import type { IAttachmentStorageService } from '../caseAttachments/IAttachmentStorageService';
import type { CaseReportImage } from './caseReportImages';

const defaultStorage = async (): Promise<IAttachmentStorageService> => (await import('../caseAttachments/attachmentStorageServiceInstance')).attachmentStorageService;

export async function placementFetchUrl(image: Pick<CaseReportImage, 'imageUrl' | 'origin'>, storage: () => Promise<IAttachmentStorageService> = defaultStorage): Promise<string | null> {
  if (image.origin?.kind !== 'attachment') return image.imageUrl || null;
  const attachment = getCaseAttachment(image.origin.attachmentId);
  if (!attachment) return null;
  if (attachment.pointer.kind === 'url') return attachment.pointer.url;
  const link = await (await storage()).getReadLink(attachment.pointer, 'render');
  return link.ok ? link.data.url : null;
}
