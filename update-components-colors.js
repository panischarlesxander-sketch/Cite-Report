const fs = require('fs');
const path = require('path');

const files = [
  'components/AnnouncementList.tsx',
  'components/DashboardLayout.tsx',
  'components/ReportImageViewer.tsx',
  'components/WFHAccomplishmentForm.tsx'
];

files.forEach(f => {
  const filePath = path.join(__dirname, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Gray neutrals
    content = content.replace(/\bslate-/g, 'gray-');
    
    // Theme colors (indigo/purple/violet/cyan -> orange/blue)
    content = content.replace(/\bindigo-/g, 'orange-');
    content = content.replace(/\bpurple-/g, 'orange-');
    content = content.replace(/\bviolet-/g, 'orange-');
    content = content.replace(/\bcyan-/g, 'blue-');

    // Status colors (emerald/teal -> green, rose/pink -> red)
    content = content.replace(/\bemerald-/g, 'green-');
    content = content.replace(/\bteal-/g, 'green-');
    content = content.replace(/\brose-/g, 'red-');
    content = content.replace(/\bpink-/g, 'red-');
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated colors in ${f}`);
  } else {
    console.log(`File not found: ${f}`);
  }
});
