import React, { useState } from 'react';
import {
  Search,
  Blocks,
  Sparkles,
  Puzzle,
  Check,
  Download,
  ShieldCheck,
  Compass,
  ArrowRight
} from 'lucide-react';
import { pluginService, PLUGIN_CATEGORIES } from '../../services/pluginService';
import { MARKETPLACE_TABS } from '../../constants/navigation';
import { PluginCard } from './PluginCard';
import { PluginDetails } from './PluginDetails';
import { Button } from '../common/Button';

const AGENT_SKILLS = [
  {
    id: 'skill-code-review',
    name: 'Autonomous Code Reviewer',
    description: 'Inspects changed files, flags performance bottlenecks, security flaws, and syntax inconsistencies.',
    category: 'Engineering',
    tools: ['fsTool', 'gitTool'],
    enabled: true
  },
  {
    id: 'skill-research-synthesis',
    name: 'Deep Research & Document Synthesis',
    description: 'Parses local markdown and text archives to synthesize technical architectural recommendations.',
    category: 'Analysis',
    tools: ['fsTool', 'searchTool'],
    enabled: true
  },
  {
    id: 'skill-shell-automation',
    name: 'Safe Shell Workflow Automation',
    description: 'Executes chained command-line scripts within an allowlisted sandboxed terminal sub-process.',
    category: 'DevOps',
    tools: ['shellTool', 'systemTool'],
    enabled: false
  },
  {
    id: 'skill-http-integration',
    name: 'REST API & Webhook Dispatcher',
    description: 'Queries external REST endpoints and formats structured JSON responses for agent context.',
    category: 'Integration',
    tools: ['httpTool'],
    enabled: true
  }
];

export function Marketplace() {
  const [activeTab, setActiveTab] = useState(MARKETPLACE_TABS.PLUGINS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [plugins, setPlugins] = useState(() => pluginService.getPlugins());
  const [skills, setSkills] = useState(AGENT_SKILLS);
  const [activePluginForDetails, setActivePluginForDetails] = useState(null);

  const handleToggleInstall = (id) => {
    pluginService.toggleInstall(id);
    setPlugins([...pluginService.getPlugins()]);
  };

  const handleToggleEnabled = (id) => {
    pluginService.toggleEnabled(id);
    setPlugins([...pluginService.getPlugins()]);
  };

  const handleToggleSkill = (skillId) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSaveConfig = (id, newConfig) => {
    pluginService.updatePluginConfig(id, newConfig);
    setPlugins([...pluginService.getPlugins()]);
  };

  const filteredPlugins = plugins.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredSkills = skills.filter((s) => {
    return (
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="marketplace" id="marketplace-container">
      {/* Top Header */}
      <div className="marketplace__header">
        <div className="marketplace__header-info">
          <h2 className="marketplace__heading">Agent & Tool Marketplace</h2>
          <p className="marketplace__subtitle">
            Extend Agentic Harness with specialized system tools, reusable agent skills, and external plugins.
          </p>
        </div>

        <div className="marketplace__search-bar">
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="marketplace__search-input"
            placeholder={
              activeTab === MARKETPLACE_TABS.PLUGINS
                ? 'Search tools & plugins...'
                : 'Search skills & workflows...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Secondary Marketplace Sub-Navigation Bar */}
      <div className="marketplace__subnav" id="marketplace-sub-navigation">
        <button
          type="button"
          className={`marketplace__subnav-btn ${activeTab === MARKETPLACE_TABS.PLUGINS ? 'marketplace__subnav-btn--active' : ''}`}
          onClick={() => setActiveTab(MARKETPLACE_TABS.PLUGINS)}
          id="marketplace-tab-plugins"
        >
          <Blocks size={15} />
          <span>Plugins ({plugins.length})</span>
        </button>

        <button
          type="button"
          className={`marketplace__subnav-btn ${activeTab === MARKETPLACE_TABS.SKILLS ? 'marketplace__subnav-btn--active' : ''}`}
          onClick={() => setActiveTab(MARKETPLACE_TABS.SKILLS)}
          id="marketplace-tab-skills"
        >
          <Sparkles size={15} />
          <span>Skills ({skills.length})</span>
        </button>

        <button
          type="button"
          className={`marketplace__subnav-btn ${activeTab === MARKETPLACE_TABS.EXTENSIONS ? 'marketplace__subnav-btn--active' : ''}`}
          onClick={() => setActiveTab(MARKETPLACE_TABS.EXTENSIONS)}
          id="marketplace-tab-extensions"
        >
          <Puzzle size={15} />
          <span>Extensions</span>
        </button>
      </div>

      {/* TAB 1: PLUGINS */}
      {activeTab === MARKETPLACE_TABS.PLUGINS && (
        <>
          {/* Category Filter Pills */}
          <div className="marketplace__categories">
            {PLUGIN_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`marketplace__category-btn ${selectedCategory === category ? 'marketplace__category-btn--active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Plugin Cards Grid */}
          <div className="marketplace__grid">
            {filteredPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                onToggleInstall={handleToggleInstall}
                onToggleEnabled={handleToggleEnabled}
                onOpenDetails={setActivePluginForDetails}
              />
            ))}
          </div>
        </>
      )}

      {/* TAB 2: SKILLS */}
      {activeTab === MARKETPLACE_TABS.SKILLS && (
        <div className="marketplace__grid">
          {filteredSkills.map((skill) => (
            <div key={skill.id} className="plugin-card">
              <div className="plugin-card__header">
                <div className="plugin-card__icon-badge">
                  <Compass size={18} />
                </div>
                <span className="plugin-card__badge">{skill.category}</span>
              </div>

              <div className="plugin-card__body">
                <h4 className="plugin-card__name">{skill.name}</h4>
                <p className="plugin-card__desc">{skill.description}</p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {skill.tools.map((tool) => (
                    <span
                      key={tool}
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="plugin-card__footer">
                <button
                  type="button"
                  onClick={() => handleToggleSkill(skill.id)}
                  className={`plugin-card__status-btn ${skill.enabled ? 'plugin-card__status-btn--enabled' : 'plugin-card__status-btn--disabled'}`}
                  title={skill.enabled ? 'Click to disable skill' : 'Click to enable skill'}
                >
                  <span className="plugin-card__status-dot" />
                  <span>{skill.enabled ? 'Active Skill' : 'Disabled'}</span>
                </button>

                <Button
                  variant={skill.enabled ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => handleToggleSkill(skill.id)}
                >
                  {skill.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: EXTENSIONS (Coming Soon / Extensible Architecture) */}
      {activeTab === MARKETPLACE_TABS.EXTENSIONS && (
        <div className="marketplace__empty-state">
          <div className="marketplace__empty-icon">
            <Puzzle size={36} />
          </div>
          <h3 className="marketplace__empty-title">Extensions Platform</h3>
          <p className="marketplace__empty-desc">
            The Agentic Harness extensions engine will allow developers to build custom side-panels, theme packs, and deep Electron integrations.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--status-success)' }} />
            Sandboxed Extension Architecture · Coming in next release
          </div>
        </div>
      )}

      {/* Details / Config Modal */}
      <PluginDetails
        plugin={activePluginForDetails}
        isOpen={Boolean(activePluginForDetails)}
        onClose={() => setActivePluginForDetails(null)}
        onSaveConfig={handleSaveConfig}
      />
    </div>
  );
}
