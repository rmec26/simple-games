
function main() {
  let width = 5;
  let height = 10;
  let attempt = 0;
  const baseLineSize = 50;
  const baseSidebarSize = 70;
  const minCellSize = 32;
  const maxCellSize = 96;
  let seed;
  let generator;


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


  // ---Param String Code---

  const paramsString = window.location.search;
  const searchParams = new URLSearchParams(paramsString);

  if (searchParams.has("width")) {
    let value = Number.parseInt(searchParams.get("width"));
    if (!Number.isNaN(value) && value > 0) {
      width = value;
    }
  }

  if (searchParams.has("height")) {
    let value = Number.parseInt(searchParams.get("height"));
    if (!Number.isNaN(value) && value > 0) {
      height = value;
    }
  }

  if (searchParams.has("seed")) {
    seed = searchParams.get("seed");
  }

  // ---Logic Code---

  function random(max) {
    // return (Math.random() * max) | 0;
    return generator.generateRange(0, max);
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

  let generatedPath

  let cells = [];

  let nextMoves;
  let currentPath;

  let hasFailed;
  let endValue;





  function updateMoveClasses() {
    for (let cell of cells) {
      cell.classList.remove("unselected", "valid", "nextOption", "fail", "end", "win");
      if (hasValue(currentPath, cell.x, cell.y)) {
        cell.classList.add("valid");
      } else if (!endValue && hasValue(nextMoves, cell.x, cell.y)) {
        cell.classList.add("nextOption");
      } else if (endValue && endValue[0] == cell.x && endValue[1] == cell.y) {
        cell.classList.add(hasFailed ? "fail" : "valid");
      } else if (endValue && !hasFailed) {
        cell.classList.add("win");
      } else {
        cell.classList.add("unselected");
      }
    }
  }

  function retry() {
    attempt++;
    nextMoves = [];
    currentPath = [];

    hasFailed = false;
    endValue = null;

    for (let i = 0; i < width; i++) {
      nextMoves.push([i, 0]);
    }
    updateMoveClasses()
    attemptsBox.innerText = `Attempt\n${attempt}`
  }

  function retryClick() {
    if (hasFailed) {
      retry();
    }
  }

  function play(x, y) {
    if (!hasFailed && hasValue(nextMoves, x, y)) {
      if (hasValue(generatedPath, x, y)) {
        if (y == height - 1) {
          endValue = [x, y];
        } else {
          currentPath.push([x, y]);
          nextMoves = getAllValidNext(width, height, currentPath, x, y);
        }
      } else {
        hasFailed = true;
        endValue = [x, y];
      }
      updateMoveClasses()
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
  let sidebar;
  let attemptsBox;
  let retryBox;

  function resizeUi() {
    //consider a padding for the entire UI
    let cellSizeHeigth = ((window.innerHeight - baseLineSize * 3) / height) | 0;
    let cellSizeWidth = ((window.innerWidth - baseSidebarSize) / width) | 0;
    let cellSize = Math.min(Math.max(minCellSize, cellSizeHeigth > cellSizeWidth ? cellSizeWidth : cellSizeHeigth), maxCellSize);

    const playAreaWidth = cellSize * width;
    const totalViewWidth = playAreaWidth + baseSidebarSize;
    const sidebarHeight = cellSize * height + baseLineSize * 2;

    const offsetX = Math.max((window.innerWidth - cellSize * width - baseSidebarSize) / 2 | 0, 0);
    const offsetY = Math.max((window.innerHeight - cellSize * height - baseLineSize * 3) / 2 | 0, 0);
    const sidebarX = offsetX + playAreaWidth;

    topBar.sizePos(offsetX, offsetY, totalViewWidth, baseLineSize);
    const startBarY = offsetY + baseLineSize;
    startBar.sizePos(offsetX, startBarY, playAreaWidth, baseLineSize);
    const gridY = startBarY + baseLineSize;

    for (let cell of cells) {
      cell.sizePos(offsetX + cellSize * cell.x, gridY + cellSize * cell.y, cellSize, cellSize);
    }
    const endBarY = gridY + cellSize * height;
    endBar.sizePos(offsetX, endBarY, playAreaWidth, baseLineSize);
    sidebar.sizePos(sidebarX, startBarY, baseSidebarSize, sidebarHeight);


    attemptsBox.sizePos(sidebarX, startBarY, baseSidebarSize, baseLineSize);

    retryBox.sizePos(sidebarX, endBarY, baseSidebarSize, baseLineSize);
  }

  function loadUi() {
    topBar = addBox("", "Find the Path");
    startBar = addBox("valid", "Start");
    endBar = addBox("end", "End");
    sidebar = addBox("", "");
    attemptsBox = addBox("", "Attempt\n0");
    retryBox = addBox("retry", "Retry");

    retryBox.onclick = retryClick;
  }

  function loadTable() {
    generator = getGenerator();
    generator.seed(seed);
    generatedPath = generatePath(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let cell = addBox("unselected");
        cell.x = x;
        cell.y = y;
        cell.onclick = cellClick
        cells.push(cell);
      }
    }
    resizeUi();
    retry();
  }


  document.addEventListener("keypress", (event) => {
    if (event.code == "KeyR") {
      retryClick();
    } else if (currentPath.length) {
      if (event.code == "KeyW" || event.code == "KeyI") {
        play(currentPath[currentPath.length - 1][0], currentPath[currentPath.length - 1][1] - 1);
      } else if (event.code == "KeyS" || event.code == "KeyK") {
        play(currentPath[currentPath.length - 1][0], currentPath[currentPath.length - 1][1] + 1);
      } else if (event.code == "KeyA" || event.code == "KeyJ") {
        play(currentPath[currentPath.length - 1][0] - 1, currentPath[currentPath.length - 1][1]);
      } else if (event.code == "KeyD" || event.code == "KeyL") {
        play(currentPath[currentPath.length - 1][0] + 1, currentPath[currentPath.length - 1][1]);
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

  loadUi();
  loadTable();



  // ---Debug Code---

  //Disables the debug if running on Github pages
  if (!window.location.hostname.includes("github.io")) {
    function showCurrentPath() {
      printPath(width, height, generatedPath)
    }

    function autoWin() {
      currentPath = [...generatedPath];
      nextMoves = [currentPath.pop()];
      updateMoveClasses();
    }

    globalThis.showCurrentPath = showCurrentPath;
    globalThis.autoWin = autoWin;
  }
}