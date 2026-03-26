const fs = require('fs');
const path = require('path');

const files = [
  'app/faculty/wfh/page.tsx',
  'app/chair/wfh/page.tsx',
  'app/chair/chair/page.tsx',
  'app/dean/dean/page.tsx',
  'app/faculty/faculty/page.tsx',
  'app/dean/wfh/page.tsx',
  'app/admin/reports/page.tsx',
  'app/admin/users/page.tsx',
  'app/admin/wfh/page.tsx'
];

files.forEach(f => {
  const filePath = path.join(__dirname, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Status colors
    content = content.replace(/\bemerald-/g, 'green-');
    content = content.replace(/\bteal-/g, 'green-');
    content = content.replace(/\brose-/g, 'red-');
    content = content.replace(/\bpink-/g, 'red-');
    
    // Theme colors (purple/violet/cyan -> orange/blue)
    content = content.replace(/\bpurple-/g, 'orange-');
    content = content.replace(/\bviolet-/g, 'orange-');
    content = content.replace(/\bcyan-/g, 'blue-');
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated secondary colors in ${f}`);
  } else {
    console.log(`File not found: ${f}`);
  }
});
