import React from "react";

export default function Console({ output }) {
  return (
    <div className="console">
      <div className="console-header">Console</div>
      <pre className="console-body">{output}</pre>
    </div>
  );
}
