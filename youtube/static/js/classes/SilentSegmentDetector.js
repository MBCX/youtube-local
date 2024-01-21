export class SilentSegmentsDetector {
    #threshold;
    #segmentDuration;
    #video;
    #audioContext;
    #sourceNode;
    #processorNode;
    #silenceStart = null;
    onSilence = () => {};
    onEnd = () => {};
    onError = () => {};

    get video() {
        return this.#video
    }

    constructor(video, threshold = 0.001, segmentDuration = 0.1) {
        this.#video = video;
        this.#threshold = threshold;
        this.#segmentDuration = segmentDuration;

        this.#audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.#sourceNode = this.#audioContext.createMediaElementSource(this.#video);
        this.#processorNode = this.#audioContext.createScriptProcessor(1024, 1, 1);

        this.#sourceNode.connect(this.#audioContext.destination);
        this.#sourceNode.connect(this.#processorNode);
        this.#processorNode.connect(this.#audioContext.destination);

        this.#setupListeners();
    }

    #setupListeners() {
        const processAudio = e => {
            let input = e.inputBuffer.getChannelData(0);
            let total = 0;
            for (let i = 0; i < input.length; i++) {
                total += Math.abs(input[i]);
            }
            let rms = Math.sqrt(total / input.length);

            if (rms < this.#threshold) {
                if (this.#silenceStart === null) {
                    this.#silenceStart = this.#video.currentTime;
                }
            } else {
                if (this.#silenceStart !== null) {
                    this.onSilence([this.#silenceStart, this.#video.currentTime]);
                    this.#silenceStart = null;
                }
            }
        }
        this.#processorNode.addEventListener("audioprocess", processAudio);

        this.#video.onended = () => {
            this.#audioContext.close();
            if (this.#silenceStart !== null) {
                this.onSilence([this.#silenceStart, this.#video.currentTime]);
                this.#silenceStart = null;
            }
            this.onEnd();
        };

        this.#video.onerror = this.#video.onabort = () => {
            this.#audioContext.close();
            this.onError(new Error(`Error processing video while trying to get silent segments.`));
        }
    }
}