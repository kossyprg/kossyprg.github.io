// ===== TSV Parser =====
// Excel コピー時の形式（クォート囲み・セル内改行）に対応した TSV パーサー
function parseTSV(input) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  const pushCell = () => {
    currentRow.push(currentCell.trim());
    currentCell = '';
  };

  const pushRow = () => {
    pushCell();
    // 行末の空セル（末尾タブによる空文字）を除去
    while (currentRow.length > 0 && currentRow[currentRow.length - 1] === '') {
      currentRow.pop();
    }
    if (currentRow.length > 0) rows.push(currentRow);
    currentRow = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          // ダブルクォートのエスケープ（"" → "）
          currentCell += '"';
          i += 2;
        } else {
          // クォート終了
          inQuotes = false;
          i++;
        }
      } else {
        currentCell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === '\t') {
        pushCell();
        i++;
      } else if (ch === '\r' && i + 1 < input.length && input[i + 1] === '\n') {
        pushRow();
        i += 2;
      } else if (ch === '\n' || ch === '\r') {
        pushRow();
        i++;
      } else {
        currentCell += ch;
        i++;
      }
    }
  }

  // 末尾に改行がない場合の最終行処理
  if (currentCell !== '' || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

// ===== Markdown Generator =====
function escapeCell(value, newlineMode) {
  // | をエスケープ
  value = value.replace(/\|/g, '\\|');
  // セル内改行を変換
  if (newlineMode === 'br') {
    value = value.replace(/\n/g, '<br>');
  } else {
    value = value.replace(/\n/g, ' ');
  }
  // 空セルはスペースでパディング
  return value === '' ? ' ' : value;
}

function generateMarkdown(rows, useHeader, newlineMode) {
  if (rows.length === 0) return '';

  // 最大列数を決定
  const maxCols = Math.max(...rows.map(r => r.length));
  if (maxCols === 0) return '';

  // 全行を最大列数に揃えてセルをエスケープ
  const formatted = rows.map(row => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('');
    return padded.map(cell => escapeCell(cell, newlineMode));
  });

  const sep = '| ' + Array(maxCols).fill('---').join(' | ') + ' |';
  const lines = [];

  if (useHeader) {
    lines.push('| ' + formatted[0].join(' | ') + ' |');
    lines.push(sep);
    for (let i = 1; i < formatted.length; i++) {
      lines.push('| ' + formatted[i].join(' | ') + ' |');
    }
  } else {
    // 先頭行をヘッダとして扱わない場合：空のヘッダ行を自動挿入
    const emptyHeader = '| ' + Array(maxCols).fill(' ').join(' | ') + ' |';
    lines.push(emptyHeader);
    lines.push(sep);
    for (const row of formatted) {
      lines.push('| ' + row.join(' | ') + ' |');
    }
  }

  // 出力の行区切りは LF に統一
  return lines.join('\n');
}

// ===== DOM =====
const inputArea        = document.getElementById('inputArea');
const outputArea       = document.getElementById('outputArea');
const convertBtn       = document.getElementById('convertBtn');
const useHeaderChk     = document.getElementById('useHeader');
const newlineModeSelect = document.getElementById('newlineMode');

const ORIGINAL_LABEL = '変換してクリップボードにコピー';

convertBtn.addEventListener('click', async () => {
  const input = inputArea.value;
  if (!input.trim()) return;

  const rows       = parseTSV(input);
  const useHeader  = useHeaderChk.checked;
  const newlineMode = newlineModeSelect.value;
  const result     = generateMarkdown(rows, useHeader, newlineMode);

  outputArea.value = result;

  try {
    await navigator.clipboard.writeText(result);
    showFeedback('コピーしました！', 'copied');
  } catch {
    showFeedback('変換しました（コピー失敗）', 'error');
  }
});

function showFeedback(label, cls) {
  convertBtn.textContent = label;
  convertBtn.classList.add(cls);
  setTimeout(() => {
    convertBtn.textContent = ORIGINAL_LABEL;
    convertBtn.classList.remove(cls);
  }, 2000);
}
