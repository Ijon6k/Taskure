#!/usr/bin/env bun
/**
 * Kanban Project — Developer CLI Launcher
 * Minimalist, dependency-free interactive development environment manager.
 * Usage: ./scripts/dev.ts or bun scripts/dev.ts
 */

import { spawnSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ─── Minimalist Terminal Styling (ANSI) ───────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

function print(text: string) {
  process.stdout.write(text + "\n");
}

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[0;0H");
}

// ─── Environment Helper ────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), ".env");
  const env: Record<string, string> = {};
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valParts] = trimmed.split("=");
        env[key.trim()] = valParts.join("=").trim();
      }
    }
  }
  return env;
}

const envVars = loadEnv();
const PORT_WEB = envVars["PORT_WEB"] || process.env["PORT_WEB"] || "3000";
const PORT_API = envVars["PORT_API"] || process.env["PORT_API"] || "4000";

// ─── Categorized Menu Options Definition ─────────────────────────────────────

interface PresetOption {
  id: string;
  name: string;
  description: string;
  isHeader?: boolean;
}

const PRESET_OPTIONS: PresetOption[] = [
  // Section 1: Development Modes
  { id: "h-dev", name: "DEVELOPMENT MODES", description: "", isHeader: true },
  {
    id: "frontend-fast",
    name: "Frontend Dev Mode (Fast Pre-built Backend)",
    description: `Instant backend startup (pre-built images) + Hot-reload Next.js on host (http://localhost:${PORT_WEB}).`,
  },
  {
    id: "frontend-dev",
    name: "Frontend Dev Mode (Hot-Reload Dev Backend)",
    description: `Runs Next.js on host (http://localhost:${PORT_WEB}) + Hot-reload backend in Docker (${PORT_API}).`,
  },
  {
    id: "full",
    name: "Full Stack Docker Mode",
    description: "Runs all services (Frontend, Backend, DB) inside hot-reload Docker containers.",
  },

  // Section 2: Rebuild & Maintenance
  { id: "h-rebuild", name: "CONTAINER REBUILD & MAINTENANCE", description: "", isHeader: true },
  {
    id: "rebuild-backend",
    name: "Rebuild Backend Containers (Go API & AI)",
    description: "Forces a full rebuild of backend Docker images (api & ai) with --build flag.",
  },
  {
    id: "rebuild-all",
    name: "Rebuild All Docker Containers",
    description: "Forces a full rebuild of all service Docker images with --build flag.",
  },

  // Section 3: Data & Database Management
  { id: "h-data", name: "DATABASE & DATA MANAGEMENT", description: "", isHeader: true },
  {
    id: "reset-data",
    name: "Reset App Database & Volumes (Fresh Start)",
    description: "Stops containers & wipes Postgres/Redis/MinIO data volumes for a fresh state.",
  },
  {
    id: "services",
    name: "Infrastructure Services Only",
    description: "Runs PostgreSQL, Redis, and MinIO storage in Docker.",
  },

  // Section 4: Control & Stop
  { id: "h-control", name: "CONTROL & STOP", description: "", isHeader: true },
  {
    id: "custom",
    name: "Custom Service Selection",
    description: "Interactively toggle individual Docker services.",
  },
  {
    id: "stop",
    name: "Stop All Running Containers",
    description: "Stops and removes all running development containers without losing data.",
  },
  {
    id: "clean-all",
    name: "Clean Stop + Remove Volumes (Wipe All)",
    description: "Stops containers, removes volumes, and cleans orphan instances.",
  },
];

interface CustomServiceOption {
  id: string;
  name: string;
  checked: boolean;
}

const CUSTOM_SERVICES: CustomServiceOption[] = [
  { id: "postgres", name: "PostgreSQL (Database)", checked: true },
  { id: "minio", name: "MinIO (Object Storage)", checked: true },
  { id: "api", name: "Go API Backend", checked: true },
  { id: "ai", name: "Python AI Service", checked: true },
  { id: "web", name: "Next.js Web Frontend", checked: false },
];

// ─── Interactive Terminal Key Listener ───────────────────────────────────────

async function selectMenuOption(
  title: string,
  options: PresetOption[]
): Promise<number> {
  // Find initial non-header option
  let selectedIndex = options.findIndex((opt) => !opt.isHeader);
  if (selectedIndex === -1) selectedIndex = 0;

  const getNextSelectableIndex = (current: number, dir: 1 | -1): number => {
    let next = (current + dir + options.length) % options.length;
    while (options[next].isHeader) {
      next = (next + dir + options.length) % options.length;
    }
    return next;
  };

  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const render = () => {
      clearScreen();
      print(`${BOLD}--- ${title} ---${RESET}`);
      print(`${DIM}Use UP/DOWN arrows to navigate, ENTER to select, ESC/Ctrl+C to quit${RESET}\n`);

      options.forEach((opt, idx) => {
        if (opt.isHeader) {
          print(`\n ${BOLD}${CYAN}--- ${opt.name} ---${RESET}`);
          return;
        }

        const isSelected = idx === selectedIndex;
        const prefix = isSelected ? `${CYAN}> ` : "   ";
        const label = isSelected
          ? `${BOLD}${CYAN}${opt.name}${RESET}`
          : `${opt.name}`;

        print(`${prefix}${label}`);
        if (isSelected && opt.description) {
          print(`     ${DIM}${opt.description}${RESET}`);
        }
      });
      print("");
    };

    render();

    const onData = (key: string) => {
      if (key === "\u0003" || key === "\u001b") {
        // Ctrl+C or ESC
        cleanup();
        print(`\n${YELLOW}Operation cancelled.${RESET}`);
        process.exit(0);
      } else if (key === "\r" || key === "\n") {
        // Enter
        cleanup();
        resolve(selectedIndex);
      } else if (key === "\u001b[A") {
        // Up arrow
        selectedIndex = getNextSelectableIndex(selectedIndex, -1);
        render();
      } else if (key === "\u001b[B") {
        // Down arrow
        selectedIndex = getNextSelectableIndex(selectedIndex, 1);
        render();
      }
    };

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    stdin.on("data", onData);
  });
}

async function customCheckboxMenu(
  services: CustomServiceOption[]
): Promise<string[]> {
  let cursor = 0;
  const items = services.map((s) => ({ ...s }));

  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const render = () => {
      clearScreen();
      print(`${BOLD}--- Custom Service Selection ---${RESET}`);
      print(
        `${DIM}Use UP/DOWN to navigate, SPACE to toggle, ENTER to confirm, ESC to cancel${RESET}\n`
      );

      items.forEach((item, idx) => {
        const isCursor = idx === cursor;
        const pointer = isCursor ? `${CYAN}> ` : "  ";
        const check = item.checked ? `${GREEN}[x]${RESET}` : `${DIM}[ ]${RESET}`;
        const label = isCursor
          ? `${BOLD}${CYAN}${item.name}${RESET}`
          : item.name;

        print(`${pointer}${check} ${label}`);
      });
      print("");
    };

    render();

    const onData = (key: string) => {
      if (key === "\u0003" || key === "\u001b") {
        cleanup();
        print(`\n${YELLOW}Operation cancelled.${RESET}`);
        process.exit(0);
      } else if (key === " ") {
        items[cursor].checked = !items[cursor].checked;
        render();
      } else if (key === "\r" || key === "\n") {
        cleanup();
        const selected = items.filter((i) => i.checked).map((i) => i.id);
        resolve(selected);
      } else if (key === "\u001b[A") {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key === "\u001b[B") {
        cursor = (cursor + 1) % items.length;
        render();
      }
    };

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    stdin.on("data", onData);
  });
}

// ─── Execution Logic ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Quick CLI flag handling
  if (args.includes("--help") || args.includes("-h")) {
    print(`${BOLD}Kanban Dev Launcher CLI${RESET}`);
    print(`Usage: ./scripts/dev.ts [options]`);
    print(`Options:`);
    print(`  --help, -h          Show this help menu`);
    print(`  --rebuild-backend   Force rebuild backend containers (api, ai)`);
    print(`  --rebuild-api       Force rebuild Go API container only`);
    print(`  --rebuild-all       Force rebuild all Docker containers`);
    print(`  --reset-data, -v    Reset app database & storage volumes (fresh start)`);
    print(`  --clean-all         Stop containers, remove volumes and orphan instances`);
    print(`  --stop              Stop all running dev containers`);
    process.exit(0);
  }

  if (args.includes("--reset-data") || args.includes("-v") || args.includes("--wipe")) {
    resetAppData();
    process.exit(0);
  }

  if (args.includes("--clean-all")) {
    cleanAllAndStop();
    process.exit(0);
  }

  if (args.includes("--rebuild-backend")) {
    rebuildBackend();
    process.exit(0);
  }

  if (args.includes("--rebuild-api")) {
    rebuildApiOnly();
    process.exit(0);
  }

  if (args.includes("--rebuild-all") || args.includes("--rebuild")) {
    rebuildAll();
    process.exit(0);
  }

  if (args.includes("--stop")) {
    stopContainers();
    process.exit(0);
  }

  const selectedIdx = await selectMenuOption(
    "Kanban Project — Developer CLI Launcher",
    PRESET_OPTIONS
  );
  const choice = PRESET_OPTIONS[selectedIdx].id;

  if (choice === "stop") {
    stopContainers();
  } else if (choice === "reset-data") {
    resetAppData();
  } else if (choice === "clean-all") {
    cleanAllAndStop();
  } else if (choice === "frontend-fast") {
    runFrontendFastMode();
  } else if (choice === "frontend-dev" || choice === "frontend") {
    runFrontendDevMode();
  } else if (choice === "rebuild-backend") {
    rebuildBackend();
  } else if (choice === "rebuild-all") {
    rebuildAll();
  } else if (choice === "full") {
    runDockerCompose(["--profile", "full", "up", "-d"]);
  } else if (choice === "services") {
    runDockerCompose(["--profile", "services", "up", "-d"]);
  } else if (choice === "custom") {
    const selectedServices = await customCheckboxMenu(CUSTOM_SERVICES);
    if (selectedServices.length === 0) {
      print(`${YELLOW}No services selected. Exiting.${RESET}`);
      process.exit(0);
    }
    print(`\n${DIM}Starting selected services: ${selectedServices.join(", ")}${RESET}`);
    runDockerCompose(["up", "-d", ...selectedServices]);
  }
}

function detectContainerEngine(): { binary: string; composeArgs: string[]; name: string } {
  try {
    const res = spawnSync("podman", ["ps"], { encoding: "utf-8" });
    if (res.status === 0) {
      return { binary: "podman", composeArgs: ["compose"], name: "Podman" };
    }
  } catch {}

  try {
    const res = spawnSync("podman-compose", ["version"], { encoding: "utf-8" });
    if (res.status === 0) {
      return { binary: "podman-compose", composeArgs: [], name: "Podman-Compose" };
    }
  } catch {}

  return { binary: "docker", composeArgs: ["compose"], name: "Docker" };
}

function rebuildBackend() {
  print(`\n${CYAN}Rebuilding backend Docker containers (api, ai)...${RESET}`);
  runDockerCompose(["up", "-d", "--build", "api", "ai"]);
  print(`\n${GREEN}Backend containers rebuilt and started successfully.${RESET}\n`);
}

function rebuildApiOnly() {
  print(`\n${CYAN}Rebuilding Go API Docker container...${RESET}`);
  runDockerCompose(["up", "-d", "--build", "api"]);
  print(`\n${GREEN}Go API container rebuilt and started successfully.${RESET}\n`);
}

function rebuildAll() {
  print(`\n${CYAN}Rebuilding all Docker containers...${RESET}`);
  runDockerCompose(["--profile", "full", "up", "-d", "--build"]);
  print(`\n${GREEN}All containers rebuilt and started successfully.${RESET}\n`);
}

function resetAppData() {
  const engine = detectContainerEngine();
  print(`\n${YELLOW}Wiping app database & storage volumes using ${engine.name}...${RESET}`);
  const fullArgs = [
    ...engine.composeArgs,
    "-f",
    "compose.yaml",
    "-f",
    "compose.dev.yaml",
    "--profile",
    "*",
    "down",
    "-v",
    "--remove-orphans",
  ];
  const res = spawnSync(engine.binary, fullArgs, { stdio: "inherit" });

  if (res.status !== 0 && engine.binary !== "docker") {
    print(`${YELLOW}Podman command failed, falling back to Docker Compose...${RESET}`);
    spawnSync(
      "docker",
      [
        "compose",
        "-f",
        "compose.yaml",
        "-f",
        "compose.dev.yaml",
        "--profile",
        "*",
        "down",
        "-v",
        "--remove-orphans",
      ],
      { stdio: "inherit" }
    );
  }

  print(`\n${GREEN}[OK] App database & volumes wiped successfully.${RESET}`);
  print(`${CYAN}Next start will launch with a fresh database & auto-migration.${RESET}\n`);
}

function cleanAllAndStop() {
  resetAppData();
}

function stopContainers() {
  const engine = detectContainerEngine();
  print(`\n${YELLOW}Stopping development containers using ${engine.name}...${RESET}`);
  const fullArgs = [
    ...engine.composeArgs,
    "-f",
    "compose.yaml",
    "-f",
    "compose.dev.yaml",
    "--profile",
    "*",
    "down",
    "--remove-orphans",
  ];
  const res = spawnSync(engine.binary, fullArgs, { stdio: "inherit" });

  if (res.status !== 0 && engine.binary !== "docker") {
    print(`${YELLOW}Podman command failed, falling back to Docker Compose...${RESET}`);
    spawnSync(
      "docker",
      [
        "compose",
        "-f",
        "compose.yaml",
        "-f",
        "compose.dev.yaml",
        "--profile",
        "*",
        "down",
        "--remove-orphans",
      ],
      { stdio: "inherit" }
    );
  }

  print(`${GREEN}Containers stopped successfully.${RESET}\n`);
}

function runProdDockerCompose(args: string[]) {
  let engine = detectContainerEngine();
  let fullArgs = [...engine.composeArgs, "-f", "compose.yaml", ...args];
  print(`\n${CYAN}Running (${engine.name}): ${engine.binary} ${fullArgs.join(" ")}${RESET}\n`);
  let result = spawnSync(engine.binary, fullArgs, { stdio: "inherit" });

  if (result.status !== 0 && engine.binary !== "docker") {
    print(`\n${YELLOW}Podman command failed, falling back to Docker Compose...${RESET}\n`);
    const dockerArgs = ["compose", "-f", "compose.yaml", ...args];
    result = spawnSync("docker", dockerArgs, { stdio: "inherit" });
  }

  if (result.status !== 0) {
    print(`\n${RED}Command failed.${RESET}`);
    process.exit(1);
  }
}

function runDockerCompose(args: string[]) {
  let engine = detectContainerEngine();
  let fullArgs = [
    ...engine.composeArgs,
    "-f",
    "compose.yaml",
    "-f",
    "compose.dev.yaml",
    "--profile",
    "*",
    ...args,
  ];
  print(`\n${CYAN}Running (${engine.name}): ${engine.binary} ${fullArgs.join(" ")}${RESET}\n`);
  let result = spawnSync(engine.binary, fullArgs, { stdio: "inherit" });

  if (result.status !== 0 && engine.binary !== "docker") {
    print(`\n${YELLOW}Podman command failed, falling back to Docker Compose...${RESET}\n`);
    const dockerArgs = [
      "compose",
      "-f",
      "compose.yaml",
      "-f",
      "compose.dev.yaml",
      "--profile",
      "*",
      ...args,
    ];
    result = spawnSync("docker", dockerArgs, { stdio: "inherit" });
  }

  if (result.status !== 0) {
    print(`\n${RED}Command failed.${RESET}`);
    process.exit(1);
  }
}

function runFrontendFastMode() {
  print(`\n${CYAN}Starting pre-built production backend containers in Docker (Fast Mode)...${RESET}`);
  runProdDockerCompose(["up", "-d", "postgres", "minio", "api", "ai"]);

  print(`\n${GREEN}Backend infrastructure is ready on port ${PORT_API}.${RESET}`);
  print(`${CYAN}Launching Next.js frontend on host via Bun (http://localhost:${PORT_WEB})...${RESET}\n`);

  const child = spawn("bun", ["--cwd", "frontend", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: PORT_WEB,
      PORT_API: PORT_API,
    },
  });

  child.on("exit", (code) => {
    print(`\n${DIM}Frontend dev server exited with code ${code}.${RESET}`);
    process.exit(code || 0);
  });
}

function runFrontendDevMode() {
  print(`\n${CYAN}Starting backend infrastructure containers in Docker...${RESET}`);
  runDockerCompose(["up", "-d", "postgres", "minio", "api"]);

  print(`\n${GREEN}Backend infrastructure is ready on port ${PORT_API}.${RESET}`);
  print(`${CYAN}Launching Next.js frontend on host via Bun (http://localhost:${PORT_WEB})...${RESET}\n`);

  const child = spawn("bun", ["--cwd", "frontend", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: PORT_WEB,
      PORT_API: PORT_API,
    },
  });

  child.on("exit", (code) => {
    print(`\n${DIM}Frontend dev server exited with code ${code}.${RESET}`);
    process.exit(code || 0);
  });
}

main().catch((err) => {
  print(`\n${RED}Error: ${err.message}${RESET}`);
  process.exit(1);
});
