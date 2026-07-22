export const ENCRYPTED_BACKUP_FORMAT = "auralis-encrypted-backup" as const;
export const ENCRYPTED_BACKUP_VERSION = 1 as const;
export const PBKDF2_ITERATIONS = 310_000;
export const MAX_ENCRYPTED_BACKUP_BYTES = 6 * 1024 * 1024;

export type EncryptedBackupEnvelope = {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: typeof PBKDF2_ITERATIONS;
    salt: string;
  };
  cipher: {
    name: "AES-GCM";
    iv: string;
  };
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const additionalData = encoder.encode("auralis-encrypted-backup:v1:PBKDF2-SHA256:AES-256-GCM");

function bytesToBase64(bytes: Uint8Array<ArrayBuffer>) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string, label: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error(`${label} inválido`);
  }
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    if (bytesToBase64(bytes) !== value) throw new Error("not canonical");
    return bytes;
  } catch {
    throw new Error(`${label} inválido`);
  }
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string) {
  if (Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) {
    throw new Error(`${label} inválido`);
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} inválido`);
  }
  return value as Record<string, unknown>;
}

function assertPassphrase(passphrase: string) {
  if (passphrase.length < 10 || passphrase.length > 1_024) {
    throw new Error("La frase secreta debe tener entre 10 y 1024 caracteres");
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function validateEncryptedEnvelope(value: unknown): EncryptedBackupEnvelope {
  const envelope = object(value, "Sobre cifrado");
  exactKeys(envelope, ["format", "version", "kdf", "cipher", "ciphertext"], "Sobre cifrado");
  if (envelope.format !== ENCRYPTED_BACKUP_FORMAT || envelope.version !== ENCRYPTED_BACKUP_VERSION) {
    throw new Error("Formato o versión de archivo no compatible");
  }
  const kdf = object(envelope.kdf, "KDF");
  exactKeys(kdf, ["name", "hash", "iterations", "salt"], "KDF");
  if (kdf.name !== "PBKDF2" || kdf.hash !== "SHA-256" || kdf.iterations !== PBKDF2_ITERATIONS || typeof kdf.salt !== "string") {
    throw new Error("Parámetros de derivación inválidos");
  }
  const cipher = object(envelope.cipher, "Cifrado");
  exactKeys(cipher, ["name", "iv"], "Cifrado");
  if (cipher.name !== "AES-GCM" || typeof cipher.iv !== "string" || typeof envelope.ciphertext !== "string") {
    throw new Error("Parámetros de cifrado inválidos");
  }
  if (base64ToBytes(kdf.salt, "Salt").byteLength !== 16) throw new Error("Salt inválido");
  if (base64ToBytes(cipher.iv, "IV").byteLength !== 12) throw new Error("IV inválido");
  const ciphertext = base64ToBytes(envelope.ciphertext, "Contenido cifrado");
  if (ciphertext.byteLength < 17 || ciphertext.byteLength > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error("Contenido cifrado inválido o demasiado grande");
  }
  return envelope as EncryptedBackupEnvelope;
}

export async function encryptBackup(plaintext: string, passphrase: string) {
  assertPassphrase(passphrase);
  const plaintextBytes = encoder.encode(plaintext);
  if (plaintextBytes.byteLength > MAX_ENCRYPTED_BACKUP_BYTES) throw new Error("La copia es demasiado grande");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData, tagLength: 128 },
    key,
    plaintextBytes,
  );
  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: { name: "AES-GCM", iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  } satisfies EncryptedBackupEnvelope;
}

export async function decryptBackup(value: unknown, passphrase: string) {
  assertPassphrase(passphrase);
  const envelope = validateEncryptedEnvelope(value);
  const salt = base64ToBytes(envelope.kdf.salt, "Salt");
  const iv = base64ToBytes(envelope.cipher.iv, "IV");
  const ciphertext = base64ToBytes(envelope.ciphertext, "Contenido cifrado");
  try {
    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 },
      key,
      ciphertext,
    );
    return decoder.decode(decrypted);
  } catch {
    throw new Error("Frase secreta incorrecta o archivo alterado");
  }
}
