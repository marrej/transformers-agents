import { pipeline } from "@huggingface/transformers";

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
    static task = 'text-classification';
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance = null;

    static async getInstance(progress_callback = null) {
        this.instance ??= pipeline(this.task, this.model, { progress_callback });
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Retrieve the classification pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    const classifier = await PipelineSingleton.getInstance((x: any) => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });
    if (!classifier) {return;}

    // Actually perform the classification
    const output = await classifier(event.data.text);

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: output,
    });
});