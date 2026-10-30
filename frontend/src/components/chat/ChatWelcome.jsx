import React from 'react';
import { Bot, Search, Globe, FileCode, Cpu } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

const STARTER_SUGGESTIONS = [
  {
    icon: Search,
    title: 'Research a topic',
    desc: 'Synthesize insights on autonomous agents, tool sandboxing, and local LLMs.',
    prompt: 'Research the best architectural patterns for local desktop AI agent tool sandboxing and synthesize findings.'
  },
  {
    icon: Globe,
    title: 'Build a website',
    desc: 'Create a responsive web application layout with clean modular components.',
    prompt: 'Generate a modern, responsive single-page web app with navigation tabs and state persistence.'
  },
  {
    icon: FileCode,
    title: 'Analyze a collection of files',
    desc: 'Inspect codebase structure, detect anomalies, and verify file permissions.',
    prompt: 'Analyze repository architecture and suggest optimization paths for Agentic Harness.'
  },
  {
    icon: Cpu,
    title: 'Create an automation workflow',
    desc: 'Automate repetitive desktop tasks, file parsing, and periodic testing.',
    prompt: 'Design an automated multi-step agent workflow that verifies unit tests and compiles production builds.'
  }
];

export function ChatWelcome({ onSelectSuggestion }) {
  return (
    <div className="chat-welcome" id="chat-welcome-screen">
      <div className="chat-welcome__header">
        <div className="chat-welcome__icon-badge">
          <Bot size={32} />
        </div>
        <h1 className="chat-welcome__title">Welcome to Agentic Harness</h1>
        <p className="chat-welcome__subtitle">
          Your local-first workspace for intelligent agents, automation, and ideas.
          Describe what you want to accomplish, and let your autonomous agents help you get there.
        </p>
      </div>

      <div className="chat-welcome__grid">
        {STARTER_SUGGESTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="chat-welcome__card"
              onClick={() => onSelectSuggestion(item.prompt)}
              role="button"
              tabIndex={0}
            >
              <div className="chat-welcome__card-header">
                <Icon size={16} color="var(--accent-cyan)" />
                <span>{item.title}</span>
              </div>
              <p className="chat-welcome__card-desc">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

