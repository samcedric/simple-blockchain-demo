const chainEl = document.getElementById("chain");
const addBlockBtn = document.getElementById("addBlockBtn");

const GENESIS_PREV = "0000";

const blocks = [];

async function sha256Hex(message) {
  const enc = new TextEncoder();
  const bytes = enc.encode(message);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function shortHash(hex, len = 10) {
  return `HASH-${hex.slice(0, len).toUpperCase()}`;
}

function prevHashFor(i) {
  if (i === 0) return GENESIS_PREV;
 
  return blocks[i - 1].savedHash || blocks[i - 1].hash || GENESIS_PREV;
}

async function computeBlockHash(i) {
  const prev = prevHashFor(i);
  blocks[i].prevHash = prev;

  const payload = `${i + 1}|${prev}|${blocks[i].data}`;
  const hex = await sha256Hex(payload);
  blocks[i].hash = shortHash(hex, 10);
}

async function recomputeFrom(startIndex) {
  for (let i = startIndex; i < blocks.length; i++) {
    await computeBlockHash(i);
  }
  updateHashDisplay();
}

function updateHashDisplay() {
  blocks.forEach((b, i) => {
    const prevEl = document.getElementById(`prev-${i}`);
    const hashEl = document.getElementById(`hash-${i}`);
    if (prevEl) prevEl.textContent = b.prevHash;
    if (hashEl) hashEl.textContent = b.hash;
  });
}


function enforceEditability() {
  const lastIndex = blocks.length - 1;
  blocks.forEach((b, i) => {
    const ta = document.querySelector(`textarea[data-index="${i}"]`);
    const saveBtn = document.querySelector(`button.save-btn[data-index="${i}"]`);
    if (!ta) return;

    const isLast = i === lastIndex;

    ta.readOnly = !isLast;
    ta.classList.toggle("readonly", !isLast);


    if (saveBtn) saveBtn.disabled = !isLast;
  });
}

async function addBlockInternal(initialData = "") {
  blocks.push({
    data: initialData,
    prevHash: "",
    hash: "",
    savedHash: null
  });

  await recomputeFrom(Math.max(0, blocks.length - 1));
  render(); 
}

async function saveHashAndCreateNew() {
  if (blocks.length === 0) return;

  const last = blocks.length - 1;


  await computeBlockHash(last);
  blocks[last].savedHash = blocks[last].hash;


  await addBlockInternal("");
}

async function deleteBlock(index) {
  blocks.splice(index, 1);

  if (blocks.length === 0) {
    render();
    return;
  }

  await recomputeFrom(0);
  render();
}

function render() {
  chainEl.innerHTML = "";

  blocks.forEach((b, i) => {
    const card = document.createElement("div");
    card.className = "block";

    card.innerHTML = `
      <div class="block-top">
        <div class="block-title">Block #${i + 1}</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="save-btn" data-index="${i}">Save Hash</button>
          <button class="delete-btn" data-index="${i}">Delete</button>
        </div>
      </div>

      <div class="row">
        <label>Data:</label>
        <textarea data-index="${i}" placeholder="Type anything..."></textarea>
      </div>

      <div class="row">
        <label>Previous Hash:</label>
        <div class="mono" id="prev-${i}">${b.prevHash || prevHashFor(i)}</div>
      </div>

      <div class="row">
        <label>Hash:</label>
        <div class="mono" id="hash-${i}">${b.hash || ""}</div>
      </div>
    `;

    chainEl.appendChild(card);

    const ta = card.querySelector("textarea");
    ta.value = b.data;
  });


  document.querySelectorAll("textarea").forEach((ta) => {
    ta.addEventListener("input", async (e) => {
      const idx = Number(e.target.dataset.index);
      blocks[idx].data = e.target.value;
      await recomputeFrom(idx);
    });
  });

  document.querySelectorAll(".save-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await saveHashAndCreateNew();
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const idx = Number(e.target.dataset.index);
      await deleteBlock(idx);
    });
  });

  updateInputState();
  enforceEditability();
  updateHashDisplay();
}


addBlockBtn.addEventListener("click", async () => {

  if (blocks.length > 0 && !blocks[blocks.length - 1].savedHash) {
    await computeBlockHash(blocks.length - 1);
    blocks[blocks.length - 1].savedHash = blocks[blocks.length - 1].hash;
  }
  await addBlockInternal("");
});

function updateInputState() {
  const textareas = document.querySelectorAll("textarea");

  textareas.forEach((ta, index) => {
    if (index === blocks.length - 1) {
      ta.disabled = false; 
    } else {
      ta.disabled = true;
    }
  });
}