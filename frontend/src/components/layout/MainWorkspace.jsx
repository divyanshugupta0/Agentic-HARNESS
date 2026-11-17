import React from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { TABS } from '../../constants/navigation';
import { Header } from './Header';
import { ChatWorkspace } from '../chat/ChatWorkspace';
import { FilesWorkspace } from '../files/FilesWorkspace';
import { Marketplace } from '../marketplace/Marketplace';
import { WindowsControlView } from '../windows/WindowsControlView';
import { CustomToolsView } from '../customTools/CustomToolsView';
import { LiveAudioOverlay } from '../audio/LiveAudioOverlay';
import { AuthLayout } from '../auth/AuthLayout';

export function MainWorkspace() {
  const { currentTab, isLiveAudioOpen, closeLiveAudio } = useWorkspace();

  return (
    <main className="main-workspace" id="main-workspace">
      <Header />
      <div className="main-workspace__content">
        {currentTab === TABS.CHAT && <ChatWorkspace />}
        {currentTab === TABS.FILES && <FilesWorkspace />}
        {currentTab === TABS.WINDOWS && <WindowsControlView />}
        {currentTab === TABS.CUSTOM_TOOLS && <CustomToolsView />}
        {currentTab === TABS.MARKETPLACE && <Marketplace />}
      </div>
      <AuthLayout />

      {/* Singleton Live Audio PersonaPlex & Liquid Orb Overlay */}
      <LiveAudioOverlay
        isOpen={isLiveAudioOpen}
        onClose={closeLiveAudio}
      />
    </main>
  );
}


