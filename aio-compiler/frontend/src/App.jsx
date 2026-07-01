import { useEffect, useState } from 'react';
import CodeEditor from './CodeEditor';
import Console from './Console';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const LANGUAGE_OPTIONS = [
  {
    id: 'java',
    label: 'Java',
    icon: '☕',
    editorLanguage: 'java',
    starterCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // Your code here

        sc.close();
    }
}`
  },
  {
    id: 'python',
    label: 'Python',
    icon: '🐍',
    editorLanguage: 'python',
    starterCode: `def main():
    # Your code here
    pass


if __name__ == "__main__":
    main()`
  },
  {
    id: 'c',
    label: 'C',
    icon: '🔧',
    editorLanguage: 'c',
    starterCode: `#include <stdio.h>

int main() {

    // Your code here

    return 0;
}`
  },
  {
    id: 'cpp',
    label: 'C++',
    icon: '⚡',
    editorLanguage: 'cpp',
    starterCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Your code here

    return 0;
}`
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    icon: '🟡',
    editorLanguage: 'javascript',
    starterCode: `'use strict';

// Your code here

console.log("Hello, BPR CodeLab!");`
  }
];

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [aiAction, setAiAction] = useState('fix');
  const [code, setCode] = useState(LANGUAGE_OPTIONS[0].starterCode);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [formatting, setFormatting] = useState(false);

  useEffect(() => {
    const loadingScreen = document.getElementById('loading-screen');

    if (!loadingScreen) {
      return undefined;
    }

    loadingScreen.classList.add('fade-out');

    const removeTimer = window.setTimeout(() => {
      loadingScreen.remove();
    }, 600);

    return () => window.clearTimeout(removeTimer);
  }, []);

  function buildApiUrl(path) {
    return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  }

  async function runCode() {
    setRunning(true);
    setOutput(`Compiling and running ${getLanguageConfig(selectedLanguage).label}...`);
    try {
      const response = await fetch(buildApiUrl('/api/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, stdin, language: selectedLanguage })
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): ${errorText}`);
      }

      if (!contentType || !contentType.includes('application/json')) {
        const plainText = await response.text();
        throw new Error(`Expected JSON but got: ${plainText.substring(0, 100)}...`);
      }

      const json = await response.json();
      const parts = [];
      if (json.stdout) parts.push(json.stdout);
      if (json.stderr) parts.push('ERROR:\n' + json.stderr);

      setOutput(parts.join('\n') || 'No output.');
    } catch (error) {
      console.error('Fetch error:', error);
      setOutput(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function formatCode() {
    setFormatting(true);
    setOutput(`Formatting ${getLanguageConfig(selectedLanguage).label} code...`);

    try {
      const response = await fetch(buildApiUrl('/api/format'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: selectedLanguage })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Formatting failed.');
      }

      if (typeof result.formattedCode === 'string') {
        setCode(result.formattedCode);
      }

      setOutput(result.message || 'Code formatted successfully.');
    } catch (error) {
      console.error('Format error:', error);
      setOutput(`Format Error: ${error.message}`);
    } finally {
      setFormatting(false);
    }
  }

  function getLanguageConfig(languageId) {
    return LANGUAGE_OPTIONS.find((option) => option.id === languageId) || LANGUAGE_OPTIONS[0];
  }

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    const nextConfig = getLanguageConfig(nextLanguage);
    setSelectedLanguage(nextLanguage);
    setCode(nextConfig.starterCode);
    setOutput(`${nextConfig.label} selected. Ready to run.`);
  }

  async function handleAiAction() {
    setAiLoading(true);
    setOutput(`AI is ${aiAction === 'fix' ? 'fixing' : aiAction === 'explain' ? 'explaining' : 'optimizing'} your ${getLanguageConfig(selectedLanguage).label} code...`);

    try {
      const response = await fetch(buildApiUrl('/api/ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: aiAction, code, language: selectedLanguage })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'AI request failed.');
      }

      if (result.didChangeCode && typeof result.updatedCode === 'string') {
        setCode(result.updatedCode);
      }

      setOutput(result.message || 'AI response received.');
    } catch (error) {
      console.error('AI error:', error);
      setOutput(`AI Error: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  const currentLang = getLanguageConfig(selectedLanguage);

  return (
    <div className="app">

      {/* ── HEADER ── */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>

           {/* Logo */}
          <div className="logo">
            <img
              src="/1.svg"
              alt="BPR CodeLab"
              className="logo-image"
            />
          </div>
          {/* Selectors */}
          <div className="header-selectors">
            <div className="selector-group">
              <label htmlFor="language-select">Language</label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={handleLanguageChange}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label htmlFor="ai-action-select">AI Mode</label>
              <select
                id="ai-action-select"
                value={aiAction}
                onChange={(e) => setAiAction(e.target.value)}
              >
                <option value="fix">🔧 Fix Code</option>
                <option value="explain">💡 Explain</option>
                <option value="optimize">🚀 Optimize</option>
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="controls">
          <button
            id="run-code-btn"
            className="btn btn-run"
            onClick={runCode}
            disabled={running || formatting}
          >
            {running ? <><span className="spinner"></span> Running...</> : '▶ Run Code'}
          </button>
          <button
            id="format-code-btn"
            className="btn btn-format"
            onClick={formatCode}
            disabled={formatting || running}
          >
            {formatting ? <><span className="spinner"></span> Formatting...</> : '⌘ Format'}
          </button>
          <button
            id="ask-ai-btn"
            className="btn btn-ai"
            onClick={handleAiAction}
            disabled={aiLoading || formatting}
          >
            {aiLoading ? <><span className="spinner"></span> AI Working...</> : '✦ Ask AI'}
          </button>
          <button
            id="clear-console-btn"
            className="btn btn-clear"
            onClick={() => setOutput('')}
          >
            ✕ Clear
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="main-content">

        {/* Editor */}
        <section className="editor-panel">
          <div className="panel-header">
            <span className="panel-title">
              {currentLang.icon} {currentLang.label}
            </span>
            <span className="panel-badge">Editor</span>
          </div>
          <div className="editor-wrapper">
            <CodeEditor
              code={code}
              language={currentLang.editorLanguage}
              onChange={setCode}
            />
          </div>
        </section>

        {/* Sidebar */}
        <aside className="compiler-sidebar">

          {/* Stdin */}
          <div className="stdin-area">
            <div className="panel-header">
              <span className="panel-title">📥 Input (stdin)</span>
            </div>
            <textarea
              className="stdin-textarea"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter program input here..."
              spellCheck={false}
            />
          </div>

          {/* Console */}
          <div className="console-panel">
            <Console
              output={output}
              running={running}
              aiLoading={aiLoading}
              formatting={formatting}
            />
          </div>

        </aside>
      </main>

      {/* ── STATUS BAR ── */}
      <footer className="status-bar">
        <span>⚡ BPR CodeLab</span>
        <span>{currentLang.icon} {currentLang.label} · Ready</span>
      </footer>

    </div>
  );
}
