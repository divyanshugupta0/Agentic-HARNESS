const initialExtensions = [
    // PLUGINS (Themes - single active at a time)
    {
        id: "theme-midnight-dark",
        name: "Midnight Dark Theme",
        tab: "plugins",
        type: "theme",
        exclusive: true,
        installed: false,
        active: false,
        settings: {
            accentColor: "#3b82f6",
            fontSmoothing: true
        }
    },
    {
        id: "theme-solar-light",
        name: "Solar Light Theme",
        tab: "plugins",
        type: "theme",
        exclusive: true,
        installed: false,
        active: false,
        settings: {
            accentColor: "#f59e0b",
            fontSmoothing: true
        }
    },

    // MARKETPLACE (Code Editor extensions/tools)
    {
        id: "ext-eslint-checker",
        name: "ESLint Code Linter",
        tab: "marketplace",
        type: "linter",
        exclusive: false,
        installed: false,
        active: false,
        settings: {
            autoFixOnSave: true
        }
    },
    {
        id: "ext-biome-linter",
        name: "Biome Fast Linter",
        tab: "marketplace",
        type: "linter", // Same type as ESLint -> multiple same-type items will prompt selection
        exclusive: false,
        installed: false,
        active: false,
        settings: {
            autoFixOnSave: false
        }
    },
    {
        id: "ext-git-lens-lite",
        name: "Git History Helper",
        tab: "marketplace",
        type: "git-tool", // Different type -> can stay active simultaneously
        exclusive: false,
        installed: false,
        active: false,
        settings: {
            showInlineBlame: true
        }
    },

    // SKILLS (Only for AI Agent)
    {
        id: "skill-repo-auditor",
        name: "Repository Security & Diff Skill",
        tab: "skills",
        type: "agent-skill",
        exclusive: false,
        installed: false,
        active: false,
        settings: {
            maxFilesPerRun: 25,
            requireConfirmationForWrites: true
        }
    },
    {
        id: "skill-test-runner",
        name: "Automated Test Runner Skill",
        tab: "skills",
        type: "agent-skill",
        exclusive: false,
        installed: false,
        active: false,
        settings: {
            timeoutMs: 15000
        }
    }
];

module.exports = { initialExtensions };