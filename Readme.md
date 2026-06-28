# 🚀 BPR CodeLab

[![Live Demo](https://img.shields.io/badge/Live_Demo-bprcodelab.dev-blue?style=for-the-badge)](https://bprcodelab.dev/)
[![React](https://img.shields.io/badge/Frontend-React_&_Vite-61DAFB?style=for-the-badge&logo=react)](#)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js)](#)
[![Docker](https://img.shields.io/badge/Containerized-Docker-2496ED?style=for-the-badge&logo=docker)](#)

BPR CodeLab is a blazing-fast, multi-language online compiler built to eliminate context switching. It integrates AI directly into the coding environment, allowing developers to write, execute, fix, and optimize code without ever leaving the page.

---

## 🛑 The Problem
Traditional online compilers lack built-in intelligence. When you hit a bug or runtime error, you are forced to copy your code, open a new tab, paste it into an AI tool like ChatGPT, and manually copy the fix back. This constant tab-switching destroys developer momentum and focus.

## ✅ The Solution
BPR CodeLab solves this by bringing the AI directly into the code editor. 

With a single click, the integrated AI analyzes your code, **updates it directly inside the editor box**, and outputs a simple, clear explanation in the console below. Zero context switching. Pure productivity.

---

## ✨ Key Features
*   **Multi-Language Support:** Seamlessly switch and compile C, C++, Java, Python, and JavaScript instantly.
*   **Lightning-Fast Execution:** Optimized backend architecture ensures sub-second compilation and output.
*   **In-Editor AI Fix:** Hit an error? Click "Fix" and watch the AI instantly correct your code right in the editor while explaining the solution in the console.
*   **In-Editor AI Optimize:** Click "Optimize" to let the AI refactor your logic for better performance and readability.
*   **In-Editor AI Explain:** Highlight complex algorithms and click "Explain" to get a simple, line-by-line breakdown in the output console.

---

## 🏗️ Tech Stack & Architecture

This project is structured as a full-stack monorepo:
*   **Frontend:** React.js powered by Vite, providing a highly responsive and fluid UI.
*   **Backend:** Node.js (`server.js`) handling compilation execution and AI API routing.
*   **Containerization:** Docker & Docker Compose configured for both development and production environments.
*   **CI/CD & Deployment:** Configured with GitHub Actions (`ci.yml`) and ready for Render (`render.yaml`).

---

## 📂 Project Structure
```text
bollareddypranoyraj/onine-compiler/
├── .github/workflows/       # CI/CD pipelines (ci.yml)
├── aio-compiler/
│   ├── backend/             # Node.js backend handling compilation & AI
│   │   └── server.js        
│   ├── frontend/            # React + Vite frontend application
│   │   ├── src/             
│   │   │   ├── App.jsx      # Main application component
│   │   │   ├── CodeEditor.jsx # Editor component with AI integration
│   │   │   └── Console.jsx  # Output and explanation terminal
│   │   ├── package.json     
│   │   └── vite.config.js   
│   ├── Dockerfile.backend   # Docker configuration for the backend
│   ├── docker-compose.yml   # Production Docker setup
│   ├── docker-compose.dev.yml # Local development Docker setup
│   ├── DEPLOYMENT.md        # Deployment instructions
│   └── DOCKER.md            # Docker documentation
├── render.yaml              # Render cloud deployment configuration
└── package.json             # Root package configurations

```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher)
* [Docker](https://www.docker.com/) (Optional, but recommended)

### Standard Installation

1. **Clone the repository:**
```bash
git clone [https://github.com/bollareddypranoyraj/onine-compiler.git](https://github.com/bollareddypranoyraj/onine-compiler.git)
cd onine-compiler/aio-compiler

```


2. **Set up environment variables:**
Copy the example environment file and add your necessary API keys (e.g., AI integration keys).
```bash
cp .env.example .env

```


3. **Install Frontend Dependencies & Run:**
```bash
cd frontend
npm install
npm run dev

```


4. **Install Backend Dependencies & Run:**
```bash
cd ../backend
npm install
node server.js

```



### Docker Installation

If you prefer using Docker for a seamless setup, you can spin up the entire full-stack environment using the provided compose files.

```bash
cd aio-compiler
# For local development
docker-compose -f docker-compose.dev.yml up --build

```

*(Refer to `aio-compiler/DOCKER.md` and `aio-compiler/DEPLOYMENT.md` for detailed containerization and deployment steps).*

---

## 🌐 Live Application

Experience the compiler live at: **[https://bprcodelab.dev/](https://bprcodelab.dev/)**

---

## 👨‍💻 Author

Built by **Bollareddy Pranoy Raj**

```
