var download = require('download-file')
 
var url = "http://i.imgur.com/G9bDaPH.jpg"
 
var options = {
    directory: "./images/cats/",
    filename: "cat.gif"
}
 
download(url, options, function(err){
    if (err) throw err
    console.log("meow")
}) 