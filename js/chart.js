async function fetchSkillData(csvPath) {
  const res = await fetch(csvPath);
  const text = await res.text();
  return text.trim().split('\n').slice(1).map(line => {
    const commaIdx = line.indexOf(',');
    const name = line.slice(0, commaIdx).trim();
    const months = parseInt(line.slice(commaIdx + 1).trim(), 10);
    return { name, months };
  }).sort((a, b) => b.months - a.months);
}

function renderChart(container, rows) {
  const max = Math.max(...rows.map(r => r.months), 1);

  rows.forEach(({ name, months }) => {
    const pct = (months / max) * 100;

    const row = document.createElement('div');
    row.className = 'skill-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'skill-name';
    nameEl.textContent = name;

    const barWrap = document.createElement('div');
    barWrap.className = 'skill-bar-wrap';

    const bar = document.createElement('div');
    bar.className = 'skill-bar';
    bar.style.width = '0%';

    const label = document.createElement('span');
    label.className = 'skill-months';
    label.textContent = months === 0 ? '学習中' : `${months} ヶ月`;

    barWrap.appendChild(bar);
    row.appendChild(nameEl);
    row.appendChild(barWrap);
    row.appendChild(label);
    container.appendChild(row);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = pct + '%';
      });
    });
  });
}

async function loadSkillCharts() {
  const section = document.getElementById('skillChart');
  if (!section) return;

  const categories = [
    { label: 'プログラミング言語', path: 'data/skills/languages.csv' },
    { label: 'データベース',          path: 'data/skills/db.csv' },
    { label: 'OS（開発環境として）', path: 'data/skills/os.csv' },
    { label: 'ツール類',             path: 'data/skills/tools.csv' },
  ];

  for (const { label, path } of categories) {
    let rows;
    try {
      rows = await fetchSkillData(path);
    } catch {
      continue;
    }

    const heading = document.createElement('h3');
    heading.className = 'skill-category';
    heading.textContent = label;

    const chart = document.createElement('div');
    chart.className = 'skill-chart';

    renderChart(chart, rows);

    section.appendChild(heading);
    section.appendChild(chart);
  }
}

loadSkillCharts();
