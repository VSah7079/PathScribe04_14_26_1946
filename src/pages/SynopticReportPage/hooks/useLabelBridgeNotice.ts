import { useEffect } from 'react';
import { subscribeLabelBridgeFailure } from '@/utils/labels/labelBridgeNotice';

/**
 * PS-55: shows a warning when a label could not be sent to its hardware
 * printer (QZ Tray) and went to the browser print window instead.
 */
export function useLabelBridgeNotice(notify: () => void): void {
  useEffect(() => subscribeLabelBridgeFailure(notify), [notify]);
}
