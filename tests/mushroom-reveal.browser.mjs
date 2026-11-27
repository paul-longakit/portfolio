import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

const origin = process.env.PORTFOLIO_URL ?? "http://127.0.0.1:8000";
const profile = await mkdtemp(join(tmpdir(), "mushroom-chrome-"));
const chrome = spawn(process.env.CHROME_BIN ?? "google-chrome", [
  "--headless", "--no-sandbox", "--disable-extensions", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const exited = new Promise((resolve) => chrome.once("close", resolve));
let socket;

async function until(check, label, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await wait(35);
  }
  assert.fail(label);
}

try {
  let port;
  await until(async () => {
    port = (await readFile(join(profile, "DevToolsActivePort"), "utf8").catch(() => "")).split("\n")[0];
    return port;
  }, "Chrome did not start");
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(({ url }) => url === "about:blank").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  const paused = new Map();
  socket.onmessage = ({ data }) => {
    const { id, method, params, result, error } = JSON.parse(data);
    if (method === "Runtime.exceptionThrown") errors.push(params.exceptionDetails.text);
    if (method === "Fetch.requestPaused") paused.set(new URL(params.request.url).pathname, params.requestId);
    if (!id) return;
    const { resolve, reject } = pending.get(id);
    pending.delete(id);
    if (error) reject(new Error(error.message));
    else resolve(result);
  };
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function js(expression) {
    const { result, exceptionDetails } = await call("Runtime.evaluate", { expression, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }
  const load = (label, hash = "") => call("Page.navigate", { url: `${origin}/?test=${label}${hash}` });
  const complete = () => until(() => js(`document.readyState === "complete"`), "Page did not finish loading");
  const viewport = (width, height) => call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  const motion = (value) => call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value }] });
  const scroll = (selector) => js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:"center"})`);
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Page.bringToFront");
  await call("Emulation.setFocusEmulationEnabled", { enabled: true });
  await viewport(1200, 860);

  await call("Fetch.enable", { patterns: [{ urlPattern: "*/animations.js" }] });
  await load("first-paint");
  await until(() => paused.has("/animations.js") && js(`!!document.querySelector("#name") && !!document.querySelector('link[rel="stylesheet"]').sheet`), "Main script was not delayed");
  assert.equal(await js(`getComputedStyle(document.querySelector("#name")).opacity`), "0", "Heading is visible before the crew starts");
  assert.equal(await js(`getComputedStyle(document.querySelector(".featured")).backgroundImage`), "none");
  assert.notEqual(await js(`getComputedStyle(document.querySelector(".motion-skip")).display`), "none");
  await call("Fetch.continueRequest", { requestId: paused.get("/animations.js") });
  await call("Fetch.disable");
  await until(() => js(`(() => {
    const letters = [...document.querySelectorAll(".hero-copy .build-glyph[data-copy=name]")];
    const visible = letters.filter((letter) => Number(getComputedStyle(letter).opacity) > .1).length;
    return visible > 1 && visible < letters.length && getComputedStyle(document.querySelector("#name")).opacity === "0";
  })()`), "Name should be partly built before the source becomes visible");
  const { nodes } = await call("Accessibility.getFullAXTree");
  assert.ok(nodes.some(({ role, name }) => role?.value === "heading" && name?.value === "Paul Longakit."));
  await until(() => js(`document.querySelectorAll('.hero-copy .build-glyph[data-copy=intro]').length > 100`), "Intro is not staged letter by letter");
  await until(() => js(`getComputedStyle(document.querySelector(".intro")).opacity === "1"`), "Intro never finishes");
  console.log("PASS: first paint is blank, name reveals progressively, body copy settles");

  await scroll(".featured");
  await until(() => js(`document.querySelector(".featured").classList.contains("is-built") && getComputedStyle(document.querySelector(".featured h3")).opacity === "0"`), "Project frame should land before its title");
  await scroll(".case-result");
  await until(() => js(`!!document.querySelector(".case-result .build-stamp")`), "Result panel is not staged");
  await until(() => js(`getComputedStyle(document.querySelector(".case-result strong")).opacity === "1"`), "Stamp never finishes");
  await scroll("footer");
  await until(() => js(`!!document.querySelector("footer .stage-worker")`), "Footer crew did not start");
  await scroll(".case-result");
  await until(() => js(`!document.querySelector("footer .stage-worker")`), "Offscreen worker did not clear");
  assert.equal(await js(`document.querySelectorAll(".case-result .build-stage").length`), 0);
  console.log("PASS: frame before copy, CHRIMS stamp, offscreen cleanup, no replay");

  await viewport(320, 720);
  await load("mobile");
  await complete();
  await until(() => js(`!!document.querySelector(".hero-copy .stage-worker")`), "Mobile crew did not start");
  assert.ok(await js(`document.querySelectorAll(".stage-worker").length <= 2`));
  assert.ok(await js(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`));
  await js(`document.querySelector(".hero-copy .primary").focus()`);
  assert.equal(await js(`getComputedStyle(document.activeElement).opacity`), "1");
  await js(`document.querySelector(".motion-skip").focus(); document.activeElement.click()`);
  assert.equal(await js(`document.activeElement.textContent`), "Animation skipped");
  assert.equal(await js(`document.querySelectorAll(".build-stage").length`), 0);
  await scroll("#contact");
  await wait(250);
  assert.equal(await js(`getComputedStyle(document.querySelector("#contact h2")).opacity`), "1");
  assert.equal(await js(`document.querySelectorAll(".build-stage").length`), 0);
  console.log("PASS: mobile worker cap, keyboard focus, skip, no horizontal overflow");

  for (const anchor of ["work", "experience", "contact"]) {
    await load(`anchor-${anchor}`, `#${anchor}`);
    await until(() => js(`location.hash === "#${anchor}" && !!document.querySelector("#${anchor} .stage-worker")`), `No animation at direct #${anchor} link`);
  }
  await motion("reduce");
  await until(() => js(`document.querySelectorAll(".build-stage").length === 0`), "Live reduced motion did not clear scenes");
  await load("reduced");
  await complete();
  assert.equal(await js(`getComputedStyle(document.querySelector("#name")).opacity`), "1");
  assert.equal(await js(`getComputedStyle(document.querySelector(".motion-skip")).display`), "none");
  console.log("PASS: direct anchors and initial/live reduced motion");

  await motion("no-preference");
  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await load("no-js");
  await complete();
  assert.equal(await js(`getComputedStyle(document.querySelector("#name")).opacity`), "1");
  assert.equal(await js(`getComputedStyle(document.querySelector(".motion-skip")).display`), "none");
  await call("Emulation.setScriptExecutionDisabled", { value: false });
  await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*/vendor/animejs/anime.min.js"] });
  await load("missing-library");
  await complete();
  await until(() => js(`getComputedStyle(document.querySelector("#name")).opacity === "1"`), "Missing Anime.js stranded hidden content");
  assert.deepEqual(errors, []);
  console.log("PASS: JavaScript off, failed dependency, no runtime errors");
} finally {
  socket?.close();
  chrome.kill();
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 10 });
}
