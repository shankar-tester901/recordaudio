let rec = null;
let audioStream = null;

const recordButton = document.getElementById("recordButton");
const transcribeButton = document.getElementById("transcribeButton");

recordButton.addEventListener("click", startRecording);
transcribeButton.addEventListener("click", transcribeText);

function startRecording() {
    hideInfo();
    let constraints = { audio: true, video: false }

    recordButton.disabled = true;
    transcribeButton.disabled = false;

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        const audioContext = new window.AudioContext();
        audioStream = stream;
        const input = audioContext.createMediaStreamSource(stream);
        rec = new Recorder(input, { numChannels: 1 })
        rec.record()
    }).catch(function (err) {
        recordButton.disabled = false;
        transcribeButton.disabled = true;
    });
}

function transcribeText() {

    $("#spinner_div").show();
    transcribeButton.disabled = true;
    recordButton.disabled = false;
    rec.stop();

    audioStream.getAudioTracks()[0].stop();
    rec.exportWAV(uploadSoundData);
}

function uploadSoundData(blob) {
    let filename = new Date().toISOString();


    let formData = new FormData();
    formData.append("audio_data", blob, filename);
    $.ajax({
        type: "POST",
        enctype: 'multipart/form-data',
        url: "/server/record_audio/upload_sound",
        data: formData,
        processData: false,
        contentType: false,
        cache: false,
        timeout: 60000,
        success: function (data) {
            //   alert(data);
            showInfo();
            $("#output").text(data);
        },
        error: function (e) {
            $("#uploadStatus").text("Failure in File Upload");
            $("#btnSubmit").prop("disabled", false);
        }
    });

}

function hideInfo() {
    $("#Transcript_File").hide();
    $("#Audio_File").hide();
    $("#transcript_div").hide();
    $("#download_transcript_div").hide();
    $("#download_audio_div").hide();
    $("#spinner_div").hide();

}

function showInfo() {
    $("#spinner_div").hide();
    $("#Transcript_File").show();
    $("#Audio_File").show();
    $("#transcript_div").show();
    $("#download_transcript_div").show();
    $("#download_audio_div").show();
}