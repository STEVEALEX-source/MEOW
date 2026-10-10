export const MAX_ROM_BYTES = 64 * 1024 * 1024;

export const SYSTEMS = Object.freeze({
  nes: Object.freeze({
    id: 'nes',
    label: 'Nintendo Entertainment System',
    shortLabel: 'NES',
    core: 'nes',
    controlScheme: 'nes',
    extensions: Object.freeze(['.nes', '.zip']),
    minBytes: 16,
    accept: '.nes,.zip',
    hint: 'NES ROMs: .nes or .zip',
  }),
  gba: Object.freeze({
    id: 'gba',
    label: 'Game Boy Advance',
    shortLabel: 'GBA',
    core: 'gba',
    controlScheme: 'gba',
    extensions: Object.freeze(['.gba', '.agb', '.bin', '.zip']),
    minBytes: 4,
    accept: '.gba,.agb,.bin,.zip',
    hint: 'GBA ROMs: .gba, .agb, .bin or .zip',
  }),
});

function extensionOf(filename) {
  const dot = filename.lastIndexOf('.');
  return dot < 0 ? '' : filename.slice(dot).toLowerCase();
}

export function detectSystem(filename) {
  const extension = extensionOf(filename);
  if (extension === '.nes') return 'nes';
  if (['.gba', '.agb', '.bin'].includes(extension)) return 'gba';
  return null;
}

export function validateRomFile(filename, size, systemId) {
  const system = SYSTEMS[systemId];
  if (!system) throw new Error('Choose NES or Game Boy Advance first.');
  if (typeof filename !== 'string' || !filename.trim()) throw new Error('Choose a ROM file.');
  if (!Number.isSafeInteger(size) || size < system.minBytes) throw new Error(`${system.shortLabel} files must be at least ${system.minBytes} bytes.`);
  if (size > MAX_ROM_BYTES) throw new Error('ROM files must be 64 MiB or smaller.');
  const extension = extensionOf(filename);
  if (!system.extensions.includes(extension)) throw new Error(`${system.shortLabel} accepts ${system.extensions.join(', ')} files.`);
  return { systemId, extension, size };
}
