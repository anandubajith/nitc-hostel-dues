const pdf_table_extractor = require("pdf-table-extractor");
const admin = require("firebase-admin");

const serviceAccount = require("../service-key.json");

function extract(file) {
  return new Promise(function(resolve, reject) {
    pdf_table_extractor(file, resolve, reject);
  });
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nitc-hostel-dues.firebaseio.com"
});
const db = admin.database();

function setLastUpdated(f, s) {
  let date = s
    .split(" ")
    .reverse()
    .slice(0, 3)
    .reverse()
    .join(" ")
    .replace(")", "")
    .toUpperCase();
  console.log(f + " Last Updated: " + date);
  return db.ref("last_updated").set(date);
}

function parsePDF(result) {
  let promises = [];
  setLastUpdated(
    result.pageTables[0].tables[2][0],
    result.pageTables[0].tables[0][0]
  );
  // use filter and flatMaps?
  result.pageTables.map(page => {
    page.tables.map(item => {
      if (item[0].length === 9) {
        promises.push(
          db.ref(item[0]).set({
            name: item[1],
            due: item[2]
          })
        );
      }
    });
  });
  return Promise.all(promises);
}

const fileNames = [
  "PDFs/BTECH_dues.pdf",
  "PDFs/PG_dues.pdf",
  "PDFs/PHD_dues.pdf"
];

filePromises = fileNames.map(file => extract(file).then(parsePDF));

Promise.all(filePromises)
  .then(() => {
    console.log("Successfully updated");
    process.exit(0);
  })
  .catch(e => {
    console.log("Error", e);
  });
