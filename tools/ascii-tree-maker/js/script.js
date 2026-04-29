const TAB_WIDTH = 4;

// ===== Indent Detection =====
function getIndentWidth(line) {
  let width = 0;
  for (const char of line) {
    if (char === ' ')       width += 1;
    else if (char === '\t') width += TAB_WIDTH;
    else if (char === '　') width += 1;
    else break;
  }
  return width;
}

// ===== Parser =====
function parseNodes(text) {
  const lines = text
    .split('\n')
    .filter(line => line.trim() !== '');

  const nodes = [];
  const indentStack = [0]; // stack of indent widths for each depth level

  for (const line of lines) {
    const indent = getIndentWidth(line);

    // Pop back to the nearest ancestor whose indent is < current
    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
    }

    let depth;
    if (indent === indentStack[indentStack.length - 1]) {
      // Same indent as top of stack → same depth
      depth = indentStack.length - 1;
    } else if (indent > indentStack[indentStack.length - 1]) {
      // Deeper indent → child of previous node
      indentStack.push(indent);
      depth = indentStack.length - 1;
    } else {
      // Shallower indent that doesn't match any known level → treat as sibling of nearest ancestor
      depth = indentStack.length - 1;
    }

    nodes.push({ depth, text: line.trim() });
  }

  return nodes;
}

// ===== isLast Precomputation =====
function withIsLast(nodes) {
  return nodes.map((node, i) => {
    if (node.depth === 0) return { ...node, isLast: true };
    let isLast = true;
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[j].depth < node.depth) break;
      if (nodes[j].depth === node.depth) { isLast = false; break; }
    }
    return { ...node, isLast };
  });
}

// ===== Tree Generator =====
function generateTree(nodes, branchLen) {
  if (nodes.length === 0) return '';

  const dashes   = '─'.repeat(branchLen);
  const midConn  = `├${dashes} `;
  const lastConn = `└${dashes} `;

  const lines = [];
  const stack = []; // isLast of each ancestor at depths 1, 2, ...

  for (const { depth, text, isLast } of withIsLast(nodes)) {
    if (depth === 0) {
      stack.length = 0;
      lines.push(text);
    } else {
      // Trim to depth-1 ancestors; pad skipped levels as non-last
      while (stack.length > depth - 1) stack.pop();
      while (stack.length < depth - 1) stack.push(false);

      const prefix    = stack.map(l => l ? '    ' : '│   ').join('');
      const connector = isLast ? lastConn : midConn;
      lines.push(prefix + connector + text);

      stack[depth - 1] = isLast;
    }
  }

  return lines.join('\n');
}

// ===== DOM =====
const inputArea    = document.getElementById('inputArea');
const outputArea   = document.getElementById('outputArea');
const copyBtn      = document.getElementById('copyBtn');
const branchLenSel = document.getElementById('branchLen');

const COPY_LABEL   = 'クリップボードにコピー';
const EXAMPLE_TEXT =
`usr
 bin
 lib
 local
  bin
  lib
home
 alice
  Documents
  Downloads
 bob`;

function update() {
  const nodes  = parseNodes(inputArea.value);
  const result = generateTree(nodes, parseInt(branchLenSel.value, 10));
  outputArea.value  = result;
  copyBtn.disabled  = result === '';
}

inputArea.value = EXAMPLE_TEXT;

inputArea.addEventListener('input', update);
branchLenSel.addEventListener('change', update);

copyBtn.addEventListener('click', async () => {
  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API is not available');
    }

    await navigator.clipboard.writeText(outputArea.value);
    showFeedback('コピーしました！', 'copied');
  } catch {
    showFeedback('コピー失敗', 'error');
  }
});

let feedbackTimer = null;

function showFeedback(label, cls) {
  if (feedbackTimer !== null) {
    clearTimeout(feedbackTimer);
  }

  copyBtn.textContent = label;
  copyBtn.classList.remove('copied', 'error');
  copyBtn.classList.add(cls);

  feedbackTimer = setTimeout(() => {
    copyBtn.textContent = COPY_LABEL;
    copyBtn.classList.remove('copied', 'error');
    feedbackTimer = null;
  }, 2000);
}

update();
