const functions = require('firebase-functions');

const files = {
  "BTECH": "http://nitc.ac.in/app/webroot/img/upload/BTECH.pdf",
  "PG": "http://www.nitc.ac.in/app/webroot/img/upload/PG.pdf",
  "PHD": "http://www.nitc.ac.in/app/webroot/img/upload/PHD.pdf"
}

exports.archivePdf = functions.https.onRequest((req, res) => {
  const bucket = admin.storage().bucket();
  const eventref = admin.database().ref('details');
  const snapshot = await eventref.once('value');
  let value = snapshot.val();
  if (!value) {
    value = {
      "BTECH": "",
      "PG": "",
      "PHD": "",
    }
  }

  const uploadPromises = [];

  Object.keys(files).forEach(course => {
    let filePath = `/tmp/${course}.pdf`;
    fs.writeFileSync(filePath, await download(files[course]));
    let hash = await hasha.fromFile(filePath, { algorithm: 'md5' });
    if (hash !== value[course]) {
      // hash has changed => new file
      uploadPromises.push(bucket.upload(filePath, {
        destination: `${course}_${Date.now()}.pdf`,
      }));
      value[course] = hash;
    }
  });

  await eventref.set(value);
  res.send("Success");

});