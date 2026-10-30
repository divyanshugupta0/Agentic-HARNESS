import React from 'react';
import { FileText, FileCode, FileJson, FileTerminal, Image, File } from 'lucide-react';

/**
 * Returns a standardized Lucide icon component configured for the file type
 * @param {string} type - 'json' | 'javascript' | 'markdown' | 'text' | 'shell' | 'image'
 * @param {number} size - Icon dimensions in pixels
 */
export function getFileIcon(type, size = 14) {
  switch (type?.toLowerCase()) {
    case 'json':
      return <FileJson size={size} color="var(--accent-amber)" />;
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
      return <FileCode size={size} color="var(--accent-cyan)" />;
    case 'shell':
    case 'bash':
    case 'sh':
      return <FileTerminal size={size} color="var(--accent-emerald)" />;
    case 'markdown':
    case 'md':
      return <FileText size={size} color="var(--accent-indigo)" />;
    case 'image':
    case 'png':
    case 'jpg':
    case 'svg':
      return <Image size={size} color="var(--accent-purple)" />;
    default:
      return <FileText size={size} color="var(--text-secondary)" />;
  }
}
