const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function concatBytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function u32le(value: number) {
  const out = new Uint8Array(4);
  const view = new DataView(out.buffer);
  view.setUint32(0, value >>> 0, true);
  return out;
}

function u16le(value: number) {
  const out = new Uint8Array(2);
  const view = new DataView(out.buffer);
  view.setUint16(0, value & 0xffff, true);
  return out;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipSingleFile(filename: string, fileData: Uint8Array) {
  const fileNameBytes = textEncoder.encode(filename);
  const crc = crc32(fileData);
  const compSize = fileData.length;
  const uncompSize = fileData.length;

  const localHeader = concatBytes(
    u32le(0x04034b50),
    u16le(20), // version needed
    u16le(0), // flags
    u16le(0), // compression: store
    u16le(0), // mod time
    u16le(0), // mod date
    u32le(crc),
    u32le(compSize),
    u32le(uncompSize),
    u16le(fileNameBytes.length),
    u16le(0), // extra length
    fileNameBytes
  );

  const localOffset = localHeader.length; // file data starts immediately after header
  const centralHeader = concatBytes(
    u32le(0x02014b50),
    u16le(20), // version made by
    u16le(20), // version needed
    u16le(0), // flags
    u16le(0), // compression
    u16le(0),
    u16le(0),
    u32le(crc),
    u32le(compSize),
    u32le(uncompSize),
    u16le(fileNameBytes.length),
    u16le(0),
    u16le(0),
    u16le(0),
    u16le(0),
    u32le(0),
    u32le(0), // local header offset (we write at 0)
    fileNameBytes
  );

  const centralDirOffset = localHeader.length + fileData.length;
  const end = concatBytes(
    u32le(0x06054b50),
    u16le(0),
    u16le(0),
    u16le(1),
    u16le(1),
    u32le(centralHeader.length),
    u32le(centralDirOffset),
    u16le(0)
  );

  return concatBytes(localHeader, fileData, centralHeader, end);
}

export function unzipSingleFile(zipBytes: Uint8Array) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const sig = view.getUint32(0, true);
  if (sig !== 0x04034b50) throw new Error('不是有效的 zip 文件（local header）');
  const fileNameLen = view.getUint16(26, true);
  const extraLen = view.getUint16(28, true);
  const compMethod = view.getUint16(8, true);
  const compSize = view.getUint32(18, true);
  if (compMethod !== 0) throw new Error('暂不支持压缩格式（仅支持 store）');
  const nameStart = 30;
  const nameEnd = nameStart + fileNameLen;
  const dataStart = nameEnd + extraLen;
  const dataEnd = dataStart + compSize;
  const filename = textDecoder.decode(zipBytes.slice(nameStart, nameEnd));
  const data = zipBytes.slice(dataStart, dataEnd);
  return { filename, data };
}

async function deriveKey(password: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBytes(plainText: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plainText));
  const cipher = new Uint8Array(cipherBuf);
  const magic = textEncoder.encode('PFZ1');
  return concatBytes(magic, salt, iv, cipher);
}

export async function decryptBytes(payload: Uint8Array, password: string) {
  const magic = textDecoder.decode(payload.slice(0, 4));
  if (magic !== 'PFZ1') throw new Error('加密数据格式不正确');
  const salt = payload.slice(4, 20);
  const iv = payload.slice(20, 32);
  const cipher = payload.slice(32);
  const key = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return textDecoder.decode(new Uint8Array(plainBuf));
}

