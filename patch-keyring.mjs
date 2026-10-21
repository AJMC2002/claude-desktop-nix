import {createHash} from 'node:crypto';
import {openSync, readSync, writeSync, closeSync} from 'node:fs';

const archive = process.argv[2];
const fd = openSync(archive, 'r+');
const hash = data => createHash('sha256').update(data).digest('hex');

try {
  const prefix = Buffer.alloc(16);
  readSync(fd, prefix, 0, prefix.length, 0);
  const headerSize = prefix.readUInt32LE(4);
  const headerLength = prefix.readUInt32LE(12);
  const headerBuffer = Buffer.alloc(headerSize);
  readSync(fd, headerBuffer, 0, headerSize, 8);
  const header = JSON.parse(headerBuffer.subarray(8, 8 + headerLength).toString());
  const entryOffset = 8 + headerSize;
  let found;

  const visit = files => {
    for (const [name, entry] of Object.entries(files ?? {})) {
      if (entry.files) {
        visit(entry.files);
        continue;
      }
      if (entry.size < 1 || entry.offset === undefined) continue;
      const data = Buffer.alloc(entry.size);
      readSync(fd, data, 0, data.length, entryOffset + Number(entry.offset));
      if (data.includes('/usr/bin/secret-tool') && data.includes('/usr/bin/kwallet-query')) {
        if (found) throw new Error('Multiple keyring implementations found');
        found = {name, entry, data};
      }
    }
  };
  visit(header.files);
  if (!found) throw new Error('Claude keyring implementation not found');

  const original = found.data.toString();
  const patched = original.replace(
    'var oe="/usr/bin/secret-tool",M="/usr/bin/kwallet-query"',
    'var oe="secret-tool",M="kwallet-query"',
  );
  if (patched === original) throw new Error('Unexpected Claude keyring implementation');
  const data = Buffer.from(patched);
  if (data.length > found.data.length) throw new Error('Keyring patch grew the ASAR entry');
  data.copy(found.data);
  found.data.fill(0x20, data.length);
  const entry = found.entry;
  entry.integrity.hash = hash(found.data);
  entry.integrity.blocks = Array.from(
    {length: Math.ceil(found.data.length / entry.integrity.blockSize)},
    (_, i) => hash(found.data.subarray(i * entry.integrity.blockSize, (i + 1) * entry.integrity.blockSize)),
  );
  const newHeader = Buffer.from(JSON.stringify(header));
  if (newHeader.length !== headerLength) throw new Error('Keyring patch changed ASAR header size');
  writeSync(fd, found.data, 0, found.data.length, entryOffset + Number(entry.offset));
  writeSync(fd, newHeader, 0, newHeader.length, 16);
  console.log(`patched ${found.name}`);
} finally {
  closeSync(fd);
}
