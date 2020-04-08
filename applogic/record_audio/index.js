const express = require('express');
const app = express();


const multer = require('multer');
const upload = multer();



var fs = require('fs');
const catalyst = require("zcatalyst-sdk-node");

var userEmail = ' ';



async function processForUploadToFileStore(req, base_audioBuffer, transcription) {

    console.log('in processForUploadToFileStore .... ');
    const catalystApp = catalyst.initialize(req);
    const filestore = catalystApp.filestore();

    var genRandomNum = Math.floor(Date.now() / 1000);


    var audio_tempFileName = genRandomNum + '.ogg';  //the name to be given to the audio file as .ogg
    var text_tempFileName = genRandomNum + '-transcript.txt';


    var bufferFileName = __dirname + '/' + audio_tempFileName; //the ogg file
    var transcriptFileName = __dirname + '/' + text_tempFileName; //the text file


    //first create a local audio file and then upload it
    fs.writeFileSync(audio_tempFileName, base_audioBuffer);
    console.log('Created Local File ');


    fs.writeFileSync(transcriptFileName, transcription);
    console.log('Created Transcript Local File ');

    await upload2FS(catalystApp, filestore, bufferFileName, transcriptFileName);


}

async function upload2FS(catalystApp, filestore, bufferFileName, transcriptFileName) {
    console.log(' in upload2FS ');
    filestore
        .folder('343000000055390')
        .uploadFile({
            code: fs.createReadStream(bufferFileName),
            name: "recorded-audio"
        }).then((uploadedFile) => {
            console.log('File ID is  ' + uploadedFile.id);

            filestore
                .folder('343000000055390')
                .uploadFile({
                    code: fs.createReadStream(transcriptFileName),
                    name: "recorded-transcript-txt"
                }).then((transcript_File) => {
                    console.log('Transcript File ID is  ' + transcript_File.id);
                    updateDataStore(catalystApp, uploadedFile.id, transcript_File.id);
                }).catch(err => {
                    console.log('Error in uploading transcript file to FileStore ');
                });
        }).catch(err => {
            console.log('Error in uploading to FileStore ');
        });
}




async function testGoogleTextToSpeech(audioBuffer) {

    const speech = require('@google-cloud/speech');
    keyFilename_Is = __dirname + '/Text2Speech-ShankarR-Zoho-f17abf145e29.json';
    // Create the auth config
    const config_details = {
        projectId: 'projectid',
        keyFilename: keyFilename_Is
    };

    const client = new speech.SpeechClient(config_details);

    const audio = {
        content: audioBuffer.toString('base64'),
    };
    const config = {
        languageCode: 'en-US',
    };
    const request = {
        audio: audio,
        config: config,
    };


    const [response] = await client.recognize(request);
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    return transcription;
}


function updateDataStore(catalystApp, sourceid, transcriptid) {
    console.log('in updateDataStore .....  ' + sourceid + '   ' + transcriptid);
    // get the details of the current user as a promise
    let userManagement = catalystApp.userManagement();
    let userPromise = userManagement.getCurrentUser();

    userPromise.then(currentUser => {
        console.log('Current user Details are ' + JSON.stringify(currentUser));
        this.userEmail = currentUser.email_id;
        // console.log('Email is dd  >>>  ' + this.userEmail);

        let datastore = catalystApp.datastore();
        let table = datastore.table("TranscriptIdTable");
        let rowData = {
            sourceid: sourceid,
            transcriptid: transcriptid
        };

        let insertPromise = table.insertRow(rowData);
        insertPromise.then(row => {
            console.log('inserted in db now ' + JSON.stringify(row));
        }).catch(err => {
            console.log("Error in db insertion " + err);
        });

        var idtolist = sourceid + "," + transcriptid;
        console.log('-----  IDs to List are  ' + idtolist + ' userEmail is   ' + this.userEmail);


        catalystApp.pushNotification().web()
            .sendNotification(idtolist, [this.userEmail]).then((result) => {
                console.log('Push Notifications sent ' + result);
            })
            .catch((err) => {
                console.log("Error pushing notification to client ....  " + err);
            });

    });

}







app.post('/upload_sound', upload.any(), async (req, res) => {
    console.log('in upload sound now ======= ');

    console.log(req.files, 'files');
    let transcription = await testGoogleTextToSpeech(req.files[0].buffer);

    console.log("Text transcription: " + transcription);
    var final_transcription = transcription;
    //   processForUploadToFileStore(req, req.files[0].buffer.toString('base64'), final_transcription);
    await processForUploadToFileStore(req, req.files[0].buffer, final_transcription);
    res.status(200).send(final_transcription);
});



module.exports = app;
