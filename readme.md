tileset-thumb
-------------
Pipe a tileset's [tilelive](https://github.com/mapbox/tilelive) stream into `tileset-thumb` to generate a PNG thumbnail summarizing coverage of that tileset's tiles.

Example usage:

```js
const Mbtiles = require('mbtiles');
const createThumb = require('tileset-thumb').createThumb;
const fs = require('fs');

new Mbtiles('./some.mbtiles', (err, source) => {
  if (err) throw err;
  // Create a ZXY stream from an mbtiles file
  source.createZXYStream()
    // Pipe the stream to tileset-thumb
    .pipe(createThumb({ zxy: true }))
    // Pipe the resulting PNG to a file
    .pipe(fs.createWriteStream('./some.thumb.png'));
});
```

