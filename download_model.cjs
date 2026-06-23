const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb';
const path = 'public/CesiumMan.glb';

https.get(url, (res) => {
  const fileStream = fs.createWriteStream(path);
  res.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Download complete.');
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
