import React from "react";
import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, onChange }) {
  return (
    <div className="code-editor">
      <Editor
        height="70vh"
        defaultLanguage="java"
        language="java"
        value={code}
        onChange={(value) => onChange(value || "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
        }}
      />
    </div>
  );
}
