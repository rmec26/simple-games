
function main() {
  let width = 5;
  let height = 10;
  let attempt = 0;

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

  function random(max) {
    return (Math.random() * max) | 0;
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








  let generatedPath = generatePath(width, height);
  // printPath(width, height, generatedPath)

  let cells = [];

  let attemptsCell;

  let nextMoves;
  let currentPath;

  let hasFailed;
  let endValue;

  function updateMoveClasses() {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        cells[y][x].classList.remove("unselected", "valid", "nextOption", "fail", "end");
        if (hasValue(currentPath, x, y)) {
          cells[y][x].classList.add("valid");
        } else if (!endValue && hasValue(nextMoves, x, y)) {
          cells[y][x].classList.add("nextOption");
        } else if (endValue && endValue[0] == x && endValue[1] == y) {
          cells[y][x].classList.add(hasFailed ? "fail" : "end");
        } else {
          cells[y][x].classList.add("unselected");

        }
      }
    }
  }

  function reset() {
    attempt++;
    nextMoves = [];
    currentPath = [];

    hasFailed = false;
    endValue = null;

    for (let i = 0; i < width; i++) {
      nextMoves.push([i, 0]);
    }
    updateMoveClasses()
    attemptsCell.innerText = `Attempt ${attempt}`
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

  function addTextLine(table, text, className, colNum = width + 1) {
    let line = document.createElement("tr");
    let cell = document.createElement("td");
    cell.innerText = text;
    if (className) {
      cell.classList.add(className)
    }
    cell.colSpan = colNum;
    line.appendChild(cell);
    container.appendChild(line);
    return line;
  }

  function addTextLineWithPadding(table, text, className, paddingText, paddingClassName) {
    let line = addTextLine(table, text, className, width);

    let padding = document.createElement("td");
    padding.innerText = paddingText;
    if (paddingClassName) {
      padding.classList.add(paddingClassName)
    }
    line.appendChild(padding);
    return padding;
  }

  function loadTable() {
    let container = document.getElementById("container");

    addTextLine(container, "Find the Path");
    attemptsCell = addTextLineWithPadding(container, "Start", "valid", "Attempt");

    for (let y = 0; y < height; y++) {
      let line = document.createElement("tr");
      let cellLine = [];
      for (let x = 0; x < width; x++) {
        let cell = document.createElement("td");
        cell.x = x;
        cell.y = y;
        cell.onclick = () => {
          play(x, y);
        }
        line.appendChild(cell);
        cellLine.push(cell);
      }
      let padding = document.createElement("td");

      line.appendChild(padding);

      container.appendChild(line);
      cells.push(cellLine);
    }

    addTextLineWithPadding(container, "End", "end", "Reset", "reset").onclick = reset;
    // addTextLine(container, "Reset", "reset").onclick = reset;

    reset()
  }


  document.addEventListener("keypress", (event) => {
    if (event.code == "KeyR") {
      reset();
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

  loadTable()
}