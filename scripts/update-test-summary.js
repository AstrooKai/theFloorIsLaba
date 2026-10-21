// Automated test summary counter for TESTING.md
const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '..', 'TESTING.md');

function updateSummary() {
  if (!fs.existsSync(TARGET_FILE)) {
    console.error('File not found:', TARGET_FILE);
    return;
  }

  const content = fs.readFileSync(TARGET_FILE, 'utf8');
  const lines = content.split('\n');

  const sections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const secMatch = line.match(/^##\s+(\d+\.\s+.*)$/);

    if (secMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: secMatch[1].trim(),
        total: 0,
        checked: 0,
        unchecked: 0
      };
      continue;
    }

    if (currentSection) {
      if (/^\s*-\s*\[[xX]\]/.test(line)) {
        currentSection.total++;
        currentSection.checked++;
      } else if (/^\s*-\s*\[\s*\]/.test(line)) {
        currentSection.total++;
        currentSection.unchecked++;
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  const totalCases = sections.reduce((acc, s) => acc + s.total, 0);
  const totalChecked = sections.reduce((acc, s) => acc + s.checked, 0);
  const totalUnchecked = sections.reduce((acc, s) => acc + s.unchecked, 0);
  const percentage = totalCases > 0 ? ((totalChecked / totalCases) * 100).toFixed(1) : 0;

  // Build section items list
  const sectionListMarkdown = sections.map(sec => {
    if (sec.total === 0) return `- **${sec.title}:** 0 test cases`;
    if (sec.checked === sec.total) {
      return `- **${sec.title}:** ${sec.checked}/${sec.total} completed (All verified)`;
    }
    return `- **${sec.title}:** ${sec.checked}/${sec.total} completed (${sec.unchecked} pending)`;
  }).join('\n');

  // Build replacement blockquote
  const newBlockquote = `<blockquote style="border-left: 4px solid #ea580c; padding: 12px 18px; background-color: rgba(234, 88, 12, 0.08); border-radius: 6px; margin: 16px 0 24px 0;">

**Test Suite Summary:** **${totalCases} Total Test Cases** &bull; **${totalChecked} Completed** &bull; **${totalUnchecked} Pending Verification**

${sectionListMarkdown}

**Progress:** ${percentage}% (${totalChecked}/${totalCases})

**Test Environment:** \`http://localhost:5000\`

**Database:** MySQL 8.0+ (Local)

</blockquote>`;

  const bqRegex = /<blockquote[\s\S]*?<\/blockquote>/;
  if (!bqRegex.test(content)) {
    console.error('Could not find <blockquote> in TESTING.md');
    return;
  }

  const updatedContent = content.replace(bqRegex, newBlockquote);

  if (updatedContent === content) {
    console.log(`[Summary up-to-date] ${totalChecked}/${totalCases} verified (${percentage}%)`);
    return;
  }

  fs.writeFileSync(TARGET_FILE, updatedContent, 'utf8');
  console.log(`[Summary updated] ${totalChecked}/${totalCases} verified (${percentage}%)`);
}

const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');

if (isWatch) {
  console.log('Watching TESTING.md for checkbox changes... (Press Ctrl+C to stop)');
  updateSummary();

  let debounceTimer = null;
  fs.watch(TARGET_FILE, (eventType) => {
    if (eventType === 'change') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateSummary();
      }, 300);
    }
  });
} else {
  updateSummary();
}
