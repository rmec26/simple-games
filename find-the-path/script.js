//@ts-check

function main() {

  const baseLineHeight = 50;
  const baseSidebarWidth = 70;
  const minCellSize = 32;
  const maxCellSize = 96;


  // ---State Code---
  const stateVersion = "1";

  const stateToKeep = ["attempt", "columns", "rows", "hints", "currentHints", "currentPath", "seed", "nextMoves", "hasFailed", "generatedPath", "endValue"];
  const state = {};

  function getHash(str) {
    return parseSeed(str).toString();
  }

  function compareHash(str, hash) {
    return getHash(str) === hash;
  }

  function hasStateInStorage() {
    if (localStorage.getItem("version") === stateVersion) {
      let state = localStorage.getItem("state");
      let hash = localStorage.getItem("hash");
      if (state && hash) {
        return compareHash(state, hash);
      }
    }
    return false;
  }

  function loadStateFromStorage() {
    try {
      if (hasStateInStorage()) {
        let storedState = JSON.parse(localStorage.getItem("state"));
        for (let k of stateToKeep) {
          state[k] = storedState[k]
        }
        return true;
      }
    } catch (e) { }
    return false;
  }

  function saveStateToStorage() {
    localStorage.setItem("version", stateVersion);
    let stateToStore = {};
    for (let k of stateToKeep) {
      stateToStore[k] = state[k];
    }
    stateToStore = JSON.stringify(stateToStore);
    const hash = getHash(stateToStore);
    localStorage.setItem("state", stateToStore);
    localStorage.setItem("hash", hash);
  }

  function clearStorage() {
    localStorage.clear();
  }

  // ---RNG Code---

  function parseSeed(seed) {
    if (seed === null) {
      return Date.now();
    }
    switch (typeof seed) {
      case "number":
        break;
      case "string":
        let res;
        if (seed.length) {
          res = Number.parseInt(seed);
          if (Number.isNaN(res)) {
            res = 0;
            for (let i = 0; i < seed.length; i++) {
              res += (i + 1) * seed.charCodeAt(i);
            }
          }
        } else {
          res = Date.now();
        }
        seed = res;
        break;
      case "undefined":
        seed = Date.now();
        break;
      default:
        seed = 1;
    }
    return Math.trunc(Math.abs(seed));
  }

  class LCG {
    constructor(m, a, c) {
      this.m = m;
      this.a = a;
      this.c = c;
      this.seed();
    }
    seed(seed) {
      this.curr = (parseSeed(seed) % this.m) || 1;
    }

    generate() {
      this.curr = (this.a * this.curr + this.c) % this.m;
      return this.curr;
    }
    generateRange(min, max) {
      let size = max - min + 1;
      return Math.trunc(this.generate() / this.m * size) + min
    }
  }

  function getGenerator() {
    let generator = new LCG(Math.pow(2, 31) - 1, 48271, 0);
    generator.seed();
    return generator;
  }


  // ---Logic Code---

  function random(max) {
    // return (Math.random() * max) | 0;
    return state.generator.generateRange(0, max - 1);
  }

  function hasValue(currentPath, x, y) {
    return currentPath.some(([xi, yi]) => xi == x && yi == y);
  }

  function isValidNext(width, height, currentPath, x, y) {
    if (hasValue(currentPath, x, y)) {
      return false;
    }
    if (x < 0 || x >= width || y < 1 || y >= height) {
      return false;
    }
    let possible = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    let total = 0;
    for (let [xp, yp] of possible) {
      if (hasValue(currentPath, xp, yp)) {
        total++;
      }
    }
    return total == 1;
  }

  function getAllValidNext(width, height, currentPath, xc, yc) {
    let possible = [[xc + 1, yc], [xc - 1, yc], [xc, yc + 1], [xc, yc - 1]];
    let res = [];
    for (let [xp, yp] of possible) {
      if (isValidNext(width, height, currentPath, xp, yp)) {
        res.push([xp, yp]);
      }
    }
    return res;
  }

  function generatePath(width, height, currentPath = []) {
    if (currentPath.length) {
      let curr = currentPath[currentPath.length - 1];
      let xc = curr[0];
      let yc = curr[1];
      if (curr[1] == height - 1) {
        return currentPath;
      }

      //get the list of next moves and set them in a random order
      let possible = getAllValidNext(width, height, currentPath, xc, yc);
      let shuffled = [];
      while (possible.length) {
        shuffled.push(...possible.splice(random(possible.length), 1))
      }

      for (let [xs, ys] of shuffled) {
        let res = generatePath(width, height, [...currentPath, [xs, ys]])
        if (res != null) {
          return res;
        }
      }
      return null;

    } else {//first move is always on the top line
      return generatePath(width, height, [[random(width), 0]])
    }
  }

  function printPath(width, height, currentPath) {
    let res = []
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        line += hasValue(currentPath, x, y) ? "#" : ".";
      }
      res.push(line);
    }
    console.log(res.join("\n"));
  }

  // ---UI Code---

  function updateUi() {
    for (let cell of state.cells) {
      cell.classList.remove("unselected", "valid", "nextOption", "fail", "end", "win");
      if (hasValue(state.currentPath, cell.x, cell.y)) {
        cell.classList.add("valid");
      } else if (!state.endValue && hasValue(state.nextMoves, cell.x, cell.y)) {
        cell.classList.add("nextOption");
      } else if (state.endValue && state.endValue[0] == cell.x && state.endValue[1] == cell.y) {
        cell.classList.add(state.hasFailed ? "fail" : "valid");
      } else if (state.endValue && !state.hasFailed) {
        cell.classList.add("win");
      } else {
        cell.classList.add("unselected");
      }
    }
    attemptsBox.innerText = `Attempt\n${state.attempt}`
    hintsBox.innerText = `Hints\n${state.currentHints}`
    seedBar.innerText = `Seed: ${state.seed}`
    saveStateToStorage();
  }

  function loadParamsToState(params) {
    for (let [k, v] of Object.entries(params)) {
      state[k] = v;
    }
  }

  function generateSeedIfNone() {
    if (!state.seed) {
      state.seed = Date.now().toString();
    }
  }

  function generatePathFromSeed() {
    state.generator = getGenerator();
    state.generator.seed(state.seed);
    //This is to keep the first step from being too close from previous recent games due to using the current timestamp as the default seed
    state.generator.generate();
    state.generatedPath = generatePath(state.columns, state.rows);
  }

  function clearQuery() {
    let url = new URL(window.location.href);
    url.search = "";
    history.replaceState(history.state, '', url.href);
  }

  function newGame(params) {
    unloadTable();
    if (params) {
      loadParamsToState(params)
    } else {

      clearQuery();
      //TODO remove this after implementing options
      state.seed = null;
      // loadParamsfromOptions()
    }

    state.currentHints = state.hints;
    generateSeedIfNone();
    generatePathFromSeed();
    loadTable()
    retry();
  }


  function retry() {
    state.attempt++;
    state.nextMoves = [];
    state.currentPath = [];

    state.hasFailed = false;
    state.endValue = null;

    for (let i = 0; i < state.columns; i++) {
      state.nextMoves.push([i, 0]);
    }
    updateUi();
  }

  function retryClick() {
    if (state.hasFailed) {
      retry();
    }
  }

  function play(x, y) {
    if (!state.hasFailed && hasValue(state.nextMoves, x, y)) {
      if (hasValue(state.generatedPath, x, y)) {
        if (y == state.rows - 1) {
          state.endValue = [x, y];
        } else {
          state.currentPath.push([x, y]);
          state.nextMoves = getAllValidNext(state.columns, state.rows, state.currentPath, x, y);
        }
      } else {
        state.hasFailed = true;
        state.endValue = [x, y];
      }
      updateUi();
    }
  }

  function playHint() {
    if (!state.endValue && state.currentHints) {
      state.currentHints--;
      for (let [x, y] of state.nextMoves) {
        if (hasValue(state.generatedPath, x, y)) {
          play(x, y);
        }
      }
    }
  }

  function cellClick() {
    play(this.x, this.y);
  }

  function sizePos(x, y, width, height) {
    if (x != null && x != undefined) {
      this.style.left = `${x}px`;
    }
    if (y != null && y != undefined) {
      this.style.top = `${y}px`;
    }
    if (width != null && width != undefined) {
      this.style.width = `${width}px`;
    }
    if (height != null && height != undefined) {
      this.style.height = `${height}px`;
    }
  }

  function addBox(className, text) {
    const box = document.createElement("div");
    box.classList.add("box")

    if (className) {
      box.classList.add(className)
    }
    if (text) {
      box.innerText = text;
    }
    box.style.position = "absolute";
    box.sizePos = sizePos
    box.sizePos(0, 0, 50, 50);
    document.body.appendChild(box);
    return box;
  }


  let topBar;
  let startBar;
  let endBar;
  let seedBar;
  let sidebar;
  let attemptsBox;
  let hintsBox;
  let hintButton;
  let newButton;
  let retryButton;

  function resizeUi() {
    //consider a padding for the entire UI
    let cellSizeHeigth = ((window.innerHeight - baseLineHeight * 4) / state.rows) | 0;
    let cellSizeWidth = ((window.innerWidth - baseSidebarWidth) / state.columns) | 0;
    let cellSize = Math.min(Math.max(minCellSize, cellSizeHeigth > cellSizeWidth ? cellSizeWidth : cellSizeHeigth), maxCellSize);

    const playAreaWidth = cellSize * state.columns;
    const totalViewWidth = playAreaWidth + baseSidebarWidth;
    const sidebarHeight = cellSize * state.rows + baseLineHeight * 2;

    const offsetX = Math.max((window.innerWidth - cellSize * state.columns - baseSidebarWidth) / 2 | 0, 0);
    const offsetY = Math.max((window.innerHeight - cellSize * state.rows - baseLineHeight * 4) / 2 | 0, 0);
    const sidebarX = offsetX + playAreaWidth;

    topBar.sizePos(offsetX, offsetY, totalViewWidth, baseLineHeight);
    const startBarY = offsetY + baseLineHeight;
    startBar.sizePos(offsetX, startBarY, playAreaWidth, baseLineHeight);
    const gridY = startBarY + baseLineHeight;

    for (let cell of state.cells) {
      cell.sizePos(offsetX + cellSize * cell.x, gridY + cellSize * cell.y, cellSize, cellSize);
    }
    const endBarY = gridY + cellSize * state.rows;
    endBar.sizePos(offsetX, endBarY, playAreaWidth, baseLineHeight);
    const seedBarY = endBarY + baseLineHeight;

    seedBar.sizePos(offsetX, seedBarY, totalViewWidth, baseLineHeight);
    sidebar.sizePos(sidebarX, startBarY, baseSidebarWidth, sidebarHeight);


    attemptsBox.sizePos(sidebarX, startBarY, baseSidebarWidth, baseLineHeight);
    hintsBox.sizePos(sidebarX, startBarY + baseLineHeight, baseSidebarWidth, baseLineHeight);

    hintButton.sizePos(sidebarX, endBarY - baseLineHeight * 2, baseSidebarWidth, baseLineHeight);
    newButton.sizePos(sidebarX, endBarY - baseLineHeight, baseSidebarWidth, baseLineHeight);
    retryButton.sizePos(sidebarX, endBarY, baseSidebarWidth, baseLineHeight);
  }

  function loadUi() {
    topBar = addBox("", "Find the Path");
    startBar = addBox("valid", "Start");
    endBar = addBox("end", "End");
    seedBar = addBox("", "Seed: ");
    sidebar = addBox("", "");
    attemptsBox = addBox("", "Attempt\n0");
    hintsBox = addBox("", `Hints\n0`);
    hintButton = addBox("sidebarButton", "Hint");
    newButton = addBox("sidebarButton", "New");
    retryButton = addBox("sidebarButton", "Retry");

    hintButton.onclick = () => playHint();
    newButton.onclick = () => newGame();
    retryButton.onclick = () => retryClick();
  }

  function loadTable() {
    state.cells = [];
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.columns; x++) {
        let cell = addBox("unselected");
        cell.x = x;
        cell.y = y;
        cell.onclick = cellClick
        state.cells.push(cell);
      }
    }
    resizeUi();
  }

  function unloadTable() {
    state.attempt = 0;
    if (state.cells) {
      for (let cell of state.cells) {
        cell.remove();
      }
      delete state.cells;
    }
  }


  function getSearchParams() {
    let url = new URL(window.location.href);
    return url.searchParams;
  }



  function processParam(validator, resultObj, paramList) {
    const searchParams = getSearchParams();

    for (const param of paramList) {
      if (searchParams.has(param)) {
        let [isValid, value] = validator(searchParams.get(param));
        if (isValid) {
          resultObj[paramList[0]] = value;
          return;
        }
      }
    }
  }

  function processIntParam(resultObj, ...paramList) {
    return processParam((param) => {
      let value = Number.parseInt(param);
      if (!Number.isNaN(value) && value > 0) {
        return [true, value];
      } else {
        return [false];
      }
    }, resultObj, paramList);
  }

  function processsStringParam(resultObj, ...paramList) {
    return processParam((param) => {
      if (param.length) {
        return [true, param];
      } else {
        return [false];
      }
    }, resultObj, paramList);
  }






  function getBaseParameters() {
    return { columns: 5, rows: 10, hints: 2, seed: null };
  }

  function hasQueryParameters() {
    return !!getSearchParams().size;
  }

  function processQueryParameters() {
    let processedQueryParams = {};
    processIntParam(processedQueryParams, "columns", "col", "c", "width");
    processIntParam(processedQueryParams, "rows", "row", "r", "height");
    processIntParam(processedQueryParams, "hints", "hint", "h");
    processsStringParam(processedQueryParams, "seed", "s");
    return { ...getBaseParameters(), ...processedQueryParams };
  }

  function firstLoad() {
    loadUi();
    if (hasQueryParameters()) {
      newGame(processQueryParameters())
    } else if (hasStateInStorage()) {
      loadStateFromStorage();
      loadTable();
      updateUi();
    } else {
      newGame(getBaseParameters());
    }
  }

  document.addEventListener("keypress", (event) => {
    if (event.code == "KeyR") {
      retryClick();
    } else if (event.code == "KeyN") {
      newGame();
    } else if (event.code == "KeyH") {
      playHint();
    } else if (state.currentPath.length) {
      if (event.code == "KeyW" || event.code == "KeyI") {
        play(state.currentPath[state.currentPath.length - 1][0], state.currentPath[state.currentPath.length - 1][1] - 1);
      } else if (event.code == "KeyS" || event.code == "KeyK") {
        play(state.currentPath[state.currentPath.length - 1][0], state.currentPath[state.currentPath.length - 1][1] + 1);
      } else if (event.code == "KeyA" || event.code == "KeyJ") {
        play(state.currentPath[state.currentPath.length - 1][0] - 1, state.currentPath[state.currentPath.length - 1][1]);
      } else if (event.code == "KeyD" || event.code == "KeyL") {
        play(state.currentPath[state.currentPath.length - 1][0] + 1, state.currentPath[state.currentPath.length - 1][1]);
      }
    } else {
      if (event.code == "Digit1") {
        play(0, 0);
      } else if (event.code == "Digit2") {
        play(1, 0);
      } else if (event.code == "Digit3") {
        play(2, 0);
      } else if (event.code == "Digit4") {
        play(3, 0);
      } else if (event.code == "Digit5") {
        play(4, 0);
      } else if (event.code == "Digit6") {
        play(5, 0);
      } else if (event.code == "Digit7") {
        play(6, 0);
      } else if (event.code == "Digit8") {
        play(7, 0);
      } else if (event.code == "Digit9") {
        play(8, 0);
      } else if (event.code == "Digit0") {
        play(9, 0);
      }
    }
  });

  window.addEventListener("resize", resizeUi);


  // ---Debug Code---

  //Disables the debug if running on Github pages
  if (!window.location.hostname.includes("github.io")) {
    function showCurrentPath() {
      printPath(state.columns, state.rows, state.generatedPath)
    }

    function autoWin() {
      state.currentPath = [...state.generatedPath];
      state.nextMoves = [state.currentPath.pop()];
      updateUi();
    }

    globalThis.showCurrentPath = showCurrentPath;
    globalThis.autoWin = autoWin;
    globalThis.state = state;
    globalThis.clearStorage = clearStorage;
  }

  firstLoad();
}