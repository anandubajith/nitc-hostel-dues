const pdf_table_extractor = require("pdf-table-extractor");
const admin = require("firebase-admin");

const serviceAccount = require("./service-key.json");

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
  // let date = s
  //   .split(" ")
  //   .reverse()
  //   .slice(0, 3)
  //   .reverse()
  //   .join(" ")
  //   .replace(")", "")
  //   .replace("\n", "")
  //   .toUpperCase();
  let pattern = /\d{2}\S{2}\s?\w{3,9}\s?\d{4}/;
  let date =  pattern.exec(s);
  console.log(f + " Last Updated: " + date);
  return db.ref("last_updated").set(date.toString());
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
      // Find a permanent solution 
      // They keep changing indexes
      if (item[0].length === 9) {
        promises.push(
          db.ref(item[0]).set({
            name: item[1],
            due: item[2],
            note: item[3]
          })
        );
      } else if (item[1].length === 9) {
        promises.push(
          db.ref(item[1]).set({
            name: item[2],
            due: item[3],
            note: item[4]
          })
        );
      }
    });
  });
  return Promise.all(promises);
}

const fileNames = [
  "PDFs/BTECH.pdf",
  "PDFs/PG.pdf",
  "PDFs/PHD.pdf"
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
