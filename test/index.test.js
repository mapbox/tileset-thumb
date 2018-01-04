const tape = require('tape');
const createThumb = require('../index.js').createThumb;
const fs = require('fs');

tape('createThumb, zxy:true', (assert) => {
  fs.createReadStream(`${__dirname}/fixtures/tiles.zxy`)
    .pipe(createThumb({ zxy: true }))
    .on('data', (buffer) => {
      if (process.env.UPDATE) {
        fs.writeFileSync(`${__dirname}/fixtures/tiles.256.png`, buffer);
      }
      assert.end();
    });
});

tape('createThumb, zxy:true, size:128', (assert) => {
  fs.createReadStream(`${__dirname}/fixtures/tiles.zxy`)
    .pipe(createThumb({ zxy: true, size: 128 }))
    .on('data', (buffer) => {
      if (process.env.UPDATE) {
        fs.writeFileSync(`${__dirname}/fixtures/tiles.128.png`, buffer);
      }
      assert.end();
    });
});

tape('createThumb, zxy:true, size:512', (assert) => {
  fs.createReadStream(`${__dirname}/fixtures/tiles.zxy`)
    .pipe(createThumb({ zxy: true, size: 512 }))
    .on('data', (buffer) => {
      if (process.env.UPDATE) {
        fs.writeFileSync(`${__dirname}/fixtures/tiles.512.png`, buffer);
      }
      assert.end();
    });
});

