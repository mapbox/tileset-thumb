const split2 = require('split2');
const multipipe = require('multipipe');
const Transform = require('stream').Transform;
const PNG = require('pngjs').PNG;
const concat = require('concat-stream');
const COLOR_WHITE = 255;
const COLOR_GREY = 128;

// Precache zoom level sizes
const ZSIZE = {};
for (let z = 0; z < 30; z++) ZSIZE[z] = Math.pow(2, z);

const zxyToTile = () => {
  return split2((line) => {
    const zxy = line.split('/');
    zxy[0] = parseInt(zxy[0], 10);
    zxy[1] = parseInt(zxy[1], 10);
    zxy[2] = parseInt(zxy[2], 10);
    if (isNaN(zxy[0]) || isNaN(zxy[1]) || isNaN(zxy[2])) throw new Error(`Invalid zxy: ${line}`);
    return { z: zxy[0], x: zxy[1], y: zxy[2] };
  });
};

const paint = (buffer, width, x, y, color) => {
  if (x >= width) throw new Error('x coordinate is beyond width of image');
  const offset = (width * y + x) * 4;
  if (offset >= buffer.length) throw new Error(`y coordinate is beyond height of image (${y} vs ${buffer.length/width/4})`);
  buffer[offset] =
  buffer[offset + 1] =
  buffer[offset + 2] = color;
  buffer[offset + 3] = 255; // alpha
};

// Some zoom levels have smaller dimensions (in tiles) than there are
// pixels in the thumbnail. In these cases we'll want to paint an area
// of the image rather than just a single pixel - calculate the size
// of the area to paint and then iterate over each pixel in it to paint.
const paintTile = (buffer, width, z, x, y, color) => {
  if (x < 0) return;
  if (y < 0) return;
  if (x >= ZSIZE[z]) return;
  if (y >= ZSIZE[z]) return;
  const blockSize = Math.max(1, Math.ceil(width / ZSIZE[z]));
  const x0 = Math.floor((x / ZSIZE[z]) * width);
  const y0 = Math.floor((y / ZSIZE[z]) * width);
  for (let x1 = 0; x1 < blockSize; x1++) {
    for (let y1 = 0; y1 < blockSize; y1++) {
      paint(buffer, width, x0 + x1, y0 + y1, color);
    }
  }
};

const createGrid = (thumbs, size, cols) => {
  const zooms = Object.keys(thumbs).sort();
  const minzoom = Math.min.apply(Math, zooms);
  const maxzoom = Math.max.apply(Math, zooms);
  const rows = Math.floor(maxzoom/cols) + 1;
  const grid = (new Uint8Array((cols * size) * (rows * size) * 4)).fill(COLOR_WHITE);
  zooms.forEach((z) => {
    const row = Math.floor(z / cols);
    const col = z % cols;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const reader = (size * y + x) * 4;
        const wx = (size * col) + x;
        const wy = (size * row) + y;
        paint(grid, size * cols, wx, wy, thumbs[z][reader]);
      }
    }
  });
  return {
    buffer: grid,
    width: size * cols,
    height: size * rows
  };
};

const createThumb = (options) => {
  options = options || {};

  // thumbnail size in pixels
  const size = options.size || 256;

  // number of thumbnails across
  const cols = options.columns || 4;

  // manage thumbnail buffers across zoom levels
  const thumbs = {};

  const thumb = new Transform({
    objectMode: true,
    transform(tile, encoding, callback) {
      thumbs[tile.z] = thumbs[tile.z] || (new Uint8Array(size * size * 4)).fill(COLOR_WHITE);
      paintTile(thumbs[tile.z], size, tile.z, tile.x, tile.y, COLOR_GREY);
      callback();
    },
    flush(callback) {
      const stream = this;
      const grid = createGrid(thumbs, size, cols);
      png = new PNG({
        width: grid.width,
        height: grid.height,
        bitDepth: 8
      });
      png.data = grid.buffer;
      png.pack()
        .on('error', callback)
        .pipe(concat((buffer) => {
          stream.push(buffer);
          callback();
        }));
    }
  });

  if (options.zxy) {
    return multipipe(zxyToTile(), thumb);
  } else {
    return thumb;
  }
};

module.exports = { zxyToTile, paint, paintTile, createGrid, createThumb };
