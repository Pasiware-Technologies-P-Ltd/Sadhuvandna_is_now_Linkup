const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src');

const replacements = [
    // Hex colors
    { from: /#ea580c/gi, to: '#2563EB' }, // Primary
    { from: /#f97316/gi, to: '#93C5FD' }, // Story Gradient End (Assuming orange-500)
    { from: /#9a3412/gi, to: '#172554' }, // Primary Dark
    { from: /#ffedd5/gi, to: '#DBEAFE' }, // Primary Light
    { from: /#fff7ed/gi, to: '#EFF6FF' }, // Input Background
    { from: /#f9fafb/gi, to: '#F8FAFC' }, // Screen Background
    { from: /#1f2937/gi, to: '#172554' }, // Primary Text
    { from: /#111827/gi, to: '#172554' }, // Primary Text
    { from: /#6b7280/gi, to: '#64748B' }, // Secondary Text
    { from: /#4b5563/gi, to: '#64748B' }, // Secondary Text
    { from: /#e5e7eb/gi, to: '#E2E8F0' }, // Borders / Dividers
    { from: /#f3f4f6/gi, to: '#E2E8F0' }, // Borders / Dividers

    // Tailwind classes (Orange to Blue)
    { from: /text-orange-600/g, to: 'text-blue-600' },
    { from: /bg-orange-600/g, to: 'bg-blue-600' },
    { from: /border-orange-600/g, to: 'border-blue-600' },
    { from: /text-orange-500/g, to: 'text-blue-500' },
    { from: /bg-orange-500/g, to: 'bg-blue-500' },
    { from: /bg-orange-100/g, to: 'bg-blue-100' },
    { from: /bg-orange-50/g, to: 'bg-blue-50' },
    { from: /text-orange-700/g, to: 'text-blue-950' },
    
    // Tailwind classes (Grays to Slate/Blue)
    { from: /text-gray-900/g, to: 'text-blue-950' },
    { from: /text-gray-800/g, to: 'text-blue-900' },
    { from: /text-gray-700/g, to: 'text-slate-600' },
    { from: /text-gray-600/g, to: 'text-slate-500' },
    { from: /text-gray-500/g, to: 'text-slate-500' },
    { from: /bg-gray-50/g, to: 'bg-slate-50' },
    { from: /bg-gray-100/g, to: 'bg-slate-100' },
    { from: /bg-gray-200/g, to: 'bg-slate-200' },
    { from: /border-gray-200/g, to: 'border-slate-200' },
    { from: /border-gray-300/g, to: 'border-slate-300' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            for (const replacement of replacements) {
                if (replacement.from.test(content)) {
                    content = content.replace(replacement.from, replacement.to);
                    modified = true;
                }
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory(directoryPath);
console.log("Done.");
