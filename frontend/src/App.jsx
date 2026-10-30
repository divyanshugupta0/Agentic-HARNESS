import React from 'react';
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/responsive.css';

import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ChatProvider } from './context/ChatContext';
import { Workspace } from './pages/Workspace';

export function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ChatProvider>
          <Workspace />
        </ChatProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;

