import fs from 'fs';
import path from 'path';

const schemaPath = path.join('server', 'db', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Fix the literal `n characters from the bad PowerShell replace
content = content.replace(/@@schema\("public"\)`n\s+@@map/g, '@@schema("public")\n  @@map');

fs.writeFileSync(schemaPath, content);
console.log('Schema fixed');
