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
  const patchedEntries = [];
  let busctlPatched = false;
  let keyringPatched = false;

  const visit = files => {
    for (const [name, entry] of Object.entries(files ?? {})) {
      if (entry.files) {
        visit(entry.files);
        continue;
      }
      if (entry.size < 1 || entry.offset === undefined) continue;
      const data = Buffer.alloc(entry.size);
      readSync(fd, data, 0, data.length, entryOffset + Number(entry.offset));
      const original = data.toString();
      const hasBusctl = original.includes('"/usr/bin/busctl"');
      const hasKeyring = original.includes('/usr/bin/secret-tool') && original.includes('/usr/bin/kwallet-query');
      if (!hasBusctl && !hasKeyring) continue;

      let patched = original;
      if (hasBusctl) {
        patched = patched.replaceAll('"/usr/bin/busctl"', 'process.env.CB');
        busctlPatched ||= patched !== original;
      }
      if (hasKeyring) {
        patched = patched.replace(
          'var oe="/usr/bin/secret-tool",M="/usr/bin/kwallet-query"',
          'var oe=process.env.CS,M=process.env.CK',
        );
        keyringPatched ||= patched !== original;
      }
      if (patched === original || patched.includes('"/usr/bin/busctl"')) {
        throw new Error(`Unexpected Claude keyring implementation in ${name}`);
      }
      const replacement = Buffer.from(patched);
      if (replacement.length > data.length) throw new Error(`Keyring patch grew ASAR entry ${name}`);
      replacement.copy(data);
      data.fill(0x20, replacement.length);
      entry.integrity.hash = hash(data);
      entry.integrity.blocks = Array.from(
        {length: Math.ceil(data.length / entry.integrity.blockSize)},
        (_, i) => hash(data.subarray(i * entry.integrity.blockSize, (i + 1) * entry.integrity.blockSize)),
      );
      patchedEntries.push({name, entry, data});
    }
  };
  visit(header.files);
  if (!busctlPatched || !keyringPatched) {
    throw new Error(`Claude keyring implementation not found (busctl=${busctlPatched}, keyring=${keyringPatched})`);
  }

  const newHeader = Buffer.from(JSON.stringify(header));
  if (newHeader.length !== headerLength) throw new Error('Keyring patch changed ASAR header size');
  for (const {name, entry, data} of patchedEntries) {
    writeSync(fd, data, 0, data.length, entryOffset + Number(entry.offset));
    console.log(`patched ${name}`);
  }
  writeSync(fd, newHeader, 0, newHeader.length, 16);
} finally {
  closeSync(fd);
}
