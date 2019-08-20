const download = require("download");
const rimraf = require("rimraf");

const fileNames = ["BTECH_dues.pdf", "PG_dues.pdf", "PHD_dues.pdf"];

rimraf("./PDFs/*", function() {
  console.log("Cleaning up.");
});

Promise.all(
  fileNames.map(fileName =>
    download(`http://nitc.ac.in/app/webroot/img/upload/${fileName}`, "PDFs")
  )
)
  .then(() => {
    console.log("Downloaded");
  })
  .catch(e => {
    console.error(e);
  });
