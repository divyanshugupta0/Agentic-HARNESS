import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
  Plus,
  Trash2,
  Code2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Terminal,
  FileCode
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * Custom AI Tools View & Security Verification Gate
 * View, verify, test, and manage on-device AI tools created by the agent.
 */
export function CustomToolsView() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, VERIFIED, PENDING_VERIFICATION, REJECTED
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToolForModal, setActiveToolForModal] = useState(null); // For test execution or code view
  const [modalMode, setModalMode] = useState('EXECUTE'); // EXECUTE, CODE, CREATE
  const [testParams, setTestParams] = useState('{}');
  const [executionResult, setExecutionResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [verifyingToolName, setVerifyingToolName] = useState(null);

  // New tool form state
  const [newToolName, setNewToolName] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  const [newToolCode, setNewToolCode] = useState(
    'module.exports = async function(args) {\n  // Implement your custom tool logic here\n  return { success: true, processed: args };\n};'
  );

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    setLoading(true);
    try {
      const res = await api.send('customTool:list');
      if (res && res.tools) {
        setTools(res.tools);
      }
    } catch (err) {
      console.error('Failed to load custom tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (toolName) => {
    setVerifyingToolName(toolName);
    try {
      const res = await api.send('customTool:verify', toolName);
      if (res && res.success) {
        await loadTools();
      } else {
        alert('Verification Failed: ' + (res?.error || 'Security checks did not pass'));
      }
    } catch (err) {
      alert('Verification Error: ' + err.message);
    } finally {
      setVerifyingToolName(null);
    }
  };

  const handleExecute = async () => {
    if (!activeToolForModal) return;
    setExecuting(true);
    setExecutionResult(null);

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(testParams);
    } catch (err) {
      alert('Invalid JSON in parameters: ' + err.message);
      setExecuting(false);
      return;
    }

    try {
      const start = performance.now();
      const res = await api.send('customTool:execute', {
        name: activeToolForModal.name,
        params: parsedParams
      });
      const duration = Math.round(performance.now() - start);

      setExecutionResult({
        ...res,
        durationMs: duration
      });
    } catch (err) {
      setExecutionResult({
        success: false,
        error: err.message
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCreateTool = async (e) => {
    e.preventDefault();
    if (!newToolName.trim()) {
      alert('Tool name is required');
      return;
    }

    try {
      const res = await api.send('customTool:create', {
        name: newToolName.trim(),
        description: newToolDesc.trim(),
        code: newToolCode,
        parameters: {}
      });

      if (res && res.success) {
        setActiveToolForModal(null);
        setNewToolName('');
        setNewToolDesc('');
        await loadTools();
      } else {
        alert('Failed to create tool: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error creating custom tool: ' + err.message);
    }
  };

  const handleDelete = async (toolName) => {
    if (!confirm(`Are you sure you want to delete custom tool "${toolName}"?`)) return;
    try {
      await api.send('customTool:delete', toolName);
      await loadTools();
    } catch (err) {
      alert('Failed to delete tool: ' + err.message);
    }
  };

  const filteredTools = tools.filter((t) => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              AI Custom Tools & Verification Gate
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <ShieldCheck size={13} />
              Gate Enforced
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Inspect, run security audits, and verify custom agentic tools saved locally on this machine before execution.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadTools}
            className="btn-icon"
            title="Refresh Tools"
            style={{ padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: '8px' }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode('CREATE');
              setActiveToolForModal({});
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            <span>Create Custom Tool</span>
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '12px',
          color: 'var(--text-primary)'
        }}
      >
        <Terminal size={18} color="var(--accent-cyan)" />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>Mandatory First-Time Security Verification: </span>
          AI-generated code cannot execute until verified by the AST syntax scanner, Guardrail regex pattern analyzer, and isolated sandbox dry-runner.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'VERIFIED', 'PENDING_VERIFICATION', 'REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filter === st ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                backgroundColor: filter === st ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-secondary)',
                color: filter === st ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {st === 'ALL' && 'All Tools'}
              {st === 'VERIFIED' && 'Verified Only'}
              {st === 'PENDING_VERIFICATION' && 'Pending Verification'}
              {st === 'REJECTED' && 'Rejected'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search custom tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Scanning device custom tools...
        </div>
      ) : filteredTools.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px dashed var(--border-default)',
            borderRadius: '12px'
          }}
        >
          <FileCode size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No custom tools found
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
            Ask the AI agent in chat to build a custom tool, or click "Create Custom Tool" to author one.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredTools.map((tool) => {
            const isVerified = tool.status === 'VERIFIED';
            const isPending = tool.status === 'PENDING_VERIFICATION';
            const isRejected = tool.status === 'REJECTED';

            return (
              <div
                key={tool.name}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Code2 size={18} color="var(--accent-cyan)" />
                      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                        {tool.name}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isVerified
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isPending
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(244, 63, 94, 0.15)',
                        color: isVerified
                          ? 'var(--accent-emerald)'
                          : isPending
                          ? 'var(--accent-amber)'
                          : 'var(--accent-rose)'
                      }}
                    >
                      {isVerified && <CheckCircle2 size={12} />}
                      {isPending && <Clock size={12} />}
                      {isRejected && <ShieldAlert size={12} />}
                      <span>{isVerified ? 'VERIFIED' : isPending ? 'PENDING VERIFY' : 'REJECTED'}</span>
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', minHeight: '38px' }}>
                    {tool.description || 'No description provided.'}
                  </p>

                  <div
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginBottom: '16px'
                    }}
                  >
                    Parameters: {Object.keys(tool.parameters || {}).length > 0 ? JSON.stringify(tool.parameters) : 'None (runs standalone)'}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolForModal(tool);
                        setModalMode('CODE');
                      }}
                      className="btn-icon"
                      title="View JavaScript Code"
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                    >
                      <Code2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tool.name)}
                      className="btn-icon"
                      title="Delete Custom Tool"
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', color: 'var(--accent-rose)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleVerify(tool.name)}
                        disabled={verifyingToolName === tool.name}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--accent-emerald)',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <ShieldCheck size={14} />
                        <span>{verifyingToolName === tool.name ? 'Verifying...' : 'Verify Now'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolForModal(tool);
                        setModalMode('EXECUTE');
                        setExecutionResult(null);
                        setTestParams(JSON.stringify(tool.parameters || {}, null, 2));
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: isVerified ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                        color: isVerified ? '#fff' : 'var(--text-disabled)',
                        border: '1px solid var(--border-default)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isVerified ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title={isVerified ? 'Run and test this tool' : 'Tool must be verified before execution'}
                    >
                      <Play size={14} />
                      <span>Execute</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Code / Execute / Create */}
      {activeToolForModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 13, 20, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {modalMode === 'CREATE' ? (
              <form onSubmit={handleCreateTool}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Create New Custom Tool
                </h3>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Tool Identifier Name (camelCase)
                  </label>
                  <input
                    type="text"
                    value={newToolName}
                    onChange={(e) => setNewToolName(e.target.value)}
                    placeholder="e.g. formatLogReport"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={newToolDesc}
                    onChange={(e) => setNewToolDesc(e.target.value)}
                    placeholder="What does this tool do?"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Tool JavaScript Implementation
                  </label>
                  <textarea
                    rows={8}
                    value={newToolCode}
                    onChange={(e) => setNewToolCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--accent-cyan)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveToolForModal(null)}
                    style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save to Device
                  </button>
                </div>
              </form>
            ) : modalMode === 'EXECUTE' ? (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Execute Tool: {activeToolForModal.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Provide test arguments in JSON format and run the verified tool locally.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Input Parameters (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={testParams}
                    onChange={(e) => setTestParams(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveToolForModal(null)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleExecute}
                    disabled={executing}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-emerald)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={14} />
                    <span>{executing ? 'Executing...' : 'Run Tool'}</span>
                  </button>
                </div>

                {/* Execution Results View */}
                {executionResult && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1px solid ${executionResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: executionResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
                      <span>{executionResult.success ? '✓ Execution Success' : '✗ Execution Failed'}</span>
                      {executionResult.durationMs !== undefined && <span>{executionResult.durationMs}ms</span>}
                    </div>
                    <pre style={{ margin: 0, color: 'var(--text-primary)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(executionResult.result || executionResult.error || executionResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              /* CODE VIEW MODE */
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Source: {activeToolForModal.name}
                </h3>
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '14px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--accent-cyan)',
                    maxHeight: '350px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {activeToolForModal.code || '// Source code stored in customTools/' + activeToolForModal.name + '.js'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveToolForModal(null)}
                    style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

