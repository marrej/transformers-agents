import { pipeline } from "@huggingface/transformers";

// Supported tasks https://huggingface.co/docs/transformers.js/en/index#natural-language-processing
// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
    // Classifier
    // static task = 'text-classification';
    // static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

    static task = 'text-generation';
    // text-generation https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js
    static model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct';
    static instance = null;

    // NOTE: Requires a `model_quantized.onnx` file to be present otherwie it won't run
    static async getInstance(progress_callback = null) {
        // https://github.com/huggingface/transformers.js/blob/main/src/pipelines.js#L3400
        this.instance ??= pipeline(this.task, this.model, { progress_callback, model_file_name: 'model' });
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Retrieve the classification pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    const generation = await PipelineSingleton.getInstance((x: any) => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });
    if (!generation) {return;}

    // Actually perform the generation
    const output = await generation(event.data.text);

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: output,
    });
});