import React from 'react';
import { Bot, Search, Globe, FileCode, Cpu, ArrowRight } from 'lucide-react';

const STARTER_SUGGESTIONS = [
  {
    icon: Search,
    title: 'Research a topic',
    desc: 'Synthesize findings on autonomous agents, tool sandboxing, and local LLMs.',
    prompt: 'Research the best architectural patterns for local desktop AI agent tool sandboxing and synthesize findings.'
  },
  {
    icon: Globe,
    title: 'Build a web application',
    desc: 'Generate a clean, responsive single-page web app with navigation tabs and state persistence.',
    prompt: 'Generate a modern, responsive single-page web app with navigation tabs and state persistence.'
  },
  {
    icon: FileCode,
    title: 'Analyze codebase files',
    desc: 'Inspect repository architecture, detect anomalies, and verify file permissions.',
    prompt: 'Analyze repository architecture and suggest optimization paths for Agentic Harness.'
  },
  {
    icon: Cpu,
    title: 'Automate a workflow',
    desc: 'Design a multi-step agent workflow that verifies tests and compiles production builds.',
    prompt: 'Design an automated multi-step agent workflow that verifies unit tests and compiles production builds.'
  }
];

export function ChatWelcome({ onSelectSuggestion }) {
  return (
    <div className="chat-welcome" id="chat-welcome-screen">
      <div className="chat-welcome__header">
        <div className="chat-welcome__icon-badge">
          <Bot size={24} />
        </div>
        <h1 className="chat-welcome__title">Welcome to Agentic Harness</h1>
        <p className="chat-welcome__subtitle">
          Your workspace for autonomous agents, code execution, and system workflows.
          Describe what you want to accomplish, and let your agents assist you.
        </p>
      </div>

      <div className="chat-welcome__grid">
        {STARTER_SUGGESTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              type="button"
              className="chat-welcome__card"
              onClick={() => onSelectSuggestion(item.prompt)}
            >
              <div className="chat-welcome__card-header">
                <div className="chat-welcome__card-icon">
                  <Icon size={15} />
                </div>
                <span className="chat-welcome__card-title">{item.title}</span>
                <ArrowRight size={13} className="chat-welcome__card-arrow" />
              </div>
              <p className="chat-welcome__card-desc">{item.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
