const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const optimize = (req, res, next) => {
  if (req.file) {
    const filePath = req.file.path;

    const cleanImagePath = path.normalize(filePath);

    const lastDot = cleanImagePath.lastIndexOf(".");
    const imageName = cleanImagePath.substring(0, lastDot);
    const newExtension = ".webp";

    const newFilePath = path.join(path.dirname(cleanImagePath), 'resized_' + path.basename(imageName) + newExtension);

    req.file.path = newFilePath;
    req.file.filename = 'resized_' + path.basename(imageName) + newExtension;

    sharp(cleanImagePath)
      .resize(500, 500, { fit: 'inside' })
      .toFormat('webp')
      .toFile(newFilePath, (err, info) => {
        const filename = filePath.split(path.sep).pop();
        console.log(filename)
        fs.unlinkSync(`images/${filename}`)
        console.log(err);
      });
  }
  next();
}

module.exports = optimize;
