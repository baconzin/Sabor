const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacements = {
  'bg-zinc-50': 'bg-zinc-950',
  'bg-zinc-100': 'bg-zinc-800',
  'bg-zinc-200': 'bg-zinc-700',
  'border-zinc-200': 'border-zinc-800',
  'border-zinc-100': 'border-zinc-800',
  'border-zinc-300': 'border-zinc-700',
  'text-zinc-900': 'text-zinc-50',
  'text-zinc-800': 'text-zinc-100',
  'text-zinc-700': 'text-zinc-200',
  'text-zinc-600': 'text-zinc-300',
  'text-zinc-500': 'text-zinc-400',
  'text-zinc-400': 'text-zinc-500',
  // lime
  'lime-950': 'lime-900',
  'bg-lime-50': 'bg-lime-950',
};

// We need to carefully replace because changing bg-zinc-50 to bg-zinc-950 
// shouldn't be overridden by bg-zinc-900 if we had such replacement.

let newContent = content;

// Temporary replace to avoid collisions
Object.entries(replacements).forEach(([from, to], index) => {
  newContent = newContent.replace(new RegExp(from, 'g'), `__TMP_${index}__`);
});

Object.entries(replacements).forEach(([from, to], index) => {
  newContent = newContent.replace(new RegExp(`__TMP_${index}__`, 'g'), to);
});

// also fix some specific cases
newContent = newContent.replace(/bg-zinc-900 hover:bg-zinc-800 text-white/g, 'bg-lime-500 hover:bg-lime-600 text-zinc-950');

fs.writeFileSync('src/App.tsx', newContent);
