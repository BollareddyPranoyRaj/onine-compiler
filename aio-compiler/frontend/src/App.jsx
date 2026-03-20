import { useState } from 'react';
import CodeEditor from './CodeEditor';
import Console from './Console';

const LANGUAGE_OPTIONS = [
  {
    id: 'java',
    label: 'Java',
    editorLanguage: 'java',
    starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from BPR CodeLab!");
    }
}`
  },
  {
    id: 'python',
    label: 'Python',
    editorLanguage: 'python',
    starterCode: `print("Hello from Python!")`
  },
  {
    id: 'c',
    label: 'C',
    editorLanguage: 'c',
    starterCode: `#include <stdio.h>

int main(void) {
    printf("Hello from C!\\n");
    return 0;
}`
  },
  {
    id: 'cpp',
    label: 'C++',
    editorLanguage: 'cpp',
    starterCode: `#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}`
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    editorLanguage: 'javascript',
    starterCode: `console.log("Hello from JavaScript!");`
  }
];

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [aiAction, setAiAction] = useState('fix');
  const [code, setCode] = useState(LANGUAGE_OPTIONS[0].starterCode);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  async function runCode() {
    setRunning(true);
    setOutput(`Compiling and running ${getLanguageConfig(selectedLanguage).label}...`);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, stdin, language: selectedLanguage })
      }); 

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): ${errorText}`);
      }

      if (!contentType || !contentType.includes("application/json")) {
        const plainText = await response.text();
        throw new Error(`Expected JSON but got: ${plainText.substring(0, 100)}...`);
      }

      const json = await response.json();
      const parts = [];
      if (json.stdout) parts.push(json.stdout);
      if (json.stderr) parts.push("ERROR:\n" + json.stderr);

      setOutput(parts.join("\n") || "No output.");
    } catch (error) {
      console.error("Fetch error:", error);
      setOutput(`Error: ${error.message}`);
    } finally {
      setRunning(false);
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
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: aiAction,
          code,
          language: selectedLanguage
        })
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

  return (
    <div className="app">
      <header className="header app-header">
        <div className="header-title-group">
          <h1>BPR CodeLab</h1>
          <div className="language-picker">
            <label htmlFor="language-select">Language</label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={handleLanguageChange}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="language-picker">
            <label htmlFor="ai-action-select">AI Mode</label>
            <select
              id="ai-action-select"
              value={aiAction}
              onChange={(event) => setAiAction(event.target.value)}
            >
              <option value="fix">Fix Code</option>
              <option value="explain">Explain Code</option>
              <option value="optimize">Optimize Code</option>
            </select>
          </div>
        </div>
        <div className="controls">
          <button onClick={runCode} disabled={running} style={{ marginRight: '10px' }}>
            {running ? "Running..." : "Run Code"}
          </button>
          <button onClick={handleAiAction} disabled={aiLoading} style={{ marginRight: '10px' }}>
            {aiLoading ? 'AI Working...' : 'Ask AI'}
          </button>
          <button onClick={() => setOutput("")}>Clear Console</button>
        </div>
      </header>

      <main className="main-content compiler-layout">
        <section className="editor-area" style={{ flex: 2, borderRight: '1px solid #ccc' }}>
          <CodeEditor
            code={code}
            language={getLanguageConfig(selectedLanguage).editorLanguage}
            onChange={setCode}
          />
        </section>

        <aside className="side-area compiler-sidebar">
          <div className="stdin-area" style={{ marginBottom: '20px' }}>
            <label><strong>Input (stdin):</strong></label>
            <textarea
              style={{ width: '100%', height: '100px', marginTop: '5px' }}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter inputs here..."
            />
          </div>
          <Console output={output} />
        </aside>
      </main>
    </div>
  );
}
