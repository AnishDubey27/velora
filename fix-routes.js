const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('route.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const routes = walk('c:/Users/Anish/Desktop/velora/app/api');
routes.forEach(route => {
    let content = fs.readFileSync(route, 'utf8');
    if (!content.includes('force-dynamic')) {
        fs.writeFileSync(route, `export const dynamic = 'force-dynamic';\n` + content);
        console.log('Fixed', route);
    }
});
