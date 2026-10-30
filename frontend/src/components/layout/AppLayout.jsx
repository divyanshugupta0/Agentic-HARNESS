import React from 'react';
import { Sidebar } from './Sidebar';
import { MainWorkspace } from './MainWorkspace';

export function AppLayout() {
  return (
    <div className="app-layout" id="app-layout">
      <Sidebar />
      <MainWorkspace />
    </div>
  );
}
