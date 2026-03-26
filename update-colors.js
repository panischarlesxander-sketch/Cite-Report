const fs = require('fs');
const path = require('path');

const files = [
  'app/faculty/wfh/page.tsx',
  'app/chair/wfh/page.tsx',
  'app/chair/chair/page.tsx',
  'app/dean/dean/page.tsx',
  'app/faculty/faculty/page.tsx',
  'app/dean/wfh/page.tsx',
  'app/admin/announcement/page.tsx',
  'app/admin/users/page.tsx',
  'app/admin/wfh/page.tsx',
  'app/login/page.tsx',
  'app/page.tsx',
  'app/register/page.tsx',
  'app/admin/reports/page.tsx'
];

files.forEach(f => {
  const filePath = path.join(__dirname, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace whole word matches of slate- and indigo-
    content = content.replace(/\bslate-/g, 'gray-');
    content = content.replace(/\bindigo-/g, 'orange-');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${f}`);
  } else {
    console.log(`File not found: ${f}`);
  }
});
