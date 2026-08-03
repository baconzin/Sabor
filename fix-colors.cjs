const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/text-lime-600/g, 'text-lime-500');
content = content.replace(/text-lime-700/g, 'text-lime-400');
content = content.replace(/text-lime-800/g, 'text-lime-300');
content = content.replace(/text-red-700/g, 'text-red-400');
content = content.replace(/text-red-600/g, 'text-red-500');
content = content.replace(/text-red-800/g, 'text-red-300');
content = content.replace(/bg-lime-50 /g, 'bg-lime-900/30 ');
content = content.replace(/bg-red-50 /g, 'bg-red-900/30 ');
content = content.replace(/bg-red-100/g, 'bg-red-900/40');
content = content.replace(/bg-lime-100/g, 'bg-lime-900/40');
content = content.replace(/bg-lime-950/g, 'bg-lime-900/40');
content = content.replace(/text-zinc-800/g, 'text-zinc-100');
content = content.replace(/bg-zinc-800 text-white/g, 'bg-lime-600 text-zinc-950');

fs.writeFileSync('src/App.tsx', content);
