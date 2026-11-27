import React, { createContext, useContext, useState, useEffect } from 'react';
import { TABS } from '../constants/navigation';
import { fileService } from '../services/fileService';
import { api } from '../services/api';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [currentTab, setCurrentTab] = useState(TABS.CHAT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLiveAudioOpen, setIsLiveAudioOpen] = useState(false);
  const [files, setFiles] = useState(() => fileService.getFiles());
  const [projectRoot, setProjectRoot] = useState(() => fileService.getProjectRoot());
  const [openFileTabs, setOpenFileTabs] = useState(() => fileService.getOpenFileTabs());
  const [activeFile, setActiveFile] = useState(() => fileService.getActiveFile());
  const [recentlyModified, setRecentlyModified] = useState(() => fileService.getRecentlyModified());

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const openLiveAudio = () => setIsLiveAudioOpen(true);
  const closeLiveAudio = () => setIsLiveAudioOpen(false);

  const openFile = (id) => {
    const file = fileService.openFile(id);
    setActiveFile(file);
    setOpenFileTabs(fileService.getOpenFileTabs());
    setCurrentTab(TABS.FILES);
  };

  const closeFileTab = (id) => {
    fileService.closeTab(id);
    setOpenFileTabs(fileService.getOpenFileTabs());
    setActiveFile(fileService.getActiveFile());
  };

  const updateFileContent = (newContent) => {
    if (!activeFile) return;
    fileService.updateFileContent(activeFile.id, newContent);
    setActiveFile({ ...activeFile, content: newContent, isDirty: true });
    setFiles([...fileService.getFiles()]);
    setOpenFileTabs(fileService.getOpenFileTabs());
  };

  const saveActiveFile = async () => {
    if (!activeFile) return;
    const saved = await fileService.saveFile(activeFile.id);
    if (saved) {
      setActiveFile({ ...saved, isDirty: false });
      setFiles([...fileService.getFiles()]);
      setRecentlyModified(fileService.getRecentlyModified());
      setOpenFileTabs(fileService.getOpenFileTabs());
    }
  };

  const createFile = (name) => {
    const newFile = fileService.createFile(name);
    setFiles([...fileService.getFiles()]);
    setOpenFileTabs(fileService.getOpenFileTabs());
    setActiveFile(newFile);
    setRecentlyModified(fileService.getRecentlyModified());
    setCurrentTab(TABS.FILES);
    return newFile;
  };

  const deleteFile = (id) => {
    fileService.deleteFile(id);
    setFiles([...fileService.getFiles()]);
    setOpenFileTabs(fileService.getOpenFileTabs());
    setActiveFile(fileService.getActiveFile());
    setRecentlyModified(fileService.getRecentlyModified());
  };

  const applyLoadedProject = (res) => {
    if (!res || !res.success || !Array.isArray(res.files)) return false;
    const updated = fileService.setProjectFiles({
      projectPath: res.projectPath,
      projectName: res.projectName,
      files: res.files
    });
    setProjectRoot(updated.projectRoot);
    setFiles([...updated.files]);
    setOpenFileTabs(fileService.getOpenFileTabs());
    setActiveFile(updated.activeFile);
    setRecentlyModified(fileService.getRecentlyModified());
    setCurrentTab(TABS.FILES);
    return true;
  };

  const openProjectFolder = async (folderPath = '') => {
    try {
      const res = folderPath
        ? await api.send('project:read-folder', { path: folderPath })
        : await api.send('dialog:open-project');
      return applyLoadedProject(res);
    } catch (err) {
      console.error('Failed to open project folder:', err);
      return false;
    }
  };

  useEffect(() => {
    const syncProjectOnMount = async () => {
      const root = fileService.getProjectRoot();
      if (root?.path) {
        await api.send('project:set-cwd', { path: root.path }).catch(() => {});
      }
    };
    syncProjectOnMount();

    const onRefresh = async () => {
      const root = fileService.getProjectRoot();
      if (!root?.path) return;
      try {
        const res = await api.send('project:read-folder', { path: root.path });
        if (res?.success && Array.isArray(res.files)) {
          const updated = fileService.setProjectFiles({
            projectPath: res.projectPath,
            projectName: res.projectName,
            files: res.files
          });
          setFiles([...updated.files]);
          setOpenFileTabs(fileService.getOpenFileTabs());
          setRecentlyModified(fileService.getRecentlyModified());
        }
      } catch (_) {}
    };
    window.addEventListener('workspace:refresh-project', onRefresh);
    return () => window.removeEventListener('workspace:refresh-project', onRefresh);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        isSidebarCollapsed,
        toggleSidebar,
        isLiveAudioOpen,
        setIsLiveAudioOpen,
        openLiveAudio,
        closeLiveAudio,
        files,
        projectRoot,
        openFileTabs,
        activeFile,
        recentlyModified,
        openFile,
        closeFileTab,
        updateFileContent,
        saveActiveFile,
        createFile,
        deleteFile,
        openProjectFolder
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

