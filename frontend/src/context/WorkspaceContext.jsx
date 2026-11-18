import React, { createContext, useContext, useState } from 'react';
import { TABS } from '../constants/navigation';
import { fileService } from '../services/fileService';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [currentTab, setCurrentTab] = useState(TABS.CHAT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [files, setFiles] = useState(() => fileService.getFiles());
  const [openFileTabs, setOpenFileTabs] = useState(() => fileService.getOpenFileTabs());
  const [activeFile, setActiveFile] = useState(() => fileService.getActiveFile());
  const [recentlyModified, setRecentlyModified] = useState(() => fileService.getRecentlyModified());

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

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

  return (
    <WorkspaceContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        isSidebarCollapsed,
        toggleSidebar,
        files,
        openFileTabs,
        activeFile,
        recentlyModified,
        openFile,
        closeFileTab,
        updateFileContent,
        saveActiveFile,
        createFile,
        deleteFile
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

