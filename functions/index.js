const functions = require('firebase-functions');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pdf_table_extractor = require("pdf-table-extractor");


const admin = require('firebase-admin');
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
	// fetch the file
	// run pdftable extractor
	// save the data

});


