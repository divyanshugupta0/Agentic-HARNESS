import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TABS } from '../../constants/navigation';
import { Header } from './Header';
import { ChatWorkspace } from '../chat/ChatWorkspace';
import { FilesWorkspace } from '../files/FilesWorkspace';
import { Marketplace } from '../marketplace/Marketplace';
import { AuthLayout } from '../auth/AuthLayout';

export function MainWorkspace() {
  const { currentTab } = useWorkspace();

  return (
    <main className="main-workspace" id="main-workspace">
      <Header />
      <div className="main-workspace__content">
        {currentTab === TABS.CHAT && <ChatWorkspace />}
        {currentTab === TABS.FILES && <FilesWorkspace />}
        {currentTab === TABS.MARKETPLACE && <Marketplace />}
      </div>
      <AuthLayout />
    </main>
  );
}

