import fs from 'fs';
import path from 'path';

const schemaPath = path.join('server', 'db', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Remove @@schema("public") attributes
content = content.replace(/@@schema\("public"\)\n\s+/g, '');

// Remove schemas = ["public", "auth"]
content = content.replace(/schemas\s+=\s+\["public", "auth"\]\n/g, '');

// Remove previewFeatures = ["multiSchema"]
content = content.replace(/previewFeatures\s+=\s+\["multiSchema"\]\n/g, '');

fs.writeFileSync(schemaPath, content);
console.log('Schema reverted to single-schema mode');
