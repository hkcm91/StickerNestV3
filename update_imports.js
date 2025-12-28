import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.git') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(path.join(dir, f));
        }
    });
}

walkDir('server', (filePath) => {
    if (filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        if (content.includes("from '../utils/errors'")) {
            content = content.replace(/from '..\/utils\/errors'/g, "from '../utils/AppErrors.js'");
            changed = true;
        }
        if (content.includes('from "../utils/errors"')) {
            content = content.replace(/from "..\/utils\/errors"/g, 'from "../utils/AppErrors.js"');
            changed = true;
        }
        if (content.includes("from '../utils/errors.js'")) {
            content = content.replace(/from '..\/utils\/errors.js'/g, "from '../utils/AppErrors.js'");
            changed = true;
        }

        if (changed) {
            console.log(`Updating ${filePath}`);
            fs.writeFileSync(filePath, content);
        }
    }
});
