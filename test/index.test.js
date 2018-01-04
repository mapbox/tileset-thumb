const tape = require('tape');
const createThumb = require('../index.js').createThumb;
const fs = require('fs');

tape('createThumb', (assert) => {
  const thumb = createThumb({ zxy: true });
  const zxy = fs.createReadStream(`${__dirname}/fixtures/tiles.zxy`);
  zxy.pipe(thumb)
    .on('data', (buffer) => {
      if (process.env.UPDATE) {
        fs.writeFileSync(`${__dirname}/fixtures/tiles.expected.png`, buffer);
      }
      assert.end();
    });
});

