import { useWorkspace as useWorkspaceContext } from '../context/WorkspaceContext';

/**
 * Custom hook to access application layout tabs, sidebar collapse state, and file editor controls
 * @returns {{
 *   currentTab: string,
 *   setCurrentTab: Function,
 *   isSidebarCollapsed: boolean,
 *   toggleSidebar: Function,
 *   files: Array,
 *   openFileTabs: Array,
 *   activeFile: Object,
 *   recentlyModified: Array,
 *   openFile: Function,
 *   closeFileTab: Function,
 *   updateFileContent: Function,
 *   saveActiveFile: Function,
 *   createFile: Function,
 *   deleteFile: Function
 * }}
 */
export function useWorkspace() {
  return useWorkspaceContext();
}
