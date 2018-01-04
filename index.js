const split2 = require('split2');
const multipipe = require('multipipe');
const Transform = require('stream').Transform;
const PNG = require('pngjs').PNG;
const concat = require('concat-stream');

const createThumb = (options) => {
  options.width = options.width || 256;
  options.height = options.height || 256;
  options.columns = options.columns || 4;

  const thumbs = {};
  const dimensions = {};

  const thumb = new Transform({
    objectMode: true,
    transform(tile, encoding, callback) {
      if (!thumbs[tile.z]) {
        const bitmap = new Uint8Array(options.width * options.height * 4);
        bitmap.fill(255);
        thumbs[tile.z] = bitmap;
        dimensions[tile.z] = Math.pow(2, tile.z);
      }
      const blockSize = Math.max(1, Math.ceil(options.width/dimensions[tile.z]));
      const x0 = Math.round((tile.x / dimensions[tile.z]) * options.width);
      const y0 = Math.round((tile.y / dimensions[tile.z]) * options.height);
      for (let x1 = 0; x1 < blockSize; x1++) {
        for (let y1 = 0; y1 < blockSize; y1++) {
          const offset = (options.width * (y0 + y1) + (x0 + x1)) * 4
          thumbs[tile.z][offset] =
          thumbs[tile.z][offset + 1] =
          thumbs[tile.z][offset + 2] = Math.max(0, thumbs[tile.z][offset] - 128);
        }
      }
      return callback();
    },
    flush(callback) {
      const zooms = Object.keys(thumbs).sort();
      const minzoom = Math.min.apply(Math, zooms);
      const maxzoom = Math.max.apply(Math, zooms);
      const cols = options.columns;
      const rows = Math.floor(maxzoom/cols) - Math.floor(minzoom/cols);

      // create multigrid
      const grid = new Uint8Array((cols * options.width) * (rows * options.height) * 4);
      grid.fill(255);

      zooms.forEach((z, num) => {
        const row = Math.floor(num / cols);
        const col = num % cols;
        for (let x = 0; x < options.width; x++) {
          for (let y = 0; y < options.height; y++) {
            const reader = (options.width * y + x) * 4
            const wx = (options.width * col) + x;
            const wy = (options.height * row) + y;
            const writer = (options.width * cols * wy + wx) * 4;
            grid[writer] = thumbs[z][reader];
            grid[writer + 1] = thumbs[z][reader + 1];
            grid[writer + 2] = thumbs[z][reader + 2];
          }
        }
      });

      const stream = this;
      png = new PNG({
        width: options.width * cols,
        height: options.height * rows,
        bitDepth: 8
      });
      png.data = grid;
      png.pack()
        .on('error', callback)
        .pipe(concat((buffer) => {
          stream.push(buffer);
          callback();
        }));
    }
  });
  if (options.zxy) {
    const zxy = split2((line) => {
      const zxy = line.split('/');
      zxy[0] = parseInt(zxy[0], 10);
      zxy[1] = parseInt(zxy[1], 10);
      zxy[2] = parseInt(zxy[2], 10);
      if (isNaN(zxy[0]) || isNaN(zxy[1]) || isNaN(zxy[2])) throw new Error(`Invalid zxy: ${line}`);
      return { z: zxy[0], x: zxy[1], y: zxy[2] };
    });
    return multipipe(zxy, thumb);
  } else {
    return thumb;
  }
};

module.exports = { createThumb };
