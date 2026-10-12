import { GOOGLE_NOTEBOOK_URL } from '../config/navigation';
import { openExternalBrowser } from './browserLauncher';

/**
 * Apre Google NotebookLM nel browser Chrome integrato / di sistema.
 */
export function openNotebookWithPriority(): void {
  openExternalBrowser(GOOGLE_NOTEBOOK_URL);
}

