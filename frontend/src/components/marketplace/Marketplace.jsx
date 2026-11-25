import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { pluginService, PLUGIN_CATEGORIES } from '../../services/pluginService';
import { PluginCard } from './PluginCard';
import { PluginDetails } from './PluginDetails';

export function Marketplace() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [plugins, setPlugins] = useState(() => pluginService.getPlugins());
  const [activePluginForDetails, setActivePluginForDetails] = useState(null);

  const handleToggleInstall = (id) => {
    pluginService.toggleInstall(id);
    setPlugins([...pluginService.getPlugins()]);
  };

  const handleToggleEnabled = (id) => {
    pluginService.toggleEnabled(id);
    setPlugins([...pluginService.getPlugins()]);
  };

  const handleSaveConfig = (id, newConfig) => {
    pluginService.updatePluginConfig(id, newConfig);
    setPlugins([...pluginService.getPlugins()]);
  };

  const filtered = plugins.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="marketplace" id="marketplace-container">
      {/* Header */}
      <div className="marketplace__header">
        <div>
          <h2 className="marketplace__heading">Explore & Agent Marketplace</h2>
          <p className="marketplace__subtitle">
            Extend Agentic Harness with specialized tools, agents, automation modules, and external integrations.
          </p>
        </div>

        <div className="marketplace__search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            className="auth-form__input"
            placeholder="Search tools & plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Pills */}
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
        {filtered.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            onToggleInstall={handleToggleInstall}
            onToggleEnabled={handleToggleEnabled}
            onOpenDetails={setActivePluginForDetails}
          />
        ))}
      </div>

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

