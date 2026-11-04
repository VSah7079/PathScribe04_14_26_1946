// src/services/messages/messageRecipients.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 385 (PS-359 follow-up): who a message can be addressed to, and how the
// New message drawer's "To" field finds them. The list used to be hard-coded
// in AppShell.tsx; it now comes from messageService.listRecipients() (the mock
// keeps the demo directory here, the API server will return the organisation's
// staff). Pure: the searching and exact-name matching the drawer did inline.
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageRecipient { id: string; name: string; role: string; }

/** The demo directory the mock message service returns. */
export const DEMO_MESSAGE_RECIPIENTS: readonly MessageRecipient[] = [
  { id: 'u2',  name: 'Lab Manager',           role: 'Laboratory'            },
  { id: 'u3',  name: 'System Admin',          role: 'IT / Administration'   },
  { id: 'u4',  name: 'Dr. Sarah Li Chen',     role: 'Pathology'             },
  { id: 'u5',  name: 'Dr. James Emeka Okafor', role: 'Pathology'            },
  { id: 'u6',  name: 'IT Support',            role: 'IT / Administration'   },
  { id: 'u7',  name: 'Billing Dept',          role: 'Finance'               },
  { id: 'u8',  name: 'Dr. Miller',            role: 'Pathology'             },
  { id: 'u9',  name: 'Archives',              role: 'Medical Records'       },
  { id: 'u10', name: 'QA Team',               role: 'Quality Assurance'     },
  { id: 'u11', name: 'Dr. Aisha Priya Patel', role: 'Gastroenterology'      },
  { id: 'u12', name: 'Transcription',         role: 'Medical Transcription' },
  { id: 'u13', name: 'Medical Records',       role: 'Medical Records'       },
  { id: 'u14', name: 'Dr. Wilson',            role: 'Oncology'              },
  { id: 'u15', name: 'Compliance',            role: 'Compliance'            },
  { id: 'u16', name: 'Supply Room',           role: 'Operations'            },
  { id: 'u17', name: 'Dr. Lee',               role: 'Dermatopathology'      },
];

/** Recipients whose name or role contains the query, leaving out the ones already chosen. An empty query matches everyone. */
export function searchRecipients(
  recipients: readonly MessageRecipient[], query: string, excludeIds: readonly string[] = [],
): MessageRecipient[] {
  const q = query.toLowerCase().trim();
  return recipients.filter(u =>
    !excludeIds.includes(u.id) && (u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)),
  );
}

/** The one recipient whose name is exactly what was typed (ignoring case), if not already chosen. */
export function findRecipientByName(
  recipients: readonly MessageRecipient[], typed: string, excludeIds: readonly string[] = [],
): MessageRecipient | undefined {
  const name = typed.toLowerCase().trim();
  return recipients.find(u => u.name.toLowerCase() === name && !excludeIds.includes(u.id));
}
