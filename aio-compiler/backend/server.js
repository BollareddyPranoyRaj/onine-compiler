import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import prettier from 'prettier';
import prettierPluginJava from 'prettier-plugin-java';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '127.0.0.1';

// --- RESOURCE SIZES ---
const MAX_CODE_SIZE = 128 * 1024;    // Toggled to 128 KB (Standard for large solutions/boilerplate)
const MAX_STDIN_SIZE = 512 * 1024;   // Toggled to 512 KB (Standard competitive programming inputs)
const MAX_OUTPUT_SIZE = 512 * 1024;  // Toggled to 512 KB (Prevents infinite loop stdout spam but allows large test cases)

// --- TIMEOUTS ---
const COMPILE_TIMEOUT_MS = 10_000;   // Toggled to 10s (Heavy templates like C++ STL or Bootstrapping Java take time)
const RUN_TIMEOUT_MS = 5_000;        // Toggled to 5s (Standard max for execution; platform defaults are usually 2s to 5s)
const FORMAT_TIMEOUT_MS = 3_000;     // Toggled to 3s (Prettier/Black formatters are fast; 5s was overly generous)

// --- MEMORY LIMITS ---
const JAVA_HEAP_MB = 256;            // Toggled to 256 MB (Modern OpenJDK instances struggle on 128 MB just booting up)
// *Note: If you run C++/Python, enforce a global container memory limit around 256MB–512MB.

// --- ENVIRONMENT & INFRASTRUCTURE ---
const TEMP_ROOT = path.join(__dirname, 'temp');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || ''
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Extracts the public class name from Java source code
function getJavaClassName(code) {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? match[1] : 'Main';
}

const LANGUAGE_CONFIGS = {
  java: {
    getFileName: (code) => `${getJavaClassName(code)}.java`,
    compile: {
      command: 'javac',
      args: (folderPath, code) => [`-J-Xmx${JAVA_HEAP_MB}m`, `${getJavaClassName(code)}.java`],
      timeoutMs: COMPILE_TIMEOUT_MS
    },
    format: {
      type: 'prettier',
      options: {
        parser: 'java',
        plugins: [prettierPluginJava],
        tabWidth: 4
      }
    },
    run: {
      command: 'java',
      args: (folderPath, code) => [`-Xmx${JAVA_HEAP_MB}m`, '-cp', folderPath, getJavaClassName(code)],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  python: {
    getFileName: () => 'main.py',
    fileName: 'main.py',
    format: {
      type: 'command',
      command: 'python3',
      args: (fileName) => ['-m', 'black', '--quiet', fileName],
      timeoutMs: FORMAT_TIMEOUT_MS
    },
    run: {
      command: 'python3',
      args: () => ['main.py'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  c: {
    fileName: 'main.c',
    format: {
      type: 'command',
      command: 'clang-format',
      args: (fileName) => ['-i', fileName],
      timeoutMs: FORMAT_TIMEOUT_MS
    },
    compile: {
      command: 'gcc',
      args: () => ['main.c', '-O2', '-o', 'main'],
      timeoutMs: COMPILE_TIMEOUT_MS
    },
    run: {
      command: './main',
      args: () => [],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  cpp: {
    fileName: 'main.cpp',
    format: {
      type: 'command',
      command: 'clang-format',
      args: (fileName) => ['-i', fileName],
      timeoutMs: FORMAT_TIMEOUT_MS
    },
    compile: {
      command: 'g++',
      args: () => ['main.cpp', '-O2', '-std=c++17', '-o', 'main'],
      timeoutMs: COMPILE_TIMEOUT_MS
    },
    run: {
      command: './main',
      args: () => [],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  javascript: {
    fileName: 'main.js',
    format: {
      type: 'prettier',
      options: {
        parser: 'babel',
        semi: true,
        singleQuote: true
      }
    },
    run: {
      command: 'node',
      args: () => ['main.js'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  typescript: {
    fileName: 'main.ts',
    format: {
      type: 'prettier',
      options: {
        parser: 'typescript',
        semi: true,
        singleQuote: true
      }
    },
    run: {
      command: 'npx',
      args: () => ['tsx', 'main.ts'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  go: {
    fileName: 'main.go',
    format: {
      type: 'command',
      command: 'gofmt',
      args: (fileName) => ['-w', fileName],
      timeoutMs: FORMAT_TIMEOUT_MS
    },
    run: {
      command: 'go',
      args: () => ['run', 'main.go'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  rust: {
    fileName: 'main.rs',
    format: {
      type: 'command',
      command: 'rustfmt',
      args: (fileName) => [fileName],
      timeoutMs: FORMAT_TIMEOUT_MS
    },
    compile: {
      command: 'rustc',
      args: () => ['main.rs', '-o', 'main'],
      timeoutMs: COMPILE_TIMEOUT_MS
    },
    run: {
      command: './main',
      args: () => [],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  ruby: {
    fileName: 'main.rb',
    run: {
      command: 'ruby',
      args: () => ['main.rb'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  php: {
    fileName: 'main.php',
    run: {
      command: 'php',
      args: () => ['main.php'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  swift: {
    fileName: 'main.swift',
    compile: {
      command: 'swiftc',
      args: () => ['main.swift', '-o', 'main'],
      timeoutMs: COMPILE_TIMEOUT_MS
    },
    run: {
      command: './main',
      args: () => [],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  perl: {
    fileName: 'main.pl',
    run: {
      command: 'perl',
      args: () => ['main.pl'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  bash: {
    fileName: 'main.sh',
    run: {
      command: 'bash',
      args: () => ['main.sh'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  lua: {
    fileName: 'main.lua',
    run: {
      command: 'lua',
      args: () => ['main.lua'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  },
  kotlin: {
    fileName: 'main.kt',
    compile: {
      command: 'kotlinc',
      args: () => ['main.kt', '-include-runtime', '-d', 'main.jar'],
      timeoutMs: COMPILE_TIMEOUT_MS
    },
    run: {
      command: 'java',
      args: () => ['-jar', 'main.jar'],
      timeoutMs: RUN_TIMEOUT_MS
    }
  }
};

const app = express();
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Allow if no restrictions set
    if (CORS_ALLOWED_ORIGINS.length === 0) return callback(null, true);

    // Allow exact match from env variable
    if (CORS_ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    // Allow any Vercel deployment (*.vercel.app) and allow bprcodelab.dev domains
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    if (origin === 'https://bprcodelab.dev' || origin === 'https://www.bprcodelab.dev') return callback(null, true);

    // Reject — return null, false (not an Error) to avoid 500
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Explicitly handle preflight OPTIONS requests (Express 5 compatible)
app.options(/.*/, (req, res) => {
  res.sendStatus(200);
});
app.use(express.json({ limit: '100kb' }));

fs.mkdirSync(TEMP_ROOT, { recursive: true });

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function getAiActionPrompt(action, language) {
  if (action === 'explain') {
    return `You are an expert programming tutor. Explain the ${language} code clearly. Explain purpose, logic, key variables, and complexity. Do not assume a problem statement.`;
  }

  if (action === 'optimize') {
    return `You are an expert ${language} engineer. Improve readability, maintainability, and performance while preserving behavior. Explain changes briefly.`;
  }

  return `You are an expert ${language} debugging assistant. Fix syntax, compilation, and runtime errors while preserving the author's intent. Do not modify algorithms, formulas, constants, offsets (+1/-1), loop bounds, or output logic unless the bug is certain. If unsure, explain instead of guessing.`;
}

function cleanupDir(folderPath) {
  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

function killProcessTree(child) {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill('SIGKILL');
  } catch (error) {
    console.error('Failed to kill child process:', error);
  }
}

function runCommand(command, args, options = {}) {
  const {
    cwd,
    stdin = '',
    timeoutMs,
    maxOutputBytes = MAX_OUTPUT_SIZE
  } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: {
        PATH: process.env.PATH || '',
        JAVA_HOME: process.env.JAVA_HOME || ''
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    let settled = false;

    const settle = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(result);
    };

    const appendChunk = (chunk, streamName) => {
      const text = chunk.toString();
      const bytes = Buffer.byteLength(text);

      if (streamName === 'stdout') {
        stdoutBytes += bytes;
        if (stdoutBytes <= maxOutputBytes) {
          stdout += text;
        }
      } else {
        stderrBytes += bytes;
        if (stderrBytes <= maxOutputBytes) {
          stderr += text;
        }
      }

      if (stdoutBytes + stderrBytes > maxOutputBytes) {
        outputExceeded = true;
        killProcessTree(child);
      }
    };

    child.stdout.on('data', (chunk) => appendChunk(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => appendChunk(chunk, 'stderr'));

    child.on('error', (error) => {
      settle({
        ok: false,
        exitCode: 1,
        stdout,
        stderr: error.message
      });
    });

    child.on('close', (code, signal) => {
      if (timedOut) {
        settle({
          ok: false,
          exitCode: 124,
          stdout,
          stderr: `Execution timed out after ${timeoutMs}ms`
        });
        return;
      }

      if (outputExceeded) {
        settle({
          ok: false,
          exitCode: 413,
          stdout,
          stderr: `Output exceeded ${maxOutputBytes} bytes`
        });
        return;
      }

      settle({
        ok: code === 0,
        exitCode: code ?? 1,
        signal,
        stdout,
        stderr
      });
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeoutMs);

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

async function formatWithPrettier(code, options) {
  return prettier.format(code, options);
}

async function formatWithCommand(code, languageConfig) {
  const requestId = uuidv4();
  const folderPath = path.join(TEMP_ROOT, `format-${requestId}`);
  const fileName = languageConfig.getFileName
    ? languageConfig.getFileName(code)
    : languageConfig.fileName;
  const filePath = path.join(folderPath, fileName);

  try {
    fs.mkdirSync(folderPath, { recursive: true, mode: 0o700 });
    fs.writeFileSync(filePath, code, { encoding: 'utf8', mode: 0o600 });

    const formatConfig = languageConfig.format;
    const formatResult = await runCommand(
      formatConfig.command,
      formatConfig.args(fileName),
      {
        cwd: folderPath,
        timeoutMs: formatConfig.timeoutMs
      }
    );

    if (!formatResult.ok) {
      throw new Error(formatResult.stderr || formatResult.stdout || 'Formatter failed.');
    }

    return fs.readFileSync(filePath, 'utf8');
  } finally {
    cleanupDir(folderPath);
  }
}

async function formatCode(code, languageConfig) {
  const formatConfig = languageConfig.format;

  if (!formatConfig) {
    throw new Error('No formatter is configured for this language.');
  }

  if (formatConfig.type === 'prettier') {
    return formatWithPrettier(code, formatConfig.options);
  }

  if (formatConfig.type === 'command') {
    return formatWithCommand(code, languageConfig);
  }

  throw new Error(`Unsupported formatter type: ${formatConfig.type}`);
}

app.post('/api/format', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const language = typeof req.body?.language === 'string' ? req.body.language : 'java';
  const languageConfig = LANGUAGE_CONFIGS[language];

  if (!code.trim()) {
    return res.status(400).json({
      message: 'No code provided.',
      formattedCode: code,
      didChangeCode: false
    });
  }

  if (!languageConfig) {
    return res.status(400).json({
      message: `Unsupported language: ${language}`,
      formattedCode: code,
      didChangeCode: false
    });
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
    return res.status(413).json({
      message: `Code exceeds ${MAX_CODE_SIZE} bytes limit`,
      formattedCode: code,
      didChangeCode: false
    });
  }

  try {
    const formattedCode = await formatCode(code, languageConfig);

    return res.json({
      message: formattedCode === code ? 'Code is already formatted.' : 'Code formatted successfully.',
      formattedCode,
      didChangeCode: formattedCode !== code
    });
  } catch (error) {
    console.error('Format request failed:', error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Formatting failed.',
      formattedCode: code,
      didChangeCode: false
    });
  }
});

app.post('/api/ai', async (req, res) => {
  const genAI = getGeminiClient();
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const language = typeof req.body?.language === 'string' ? req.body.language : 'java';
  const action = typeof req.body?.action === 'string' ? req.body.action : 'fix';

  if (!genAI) {
    return res.status(503).json({
      message: 'GEMINI_API_KEY is not configured on the backend.',
      updatedCode: code,
      didChangeCode: false
    });
  }

  if (!code.trim()) {
    return res.status(400).json({
      message: 'No code provided.',
      updatedCode: '',
      didChangeCode: false
    });
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
    return res.status(413).json({
      message: `Code exceeds ${MAX_CODE_SIZE} bytes limit`,
      updatedCode: code,
      didChangeCode: false
    });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: getAiActionPrompt(action, language),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            updatedCode: { type: 'string' },
            didChangeCode: { type: 'boolean' }
          },
          required: ['message', 'updatedCode', 'didChangeCode']
        }
      }
    });

    const prompt = [
      `Action: ${action}`,
      `Language: ${language}`,
      'Return a short helpful message and the best code to show in the editor.',
      'If the action is explain, keep updatedCode identical to the original unless a tiny correction is necessary.',
      '',
      'Code:',
      code
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const payload = JSON.parse(text || '{}');

    return res.json({
      message: payload.message || 'AI response received.',
      updatedCode: typeof payload.updatedCode === 'string' ? payload.updatedCode : code,
      didChangeCode: Boolean(payload.didChangeCode)
    });
  } catch (error) {
    console.error('AI request failed:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'AI request failed.',
      updatedCode: code,
      didChangeCode: false
    });
  }
});

app.post('/api/run', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const stdin = typeof req.body?.stdin === 'string' ? req.body.stdin : '';
  const language = typeof req.body?.language === 'string' ? req.body.language : 'java';
  const languageConfig = LANGUAGE_CONFIGS[language];

  if (!code.trim()) {
    return res.status(400).json({ stdout: '', stderr: 'No code provided', exitCode: 1 });
  }

  if (!languageConfig) {
    return res.status(400).json({
      stdout: '',
      stderr: `Unsupported language: ${language}`,
      exitCode: 1
    });
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
    return res.status(413).json({
      stdout: '',
      stderr: `Code exceeds ${MAX_CODE_SIZE} bytes limit`,
      exitCode: 1
    });
  }

  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_SIZE) {
    return res.status(413).json({
      stdout: '',
      stderr: `Input exceeds ${MAX_STDIN_SIZE} bytes limit`,
      exitCode: 1
    });
  }

  const requestId = uuidv4();
  const folderPath = path.join(TEMP_ROOT, requestId);

  try {
    fs.mkdirSync(folderPath, { recursive: true, mode: 0o700 });

    // For Java: dynamically detect class name so any class name works
    const fileName = languageConfig.getFileName
      ? languageConfig.getFileName(code)
      : languageConfig.fileName;

    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, code, { encoding: 'utf8', mode: 0o600 });

    if (languageConfig.compile) {
      const compileResult = await runCommand(
        languageConfig.compile.command,
        languageConfig.compile.args(folderPath, code),
        {
          cwd: folderPath,
          timeoutMs: languageConfig.compile.timeoutMs
        }
      );

      if (!compileResult.ok) {
        cleanupDir(folderPath);
        return res.json({
          stdout: compileResult.stdout,
          stderr: compileResult.stderr,
          exitCode: compileResult.exitCode
        });
      }
    }

    const runResult = await runCommand(
      languageConfig.run.command,
      languageConfig.run.args(folderPath, code),
      {
        cwd: folderPath,
        stdin,
        timeoutMs: languageConfig.run.timeoutMs
      }
    );

    cleanupDir(folderPath);
    return res.json({
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exitCode: runResult.exitCode
    });
  } catch (error) {
    cleanupDir(folderPath);
    console.error('Server Error:', error);
    return res.status(500).json({
      stdout: '',
      stderr: 'Internal Server Error during execution',
      exitCode: 1
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.send('Backend is working');
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Backend running on http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('Failed to start backend server:', error);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
  