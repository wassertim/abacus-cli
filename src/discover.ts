import fs from "fs";
import chalk from "chalk";
import { createAuthenticatedContext } from "./auth";
import { config, ensureConfigDir } from "./config";

const SENSITIVE_REQUEST_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-csrf-token",
  "x-xsrf-token",
]);

const SENSITIVE_RESPONSE_HEADERS = new Set([
  "set-cookie",
]);

function splitHeaders(
  headers: Record<string, string>,
  sensitiveKeys: Set<string>
): { clean: Record<string, string>; sensitive: Record<string, string> } {
  const clean: Record<string, string> = {};
  const sensitive: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sensitive[key] = value;
    } else {
      clean[key] = value;
    }
  }
  return { clean, sensitive };
}

interface CapturedRequest {
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  postData: string | null;
  resourceType: string;
}

interface CapturedResponse {
  timestamp: string;
  status: number;
  url: string;
  headers: Record<string, string>;
}

interface DiscoveryEntry {
  request: CapturedRequest;
  response: CapturedResponse | null;
}

export async function discover(): Promise<void> {
  ensureConfigDir();

  console.log(chalk.bold("Starting API discovery..."));
  console.log("");
  console.log(chalk.bold("Instructions:"));
  console.log("1. Navigate to the time entry page (Leistungserfassung)");
  console.log("2. Create a time entry as you normally would");
  console.log("3. All network requests will be captured");
  console.log("4. When done, close the browser window or press Ctrl+C");
  console.log("");

  const { context, close } = await createAuthenticatedContext();
  const page = await context.newPage();

  const entries: DiscoveryEntry[] = [];

  // Intercept all network requests
  page.on("request", (request) => {
    const url = request.url();
    // Filter out static assets to reduce noise
    if (
      url.endsWith(".png") ||
      url.endsWith(".jpg") ||
      url.endsWith(".css") ||
      url.endsWith(".woff2") ||
      url.endsWith(".ico")
    ) {
      return;
    }

    const entry: DiscoveryEntry = {
      request: {
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData(),
        resourceType: request.resourceType(),
      },
      response: null,
    };
    entries.push(entry);

    // Log to console in real-time
    const short = url.length > 100 ? url.substring(0, 100) + "..." : url;
    console.log(chalk.dim(`${request.method()} ${short}`));
  });

  page.on("response", (response) => {
    const url = response.url();
    // Match response to its request entry
    const entry = entries.find(
      (e) => e.request.url === url && e.response === null
    );
    if (entry) {
      entry.response = {
        timestamp: new Date().toISOString(),
        status: response.status(),
        url: response.url(),
        headers: response.headers(),
      };
    }
  });

  await page.goto(config.abacusUrl);

  // Wait for the browser to be closed by the user
  await new Promise<void>((resolve) => {
    page.on("close", () => resolve());
    context.on("close", () => resolve());
  });

  // Split sensitive headers into separate file
  const cleanEntries: DiscoveryEntry[] = [];
  const credentialEntries: { index: number; request?: Record<string, string>; response?: Record<string, string> }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const reqSplit = splitHeaders(entry.request.headers, SENSITIVE_REQUEST_HEADERS);
    const resSplit = entry.response
      ? splitHeaders(entry.response.headers, SENSITIVE_RESPONSE_HEADERS)
      : null;

    cleanEntries.push({
      request: { ...entry.request, headers: reqSplit.clean },
      response: entry.response
        ? { ...entry.response, headers: resSplit!.clean }
        : null,
    });

    const hasSensitive =
      Object.keys(reqSplit.sensitive).length > 0 ||
      (resSplit && Object.keys(resSplit.sensitive).length > 0);

    if (hasSensitive) {
      credentialEntries.push({
        index: i,
        ...(Object.keys(reqSplit.sensitive).length > 0 && { request: reqSplit.sensitive }),
        ...(resSplit && Object.keys(resSplit.sensitive).length > 0 && { response: resSplit.sensitive }),
      });
    }
  }

  // Save clean discovery results
  const output = {
    capturedAt: new Date().toISOString(),
    totalRequests: entries.length,
    entries: cleanEntries,
  };
  fs.writeFileSync(config.discoveryPath, JSON.stringify(output, null, 2));

  // Save credentials separately
  if (credentialEntries.length > 0) {
    const credOutput = {
      capturedAt: new Date().toISOString(),
      note: "Sensitive headers (Authorization, Cookie, CSRF tokens) extracted from api-discovery.json",
      entries: credentialEntries,
    };
    fs.writeFileSync(config.credentialsPath, JSON.stringify(credOutput, null, 2));
  }

  console.log("");
  console.log(chalk.green(`Captured ${entries.length} requests.`));
  console.log(chalk.green(`Results saved to ${config.discoveryPath}`));
  if (credentialEntries.length > 0) {
    console.log(chalk.green(`Credentials saved separately to ${config.credentialsPath}`));
  }

  // Filter for likely API calls (XHR/fetch with POST/PUT/PATCH)
  const apiCalls = entries.filter(
    (e) =>
      (e.request.resourceType === "xhr" ||
        e.request.resourceType === "fetch") &&
      ["POST", "PUT", "PATCH"].includes(e.request.method)
  );

  if (apiCalls.length > 0) {
    console.log("");
    console.log(chalk.bold("Interesting API calls (POST/PUT/PATCH):"));
    for (const call of apiCalls) {
      console.log(chalk.cyan(`  ${call.request.method} ${call.request.url}`));
      if (call.request.postData) {
        try {
          const body = JSON.parse(call.request.postData);
          console.log(chalk.dim(`    Body: ${JSON.stringify(body, null, 2).substring(0, 200)}`));
        } catch {
          console.log(chalk.dim(`    Body: ${call.request.postData.substring(0, 200)}`));
        }
      }
    }
  }

  await close();
}
